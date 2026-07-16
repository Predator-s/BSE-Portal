import { useApi } from '../hooks/useApi';
import { useLive } from '../state/LiveContext';
import type { Employee } from '../lib/types';
import { PageHeader, TableShell, Spinner, EmptyState, LoadBadge } from '../components/ui';

export function EmployeesView() {
  const { revision } = useLive();
  const { data, loading, error, ms } = useApi<{ data: Employee[]; total: number }>(
    '/api/employees',
    [revision.employees],
  );

  return (
    <div>
      <PageHeader title="Employees" subtitle="All employees on the platform" right={<LoadBadge ms={ms} />} />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <TableShell>
        <thead className="bg-butter-100/60">
          <tr>
            <th className="th">Employee</th>
            <th className="th">Title</th>
            <th className="th">Department</th>
            <th className="th">Email</th>
            <th className="th text-right">Mapped clients</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-forest-100/70">
          {data?.data.map((e) => (
            <tr key={e.id} className="hover:bg-butter-50">
              <td className="td">
                <div className="font-semibold text-forest-800">{e.name}</div>
                <div className="text-xs text-forest-300">{e.id}</div>
              </td>
              <td className="td">{e.title}</td>
              <td className="td">
                <span className="chip bg-forest-50 text-forest-700">{e.department}</span>
              </td>
              <td className="td text-forest-300">{e.email}</td>
              <td className="td text-right font-semibold">{e.mappedClients}</td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      {loading && !data && <Spinner />}
      {data && data.total === 0 && <EmptyState title="No employees yet" hint="Synced from the internal app." />}
    </div>
  );
}
