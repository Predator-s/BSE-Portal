import { Router, type Response } from 'express';
import type { Scope } from '@prisma/client';
import { prisma } from '../prisma.js';
import { requireFeature, type AuthedRequest } from '../auth.js';

export const rbacRoutes = Router();

const SCOPES: Scope[] = ['ALL', 'OWN', 'MAPPED'];

/**
 * The full Org × Role × Feature matrix. This is what makes the RBAC "dynamic":
 * the UI renders whatever this returns, and edits below write straight back to it.
 */
rbacRoutes.get('/', requireFeature('access_control'), async (_req: AuthedRequest, res: Response) => {
  const [features, orgs] = await Promise.all([
    prisma.feature.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.organization.findMany({
      orderBy: { slug: 'asc' },
      include: {
        roles: {
          orderBy: { key: 'asc' },
          include: { roleFeatures: { include: { feature: true } } },
        },
      },
    }),
  ]);

  res.json({
    scopes: SCOPES,
    features: features.map((f) => ({
      id: f.id,
      key: f.key,
      name: f.name,
      description: f.description,
    })),
    orgs: orgs.map((o) => ({
      id: o.id,
      slug: o.slug,
      name: o.name,
      roles: o.roles.map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        grants: Object.fromEntries(r.roleFeatures.map((rf) => [rf.feature.key, rf.scope])),
      })),
    })),
  });
});

/**
 * Grant / re-scope / revoke a (role, feature) cell. scope=null revokes.
 * Effect is immediate: the next request any affected user makes is re-evaluated
 * against the updated matrix.
 */
rbacRoutes.put('/grant', requireFeature('access_control'), async (req: AuthedRequest, res: Response) => {
  const { roleId, featureKey, scope } = req.body ?? {};
  if (!roleId || !featureKey) {
    return res.status(400).json({ error: 'roleId and featureKey required' });
  }
  if (scope !== null && !SCOPES.includes(scope)) {
    return res.status(400).json({ error: `scope must be one of ${SCOPES.join(', ')} or null` });
  }

  const feature = await prisma.feature.findUnique({ where: { key: featureKey } });
  if (!feature) return res.status(404).json({ error: 'unknown feature' });

  if (scope === null) {
    await prisma.roleFeature
      .delete({ where: { roleId_featureId: { roleId, featureId: feature.id } } })
      .catch(() => undefined); // already absent is fine
    return res.json({ ok: true, roleId, featureKey, scope: null });
  }

  const grant = await prisma.roleFeature.upsert({
    where: { roleId_featureId: { roleId, featureId: feature.id } },
    create: { roleId, featureId: feature.id, scope },
    update: { scope },
  });
  res.json({ ok: true, roleId, featureKey, scope: grant.scope });
});
