import { Router, type Response } from 'express';
import { prisma } from '../prisma.js';
import { requireFeature, type AuthedRequest } from '../auth.js';
import { computeIncentives, INCENTIVE_RATE } from '../incentives.js';

export const dataRoutes = Router();

type ScopedReq = AuthedRequest & { scope?: 'ALL' | 'OWN' | 'MAPPED' };

function pagination(req: AuthedRequest) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize) || 50));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

const clientInclude = { rm: { select: { id: true, name: true, title: true } } } as const;

// ── Clients (feature: clients, scope ALL) ────────────────────────────────────
dataRoutes.get('/clients', requireFeature('clients'), async (req: ScopedReq, res: Response) => {
  const { page, pageSize, skip, take } = pagination(req);
  const [data, total] = await Promise.all([
    prisma.client.findMany({ skip, take, orderBy: { id: 'asc' }, include: clientInclude }),
    prisma.client.count(),
  ]);
  res.json({ data, total, page, pageSize });
});

// ── My Clients (feature: my_clients, scope MAPPED) ───────────────────────────
dataRoutes.get('/my-clients', requireFeature('my_clients'), async (req: ScopedReq, res: Response) => {
  const { page, pageSize, skip, take } = pagination(req);
  const where = { rmId: req.access?.employeeId ?? '__none__' };
  const [data, total] = await Promise.all([
    prisma.client.findMany({ where, skip, take, orderBy: { id: 'asc' }, include: clientInclude }),
    prisma.client.count({ where }),
  ]);
  res.json({ data, total, page, pageSize });
});

// ── Trades (feature: trades; ALL for mgmt, MAPPED for an RM) ──────────────────
// Filterable by client and date range, per the brief.
dataRoutes.get('/trades', requireFeature('trades'), async (req: ScopedReq, res: Response) => {
  const { page, pageSize, skip, take } = pagination(req);
  const where: Record<string, unknown> = {};

  if (req.scope === 'MAPPED') {
    where.client = { rmId: req.access?.employeeId ?? '__none__' };
  }
  if (typeof req.query.clientId === 'string' && req.query.clientId) {
    where.clientId = req.query.clientId;
  }
  const from = typeof req.query.from === 'string' ? Date.parse(req.query.from) : NaN;
  const to = typeof req.query.to === 'string' ? Date.parse(req.query.to) : NaN;
  if (Number.isFinite(from) || Number.isFinite(to)) {
    where.tradedAt = {
      ...(Number.isFinite(from) ? { gte: new Date(from) } : {}),
      ...(Number.isFinite(to) ? { lte: new Date(to) } : {}),
    };
  }

  const [data, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      skip,
      take,
      orderBy: { tradedAt: 'desc' },
      include: { client: { select: { id: true, name: true, rmId: true } } },
    }),
    prisma.trade.count({ where }),
  ]);
  res.json({ data, total, page, pageSize });
});

// ── Employees (feature: employees, scope ALL) ────────────────────────────────
dataRoutes.get('/employees', requireFeature('employees'), async (_req: ScopedReq, res: Response) => {
  const employees = await prisma.employee.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { clients: true } } },
  });
  res.json({
    data: employees.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      title: e.title,
      department: e.department,
      mappedClients: e._count.clients,
    })),
    total: employees.length,
  });
});

// ── Incentives (feature: incentives; OWN for employee, ALL for management) ────
dataRoutes.get('/incentives', requireFeature('incentives'), async (req: ScopedReq, res: Response) => {
  const rows =
    req.scope === 'OWN'
      ? await computeIncentives(req.access?.employeeId ?? '__none__')
      : await computeIncentives();
  res.json({ data: rows, rate: INCENTIVE_RATE, scope: req.scope });
});
