import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { clients, employees, mappings, trades, emitTrades, Trade } from './data.js';

const app = express();
app.use(cors());
app.use(express.json());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Per-request knobs, overridable via query string for demos/tests. */
function knobs(req: Request) {
  const delayMs = clamp(num(req.query.delayMs, config.delayMs), 0, 120_000);
  const failureRate = clamp(num(req.query.failureRate, config.failureRate), 0, 1);
  return { delayMs, failureRate };
}

/**
 * Offset-cursor pagination over a STABLE array.
 * Offset cursors are only safe because the mock's data never changes between
 * pages within a pull — which is exactly what lets Part B resume a failed pull.
 */
function paginate<T>(rows: T[], cursorRaw: unknown, limitRaw: unknown) {
  const cursor = clamp(num(cursorRaw, 0), 0, rows.length);
  const limit = clamp(num(limitRaw, config.pageSize), 1, 1000);
  const data = rows.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < rows.length ? cursor + limit : null;
  return { data, nextCursor, total: rows.length, cursor, limit };
}

/**
 * The heart of the "painful API": wait, then with probability `failureRate`
 * die PARTWAY through the response (write a little, then reset the socket).
 * A client that naively trusts a 200 and parses the body will blow up — it must
 * treat a broken/short read as a failed chunk and retry from the last cursor.
 */
async function slowUnreliable<T>(
  req: Request,
  res: Response,
  payload: { data: T[]; nextCursor: number | null; total: number; cursor: number; limit: number },
) {
  const { delayMs, failureRate } = knobs(req);
  await sleep(delayMs);

  if (Math.random() < failureRate) {
    // Mid-pull failure: send headers + a truncated body, then abort the connection.
    res.status(200).set('Content-Type', 'application/json');
    const broken = `{"data":[${payload.data.slice(0, 1).map((d) => JSON.stringify(d)).join(',')}`;
    res.write(broken);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).socket?.destroy();
    console.log(`  ✗ ${req.method} ${req.path} cursor=${payload.cursor} — mid-pull failure (socket reset)`);
    return;
  }

  res.json({
    data: payload.data,
    nextCursor: payload.nextCursor,
    total: payload.total,
    pull: { cursor: payload.cursor, limit: payload.limit, delayMs },
  });
  console.log(
    `  ✓ ${req.method} ${req.path} cursor=${payload.cursor} rows=${payload.data.length}/${payload.total} (${delayMs}ms)`,
  );
}

// ── Meta / health ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'mock-bse-api' }));

app.get('/', (_req, res) => {
  res.json({
    service: 'Mock BSE API (Part A)',
    note: 'BSE endpoints are slow + ~20% fail mid-pull. Internal endpoints are instant + reliable.',
    config: {
      delayMs: config.delayMs,
      failureRate: config.failureRate,
      pageSize: config.pageSize,
      volumes: { clients: clients.length, trades: trades.length, employees: employees.length },
    },
    endpoints: {
      bse: [
        'GET /bse/clients?cursor=&limit=',
        'GET /bse/trades?clientId=&from=&to=&cursor=&limit=',
      ],
      internal: ['GET /internal/employees', 'GET /internal/mappings'],
      knobs: 'append ?delayMs= & ?failureRate= to any BSE endpoint to override per request',
    },
  });
});

// ── BSE feed (slow + unreliable + paginated) ─────────────────────────────────
app.get('/bse/clients', async (req, res) => {
  const page = paginate(clients, req.query.cursor, req.query.limit);
  await slowUnreliable(req, res, page);
});

app.get('/bse/trades', async (req, res) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
  const from = typeof req.query.from === 'string' ? Date.parse(req.query.from) : NaN;
  const to = typeof req.query.to === 'string' ? Date.parse(req.query.to) : NaN;

  let rows: Trade[] = trades;
  if (clientId) rows = rows.filter((t) => t.clientId === clientId);
  if (Number.isFinite(from)) rows = rows.filter((t) => Date.parse(t.tradedAt) >= from);
  if (Number.isFinite(to)) rows = rows.filter((t) => Date.parse(t.tradedAt) <= to);

  const page = paginate(rows, req.query.cursor, req.query.limit);
  await slowUnreliable(req, res, page);
});

// ── Internal application (instant + reliable) ────────────────────────────────
app.get('/internal/employees', (_req, res) => {
  res.json({ data: employees, total: employees.length });
});

app.get('/internal/mappings', (_req, res) => {
  res.json({ data: mappings, total: mappings.length });
});

// ── Demo control: inject fresh trades so downstream screens update live ───────
app.post('/admin/emit-trades', (req, res) => {
  const count = clamp(num(req.query.count, config.liveTradesCount), 1, 500);
  const created = emitTrades(count);
  console.log(`  + emitted ${created.length} fresh trades (total now ${trades.length})`);
  res.json({ created: created.length, totalTrades: trades.length, sample: created.slice(0, 3) });
});

app.listen(config.port, () => {
  console.log(`\n🏦 Mock BSE API on http://localhost:${config.port}`);
  console.log(
    `   BSE feed: delay=${config.delayMs}ms/page, failureRate=${config.failureRate}, pageSize=${config.pageSize}`,
  );
  console.log(
    `   Seeded: ${clients.length} clients, ${trades.length} trades, ${employees.length} employees, ${mappings.length} mappings\n`,
  );
  if (config.liveTradesMs > 0) {
    setInterval(() => {
      const created = emitTrades(config.liveTradesCount);
      console.log(`  + auto-emitted ${created.length} fresh trades (total ${trades.length})`);
    }, config.liveTradesMs);
    console.log(`   Live trades: +${config.liveTradesCount} every ${config.liveTradesMs}ms`);
  }
});
