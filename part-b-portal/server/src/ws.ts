import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { bus, type DataEvent, type SyncStatusEvent } from './events.js';
import { verifyToken } from './auth.js';

/**
 * WebSocket fan-out. Browsers connect with ?token=<jwt>; every `data` /
 * `sync-status` event from the sync worker is pushed to all clients so open
 * screens live-update without a manual refresh.
 */
export function attachWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket: WebSocket, req) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token') ?? '';
    if (!verifyToken(token)) {
      socket.close(4401, 'unauthorized');
      return;
    }
    socket.send(JSON.stringify({ type: 'hello', at: new Date().toISOString() }));
  });

  const send = (payload: unknown) => {
    const msg = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
  };

  bus.on('data', (e: DataEvent) => send({ type: 'data', ...e }));
  bus.on('sync-status', (e: SyncStatusEvent) => send(e));

  console.log('🔌 WebSocket endpoint at /ws');
}
