import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useLive } from '../state/LiveContext';
import type { Trade, Paginated } from '../lib/types';
import { PageHeader, TableShell, Pagination, Spinner, EmptyState, SideChip, LoadBadge } from '../components/ui';
import { fmtDateTime, fmtInr, fmtInr2, fmtNum } from '../lib/format';

export function TradesView() {
  const [page, setPage] = useState(1);
  const [clientId, setClientId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const pageSize = 10;
  const { revision } = useLive();

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (clientId.trim()) params.set('clientId', clientId.trim());
  if (from) params.set('from', new Date(from).toISOString());
  if (to) params.set('to', new Date(to + 'T23:59:59').toISOString());
  const path = `/api/trades?${params.toString()}`;
  const { data, loading, error, ms } = useApi<Paginated<Trade>>(path, [path, revision.trades]);

  const resetPageAnd = (fn: () => void) => {
    setPage(1);
    fn();
  };

  return (
    <div>
      <PageHeader
        title="Trades"
        subtitle="Filterable by client and date range"
        right={<LoadBadge ms={ms} />}
      />

      <div className="card p-4 mb-4 grid gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs font-semibold text-forest-300">Client ID</label>
          <input
            className="input mt-1"
            placeholder="e.g. CL000123"
            value={clientId}
            onChange={(e) => resetPageAnd(() => setClientId(e.target.value))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-forest-300">From</label>
          <input type="date" className="input mt-1" value={from} onChange={(e) => resetPageAnd(() => setFrom(e.target.value))} />
        </div>
        <div>
          <label className="text-xs font-semibold text-forest-300">To</label>
          <input type="date" className="input mt-1" value={to} onChange={(e) => resetPageAnd(() => setTo(e.target.value))} />
        </div>
        <div className="flex items-end">
          <button
            className="btn-ghost w-full justify-center"
            onClick={() => resetPageAnd(() => {
              setClientId('');
              setFrom('');
              setTo('');
            })}
          >
            Clear filters
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <TableShell>
        <thead className="bg-butter-100/60">
          <tr>
            <th className="th">Trade</th>
            <th className="th">Client</th>
            <th className="th">Symbol</th>
            <th className="th">Side</th>
            <th className="th text-right">Qty</th>
            <th className="th text-right">Price</th>
            <th className="th text-right">Value</th>
            <th className="th text-right">Brokerage</th>
            <th className="th">Traded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-forest-100/70">
          {data?.data.map((t) => (
            <tr key={t.id} className="hover:bg-butter-50">
              <td className="td text-xs text-forest-300">{t.id}</td>
              <td className="td">
                <div className="font-semibold text-forest-800">{t.client?.name ?? t.clientId}</div>
                <div className="text-xs text-forest-300">{t.clientId}</div>
              </td>
              <td className="td font-semibold">{t.symbol}</td>
              <td className="td">
                <SideChip side={t.side} />
              </td>
              <td className="td text-right">{fmtNum(t.quantity)}</td>
              <td className="td text-right">{fmtInr2(t.price)}</td>
              <td className="td text-right">{fmtInr(t.tradeValue)}</td>
              <td className="td text-right font-semibold text-forest-700">{fmtInr2(t.brokerage)}</td>
              <td className="td">{fmtDateTime(t.tradedAt)}</td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      {loading && !data && <Spinner />}
      {data && data.total === 0 && <EmptyState title="No trades match" hint="Adjust the filters above." />}
      {data && data.total > 0 && (
        <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} />
      )}
    </div>
  );
}
