import { useApi } from '../hooks/useApi';
import { useLive } from '../state/LiveContext';
import type { IncentiveRow } from '../lib/types';
import { PageHeader, TableShell, Spinner, EmptyState, LoadBadge, KpiCard } from '../components/ui';
import { fmtInr, fmtInr2, fmtNum } from '../lib/format';

export function IncentivesView() {
  const { revision } = useLive();
  const { data, loading, error, ms } = useApi<{ data: IncentiveRow[]; rate: number; scope: string }>(
    '/api/incentives',
    [revision.trades],
  );

  const rows = data?.data ?? [];
  const totalIncentive = rows.reduce((s, r) => s + r.incentive, 0);
  const totalBrokerage = rows.reduce((s, r) => s + r.totalBrokerage, 0);
  const scopeLabel = data?.scope === 'OWN' ? 'Your incentive' : 'All relationship managers';

  return (
    <div>
      <PageHeader
        title="Incentives"
        subtitle={`${scopeLabel} · ${((data?.rate ?? 0) * 100).toFixed(0)}% of brokerage on mapped clients' trades`}
        right={<LoadBadge ms={ms} />}
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <KpiCard label="Relationship managers" value={fmtNum(rows.length)} />
        <KpiCard label="Total brokerage" value={fmtInr(totalBrokerage)} hint="on mapped clients' trades" />
        <KpiCard label="Total incentive" value={fmtInr(totalIncentive)} hint={`at ${((data?.rate ?? 0) * 100).toFixed(0)}%`} />
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <TableShell>
        <thead className="bg-butter-100/60">
          <tr>
            <th className="th">Relationship Manager</th>
            <th className="th text-right">Mapped clients</th>
            <th className="th text-right">Trades</th>
            <th className="th text-right">Brokerage</th>
            <th className="th text-right">Rate</th>
            <th className="th text-right">Incentive</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-forest-100/70">
          {rows.map((r) => (
            <tr key={r.employeeId} className="hover:bg-butter-50">
              <td className="td">
                <div className="font-semibold text-forest-800">{r.employeeName}</div>
                <div className="text-xs text-forest-300">
                  {r.employeeId} · {r.title}
                </div>
              </td>
              <td className="td text-right">{fmtNum(r.mappedClients)}</td>
              <td className="td text-right">{fmtNum(r.tradeCount)}</td>
              <td className="td text-right">{fmtInr2(r.totalBrokerage)}</td>
              <td className="td text-right">{(r.incentiveRate * 100).toFixed(0)}%</td>
              <td className="td text-right font-extrabold text-forest-700">{fmtInr2(r.incentive)}</td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      {loading && !data && <Spinner />}
      {data && rows.length === 0 && (
        <EmptyState title="No incentives yet" hint="They appear once trades are ingested for mapped clients." />
      )}
    </div>
  );
}
