# Part B — Portal Server

Sync worker + serving API + dynamic RBAC + live updates. Postgres via Prisma.

## Run

```bash
npm install                 # from repo root
npm run db:up               # Postgres on :5433
npm run prisma:migrate
npm run seed
npm run dev:server          # or: cd part-b-portal/server && npm run dev
# → http://localhost:4002  (+ WebSocket at /ws)
```

## Layout

```
src/
  server.ts          # express app + WS + starts the worker
  bseClient.ts       # HTTP client to Part A; 30s timeout; a failed page throws (never partial)
  sync/worker.ts     # the ingestion engine (chunk · retry/resume · idempotent upsert · watermark)
  rbac.ts            # resolve user → org → role → features + scope
  auth.ts            # JWT + requireFeature(featureKey) guard
  incentives.ts      # Σ(brokerage on mapped clients) × rate, via GROUP BY
  events.ts / ws.ts  # data & sync-status events → WebSocket fan-out
  routes/            # auth · data (RBAC-scoped) · access-control matrix · sync status
prisma/
  schema.prisma      # RBAC + business data + SyncState
  seed.ts            # dynamic Org × Role × Feature matrix + demo users
```

## API (all under `/api`, Bearer token except where noted)

| Method + path | Feature / scope | Notes |
|---|---|---|
| `POST /api/auth/login` | public | `{ email, password }` → `{ token, access }` |
| `GET /api/auth/demo-users` | public | login-screen picker |
| `GET /api/auth/me` | auth | current access |
| `GET /api/clients` | `clients` ALL | paginated |
| `GET /api/my-clients` | `my_clients` MAPPED | clients mapped to the caller |
| `GET /api/trades` | `trades` ALL/MAPPED | filter `clientId`, `from`, `to`; paginated |
| `GET /api/employees` | `employees` ALL | + mapped-client counts |
| `GET /api/incentives` | `incentives` ALL/OWN | management sees all; RM sees own |
| `GET /api/access-control` | `access_control` | full Org × Role × Feature matrix |
| `PUT /api/access-control/grant` | `access_control` | `{ roleId, featureKey, scope|null }` — live edit |
| `GET /api/sync/status` | auth | counts + per-resource sync state |
| `POST /api/demo/emit-trades?count=N` | auth | proxy to the mock (live-update demo) |

## Sync worker — correctness properties

- **Chunked** pulls keep every request under `BSE_HTTP_TIMEOUT_MS` (30s) via `AbortController`.
- **Retry with resume**: a failed page retries with backoff; the cursor is persisted so a restart resumes from the last committed offset — never from scratch.
- **Idempotent**: rows keyed by external id + `createMany(skipDuplicates)`/upsert; retried pages and overlapping incremental windows can't duplicate.
- **Atomic page commit**: rows + cursor advance in one transaction.
- **Incremental**: trades pull `from = watermark` (max `tradedAt`); clients are change-detected with a cheap probe.
- **Ordered**: `internal → clients → trades`, so `Trade → Client` FKs never dangle.

## Config

| Env | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | see `.env` | Postgres connection |
| `PORT` | `4002` | server port |
| `MOCK_BSE_BASE_URL` | `http://localhost:4001` | Part A |
| `SYNC_INTERVAL_MS` | `30000` | cycle cadence |
| `BSE_HTTP_TIMEOUT_MS` | `30000` | per-request kill (the "network 30s" rule) |
| `MAX_PAGE_ATTEMPTS` | `8` | retries before a page bails to next cycle |
| `INCENTIVE_RATE` | `0.15` | RM share of brokerage |
| `JWT_SECRET` | dev value | change in production |
