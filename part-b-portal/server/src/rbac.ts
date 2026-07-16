import type { Scope } from '@prisma/client';
import { prisma } from './prisma.js';

/**
 * Resolved access for a user: which features they can see and at what scope.
 * Everything here is read from the DB (Org → Role → RoleFeature), so changing
 * the matrix at runtime immediately changes what a user can do — nothing about
 * the permission set is hardcoded.
 */
export interface FeatureGrant {
  key: string;
  name: string;
  scope: Scope;
}

export interface Access {
  userId: string;
  name: string;
  email: string;
  org: { id: string; slug: string; name: string };
  role: { id: string; key: string; name: string };
  employeeId: string | null;
  features: FeatureGrant[];
}

export async function getAccessForUser(userId: string): Promise<Access | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      org: true,
      role: { include: { roleFeatures: { include: { feature: true } } } },
    },
  });
  if (!user) return null;

  const features: FeatureGrant[] = user.role.roleFeatures
    .map((rf) => ({ key: rf.feature.key, name: rf.feature.name, scope: rf.scope }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    org: { id: user.org.id, slug: user.org.slug, name: user.org.name },
    role: { id: user.role.id, key: user.role.key, name: user.role.name },
    employeeId: user.employeeId,
    features,
  };
}

export function scopeFor(access: Access, featureKey: string): Scope | null {
  return access.features.find((f) => f.key === featureKey)?.scope ?? null;
}
