import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { getAccessForUser, scopeFor, type Access } from './rbac.js';

export interface AuthedRequest extends Request {
  access?: Access;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: '12h' });
}

export function verifyToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as { sub?: string };
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

/** Populates req.access from a Bearer token; 401 if missing/invalid. */
export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token ? verifyToken(token) : null;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  const access = await getAccessForUser(userId);
  if (!access) return res.status(401).json({ error: 'unauthorized' });

  req.access = access;
  next();
}

/** Guards a route by feature key and exposes the granted scope on req. */
export function requireFeature(featureKey: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const access = req.access;
    if (!access) return res.status(401).json({ error: 'unauthorized' });
    const scope = scopeFor(access, featureKey);
    if (!scope) {
      return res.status(403).json({ error: 'forbidden', feature: featureKey });
    }
    (req as AuthedRequest & { scope?: string }).scope = scope;
    next();
  };
}
