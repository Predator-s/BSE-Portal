import { PrismaClient, type Scope } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Features = the portal's screens/capabilities (data-driven, not hardcoded) ─
const FEATURES = [
  { key: 'clients', name: 'Clients', description: 'All clients with key details', sortOrder: 1 },
  { key: 'trades', name: 'Trades', description: 'Trades, filterable by client and date', sortOrder: 2 },
  { key: 'my_clients', name: 'My Clients', description: 'Clients mapped to the signed-in RM', sortOrder: 3 },
  { key: 'employees', name: 'Employees', description: 'All employees on the platform', sortOrder: 4 },
  { key: 'incentives', name: 'Incentives', description: 'Brokerage-based RM incentives', sortOrder: 5 },
  { key: 'access_control', name: 'Access Control', description: 'Manage the RBAC matrix', sortOrder: 6 },
];

// ── Two orgs with DIFFERENT matrices — proof the RBAC is dynamic, not baked in.
type RoleSeed = { key: string; name: string; grants: Record<string, Scope> };
type OrgSeed = { slug: string; name: string; roles: RoleSeed[] };

const ORGS: OrgSeed[] = [
  {
    slug: 'arham',
    name: 'Arham Fintech',
    roles: [
      {
        key: 'admin',
        name: 'Administrator',
        grants: {
          clients: 'ALL', trades: 'ALL', my_clients: 'MAPPED',
          employees: 'ALL', incentives: 'ALL', access_control: 'ALL',
        },
      },
      {
        key: 'manager',
        name: 'Management',
        grants: { clients: 'ALL', trades: 'ALL', employees: 'ALL', incentives: 'ALL' },
      },
      {
        key: 'rm',
        name: 'Relationship Manager',
        grants: { my_clients: 'MAPPED', trades: 'MAPPED', incentives: 'OWN' },
      },
    ],
  },
  {
    slug: 'zenith',
    name: 'Zenith Securities',
    roles: [
      {
        key: 'admin',
        name: 'Administrator',
        grants: {
          clients: 'ALL', trades: 'ALL', my_clients: 'MAPPED',
          employees: 'ALL', incentives: 'ALL', access_control: 'ALL',
        },
      },
      {
        // Read-only oversight, no incentives visibility.
        key: 'compliance',
        name: 'Compliance Officer',
        grants: { clients: 'ALL', trades: 'ALL', employees: 'ALL' },
      },
      {
        // NOTE: unlike Arham's RM, Zenith's RM has NO standalone Trades screen —
        // demonstrating that the same role key can differ per org.
        key: 'rm',
        name: 'Relationship Manager',
        grants: { my_clients: 'MAPPED', incentives: 'OWN' },
      },
    ],
  },
];

// ── Demo users. All share the password "password". employeeId links to synced
//    Employee ids (EMP01…) for OWN/MAPPED scoping. EMP01–EMP15 are RMs; EMP20 is mgmt.
const USERS = [
  { email: 'admin@arham.test', name: 'Aditi Admin', org: 'arham', role: 'admin', employeeId: null },
  { email: 'manager@arham.test', name: 'Manish Manager', org: 'arham', role: 'manager', employeeId: 'EMP20' },
  { email: 'rm1@arham.test', name: 'Riya RM · maps EMP01', org: 'arham', role: 'rm', employeeId: 'EMP01' },
  { email: 'rm2@arham.test', name: 'Rohan RM · maps EMP02', org: 'arham', role: 'rm', employeeId: 'EMP02' },
  { email: 'admin@zenith.test', name: 'Zoya Admin', org: 'zenith', role: 'admin', employeeId: null },
  { email: 'compliance@zenith.test', name: 'Chetan Compliance', org: 'zenith', role: 'compliance', employeeId: null },
  { email: 'rm@zenith.test', name: 'Zaid RM · maps EMP03', org: 'zenith', role: 'rm', employeeId: 'EMP03' },
];

async function main() {
  // Features
  const featureByKey = new Map<string, string>();
  for (const f of FEATURES) {
    const rec = await prisma.feature.upsert({
      where: { key: f.key },
      create: f,
      update: { name: f.name, description: f.description, sortOrder: f.sortOrder },
    });
    featureByKey.set(f.key, rec.id);
  }

  // Orgs → roles → role_features
  const roleByOrgKey = new Map<string, string>(); // `${slug}:${roleKey}` -> roleId
  for (const org of ORGS) {
    const orgRec = await prisma.organization.upsert({
      where: { slug: org.slug },
      create: { slug: org.slug, name: org.name },
      update: { name: org.name },
    });

    for (const role of org.roles) {
      const roleRec = await prisma.role.upsert({
        where: { orgId_key: { orgId: orgRec.id, key: role.key } },
        create: { orgId: orgRec.id, key: role.key, name: role.name },
        update: { name: role.name },
      });
      roleByOrgKey.set(`${org.slug}:${role.key}`, roleRec.id);

      // Reset this role's grants to exactly match the seed (idempotent).
      await prisma.roleFeature.deleteMany({ where: { roleId: roleRec.id } });
      for (const [featureKey, scope] of Object.entries(role.grants)) {
        const featureId = featureByKey.get(featureKey);
        if (!featureId) continue;
        await prisma.roleFeature.create({ data: { roleId: roleRec.id, featureId, scope } });
      }
    }
  }

  // Users
  const passwordHash = bcrypt.hashSync('password', 10);
  for (const u of USERS) {
    const orgRec = await prisma.organization.findUniqueOrThrow({ where: { slug: u.org } });
    const roleId = roleByOrgKey.get(`${u.org}:${u.role}`)!;
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        orgId: orgRec.id,
        roleId,
        employeeId: u.employeeId,
        password: passwordHash,
      },
      update: {
        name: u.name,
        orgId: orgRec.id,
        roleId,
        employeeId: u.employeeId,
        password: passwordHash,
      },
    });
  }

  // Ensure sync bookkeeping rows exist.
  for (const id of ['internal', 'clients', 'trades']) {
    await prisma.syncState.upsert({ where: { id }, create: { id }, update: {} });
  }

  console.log('✅ Seed complete:');
  console.log(`   features: ${FEATURES.length}`);
  console.log(`   orgs: ${ORGS.length} (${ORGS.map((o) => o.slug).join(', ')})`);
  console.log(`   users: ${USERS.length} (password for all: "password")`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
