import { prisma } from './prisma.js';

/**
 * A Relationship Manager earns a percentage of the brokerage generated on the
 * trades of the clients mapped to them. Kept as a single, visible rate so the
 * formula is obvious in the UI:  incentive = Σ(brokerage on mapped clients) × rate
 */
export const INCENTIVE_RATE = Number(process.env.INCENTIVE_RATE ?? 0.15); // 15% of brokerage

export interface IncentiveRow {
  employeeId: string;
  employeeName: string;
  title: string;
  mappedClients: number;
  tradeCount: number;
  totalBrokerage: number;
  incentiveRate: number;
  incentive: number;
}

/**
 * Compute incentives per RM by aggregating brokerage over each RM's mapped
 * clients' trades. A single SQL GROUP BY keeps this fast regardless of volume.
 * @param employeeId when set (OWN scope), restrict to just that RM.
 */
export async function computeIncentives(employeeId?: string): Promise<IncentiveRow[]> {
  const brokerageAgg = await prisma.$queryRaw<
    { rmId: string; tradeCount: bigint; totalBrokerage: number }[]
  >`
    SELECT c."rmId" AS "rmId",
           COUNT(t.id) AS "tradeCount",
           COALESCE(SUM(t.brokerage), 0) AS "totalBrokerage"
    FROM "Client" c
    JOIN "Trade" t ON t."clientId" = c.id
    WHERE c."rmId" IS NOT NULL
    GROUP BY c."rmId"
  `;

  const clientAgg = await prisma.$queryRaw<{ rmId: string; clients: bigint }[]>`
    SELECT "rmId" AS "rmId", COUNT(*) AS "clients"
    FROM "Client"
    WHERE "rmId" IS NOT NULL
    GROUP BY "rmId"
  `;

  const brokerageByRm = new Map(brokerageAgg.map((r) => [r.rmId, r]));
  const clientsByRm = new Map(clientAgg.map((r) => [r.rmId, Number(r.clients)]));

  // Base the list on employees who actually carry a client book.
  const rmIds = new Set<string>([...clientsByRm.keys()]);
  const employees = await prisma.employee.findMany({
    where: { id: { in: [...rmIds] } },
  });

  let rows: IncentiveRow[] = employees.map((e) => {
    const b = brokerageByRm.get(e.id);
    const totalBrokerage = b ? Number(b.totalBrokerage) : 0;
    return {
      employeeId: e.id,
      employeeName: e.name,
      title: e.title,
      mappedClients: clientsByRm.get(e.id) ?? 0,
      tradeCount: b ? Number(b.tradeCount) : 0,
      totalBrokerage: Number(totalBrokerage.toFixed(2)),
      incentiveRate: INCENTIVE_RATE,
      incentive: Number((totalBrokerage * INCENTIVE_RATE).toFixed(2)),
    };
  });

  if (employeeId) rows = rows.filter((r) => r.employeeId === employeeId);
  rows.sort((a, b) => b.incentive - a.incentive);
  return rows;
}
