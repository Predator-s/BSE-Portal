import { useApi } from '../hooks/useApi';
import { useLive } from '../state/LiveContext';
import type { SyncStatus } from '../lib/types';
import { timeAgo } from '../lib/format';

/**
 * Data-freshness widget. Reflects the WebSocket connection, the sync worker's
 * live progress, and the last time fresh rows landed — all without the user
 * ever refreshing the page.
 */
export function SyncIndicator() {
  const { connected, revision, syncStatus, lastEventAt } = useLive();
  // Re-pull counts whenever the worker commits clients/trades (driven by WS).
  const { data } = useApi<SyncStatus>('/api/sync/status', [revision.clients, revision.trades, revision.employees]);

  const running = Object.entries(syncStatus).find(([, s]) => s.status === 'running');
  const counts = data?.counts;

  return (
    <div className="flex items-center gap-3">
      {counts && (
        <div className="hidden sm:flex items-center gap-3 text-xs text-forest-300">
          <span>
            <b className="text-forest-700">{counts.clients.toLocaleString('en-IN')}</b> clients
          </span>
          <span>
            <b className="text-forest-700">{counts.trades.toLocaleString('en-IN')}</b> trades
          </span>
        </div>
      )}

      {running && (
        <span className="chip bg-butter-200 text-forest-800">
          <span className="h-2 w-2 rounded-full bg-forest-600 animate-pulse" />
          syncing {running[0]} {running[1].processed}
          {running[1].total ? `/${running[1].total}` : ''}
        </span>
      )}

      <span
        className={`chip ${connected ? 'bg-forest-50 text-forest-700' : 'bg-gray-100 text-gray-500'}`}
        title={lastEventAt ? `Last update ${timeAgo(lastEventAt)}` : 'Live connection'}
      >
        <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
        {connected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
