import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getToken } from '../lib/api';

type Resource = 'clients' | 'trades' | 'employees' | 'mappings';

interface LiveState {
  connected: boolean;
  // Bumps each time fresh rows for a resource are committed by the sync worker.
  revision: Record<Resource, number>;
  // Latest per-resource sync progress, for the freshness indicator.
  syncStatus: Record<string, { status: string; processed: number; total: number | null; pages: number }>;
  lastEventAt: string | null;
}

const LiveContext = createContext<LiveState | undefined>(undefined);

export function LiveProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [connected, setConnected] = useState(false);
  const [revision, setRevision] = useState<Record<Resource, number>>({
    clients: 0,
    trades: 0,
    employees: 0,
    mappings: 0,
  });
  const [syncStatus, setSyncStatus] = useState<LiveState['syncStatus']>({});
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const token = getToken();
    if (!token) return;

    // Connect straight to the server's WS. In dev we bypass Vite's proxy on
    // purpose — proxying the socket makes Vite log noisy `write EPIPE` errors
    // whenever a browser socket closes (StrictMode remounts, HMR, reloads).
    const wsBase =
      (import.meta.env.VITE_WS_URL as string | undefined) ||
      (import.meta.env.DEV
        ? 'ws://localhost:4002'
        : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);

    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    let attempt = 0;

    const connect = () => {
      ws = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);

      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
      };
      ws.onerror = () => {
        // Let onclose drive the reconnect; just make sure the socket tears down.
        try {
          ws?.close();
        } catch {
          /* noop */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          const backoff = Math.min(1000 * 2 ** attempt, 15_000); // capped exponential backoff
          attempt += 1;
          retry = setTimeout(connect, backoff);
        }
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'data') {
            setLastEventAt(msg.at);
            setRevision((r) => ({ ...r, [msg.resource as Resource]: (r[msg.resource as Resource] ?? 0) + 1 }));
          } else if (msg.type === 'sync-status') {
            setSyncStatus((s) => ({
              ...s,
              [msg.resource]: { status: msg.status, processed: msg.processed, total: msg.total, pages: msg.pages },
            }));
          }
        } catch {
          /* ignore malformed frames */
        }
      };
    };
    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, [enabled]);

  return (
    <LiveContext.Provider value={{ connected, revision, syncStatus, lastEventAt }}>
      {children}
    </LiveContext.Provider>
  );
}

export function useLive(): LiveState {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used within LiveProvider');
  return ctx;
}
