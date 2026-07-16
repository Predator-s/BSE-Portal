import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { signToken, authMiddleware, type AuthedRequest } from '../auth.js';
import { getAccessForUser } from '../rbac.js';

export const authRoutes = Router();

// Demo-user picker for the login screen (no secrets returned).
authRoutes.get('/demo-users', async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { org: true, role: true },
    orderBy: [{ org: { slug: 'asc' } }, { role: { key: 'asc' } }],
  });
  res.json({
    note: 'All demo accounts use the password: password',
    data: users.map((u) => ({
      email: u.email,
      name: u.name,
      org: u.org.name,
      role: u.role.name,
      employeeId: u.employeeId,
    })),
  });
});

authRoutes.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = await prisma.user.findUnique({ where: { email: String(email) } });
  if (!user || !(await bcrypt.compare(String(password), user.password))) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const token = signToken(user.id);
  const access = await getAccessForUser(user.id);
  res.json({ token, access });
});

authRoutes.get('/me', authMiddleware, async (req: AuthedRequest, res) => {
  res.json({ access: req.access });
});
