import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useLive } from '../state/LiveContext';
import type { Client, Paginated } from '../lib/types';
import { PageHeader, TableShell, Pagination, Spinner, EmptyState, KycChip, LoadBadge } from '../components/ui';
import { fmtDate } from '../lib/format';

export function ClientsView({ mine }: { mine: boolean }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { revision } = useLive();
  const path = `${mine ? '/api/my-clients' : '/api/clients'}?page=${page}&pageSize=${pageSize}`;
  const { data, loading, error, ms } = useApi<Paginated<Client>>(path, [path, revision.clients]);

  return (
    <div>
      <PageHeader
        title={mine ? 'My Clients' : 'Clients'}
        subtitle={mine ? 'Clients mapped to you' : 'All clients with key details'}
        right={<LoadBadge ms={ms} />}
      />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <TableShell>
        <thead className="bg-butter-100/60">
          <tr>
            <th className="th">Client</th>
            <th className="th">PAN</th>
            <th className="th">City</th>
            <th className="th">Segment</th>
            <th className="th">KYC</th>
            {!mine && <th className="th">Relationship Manager</th>}
            <th className="th">Opened</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-forest-100/70">
          {data?.data.map((c) => (
            <tr key={c.id} className="hover:bg-butter-50">
              <td className="td">
                <div className="font-semibold text-forest-800">{c.name}</div>
                <div className="text-xs text-forest-300">{c.id}</div>
              </td>
              <td className="td font-mono text-xs">{c.pan}</td>
              <td className="td">{c.city}</td>
              <td className="td">
                <span className="chip bg-forest-50 text-forest-700">{c.segment}</span>
              </td>
              <td className="td">
                <KycChip status={c.kycStatus} />
              </td>
              {!mine && <td className="td">{c.rm?.name ?? <span className="text-forest-300">—</span>}</td>}
              <td className="td">{fmtDate(c.openedAt)}</td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      {loading && !data && <Spinner />}
      {data && data.total === 0 && <EmptyState title="No clients yet" hint="Data appears here as the sync worker ingests it." />}
      {data && data.total > 0 && (
        <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} />
      )}
    </div>
  );
}
