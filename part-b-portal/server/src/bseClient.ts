import { env } from './env.js';

export interface Page<T> {
  data: T[];
  nextCursor: number | null;
  total: number;
}

export interface BseClient {
  id: string;
  name: string;
  pan: string;
  email: string;
  city: string;
  segment: string;
  kycStatus: string;
  createdAt: string;
}

export interface BseTrade {
  id: string;
  clientId: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  tradeValue: number;
  brokerage: number;
  exchange: string;
  tradedAt: string;
}

export interface InternalEmployee {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
}

export interface InternalMapping {
  employeeId: string;
  clientId: string;
}

/**
 * Fetch one page with a hard timeout. ANY of these becomes a thrown error that
 * the caller treats as a retryable failed chunk:
 *   - request exceeds bseHttpTimeoutMs (the exchange's 30s network kill)
 *   - non-2xx status
 *   - socket reset mid-body (the mock's "mid-pull failure") → fetch/json throws
 *   - truncated JSON that fails to parse
 * Crucially, a failed page NEVER returns partial data — callers only ever see a
 * fully-parsed page or an exception.
 */
async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.bseHttpTimeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    // If the socket was reset mid-body, .text()/.json() rejects or yields
    // unparseable JSON — either way we throw, never commit half a page.
    const text = await res.text();
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

const base = env.mockBaseUrl.replace(/\/$/, '');

export async function pullClients(cursor: number, limit: number): Promise<Page<BseClient>> {
  return fetchJson<Page<BseClient>>(`${base}/bse/clients?cursor=${cursor}&limit=${limit}`);
}

export async function pullTrades(
  cursor: number,
  limit: number,
  opts: { from?: string; clientId?: string } = {},
): Promise<Page<BseTrade>> {
  const q = new URLSearchParams({ cursor: String(cursor), limit: String(limit) });
  if (opts.from) q.set('from', opts.from);
  if (opts.clientId) q.set('clientId', opts.clientId);
  return fetchJson<Page<BseTrade>>(`${base}/bse/trades?${q.toString()}`);
}

export async function pullEmployees(): Promise<{ data: InternalEmployee[]; total: number }> {
  return fetchJson(`${base}/internal/employees`);
}

export async function pullMappings(): Promise<{ data: InternalMapping[]; total: number }> {
  return fetchJson(`${base}/internal/mappings`);
}
