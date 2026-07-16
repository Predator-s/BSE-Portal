import { EventEmitter } from 'node:events';

/**
 * Server-wide event bus. The sync worker publishes a `data` event every time it
 * commits new rows; the WebSocket layer relays those to connected browsers so
 * open screens refresh themselves — satisfying the "update without a manual
 * refresh" hard requirement.
 */
export type DataEvent = {
  resource: 'clients' | 'trades' | 'employees' | 'mappings';
  action: 'upserted';
  count: number;
  // Coarse hint so clients know which screens are affected.
  at: string;
};

export type SyncStatusEvent = {
  type: 'sync-status';
  resource: string;
  status: string;
  processed: number;
  total: number | null;
  pages: number;
};

class Bus extends EventEmitter {}
export const bus = new Bus();

export function emitData(e: Omit<DataEvent, 'at'>) {
  bus.emit('data', { ...e, at: new Date().toISOString() } satisfies DataEvent);
}

export function emitSyncStatus(e: SyncStatusEvent) {
  bus.emit('sync-status', e);
}
