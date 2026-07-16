# Part A — Mock BSE API

A small service that mimics the real BSE feed (slow + unreliable) plus the firm's instant internal app.
Deterministically seeded, so re-pulls and resume logic are testable.

## Run

```bash
npm install                 # from repo root
npm run dev:mock            # or: cd part-a-mock-bse && npm run dev
# → http://localhost:4001
```

## Endpoints

### BSE feed — slow, paginated, ~20% mid-pull failure

| Endpoint | Description |
|---|---|
| `GET /bse/clients?cursor=&limit=` | Paginated clients. |
| `GET /bse/trades?clientId=&from=&to=&cursor=&limit=` | Paginated trades, filterable by client + date range. |

Every BSE response is delayed by `MOCK_BSE_DELAY_MS` **per page** and, with probability
`MOCK_BSE_FAILURE_RATE`, dies **partway** through the body (partial bytes, then the socket is reset).
Both knobs are overridable per request: `?delayMs=`, `?failureRate=`.

Response shape:

```json
{ "data": [ ... ], "nextCursor": 200, "total": 400, "pull": { "cursor": 0, "limit": 200, "delayMs": 1500 } }
```

### Internal app — instant, reliable

| Endpoint | Description |
|---|---|
| `GET /internal/employees` | ~20 employees (master data). |
| `GET /internal/mappings` | client → relationship-manager mappings. |

### Meta / demo

| Endpoint | Description |
|---|---|
| `GET /` | service info + current config. |
| `GET /health` | healthcheck. |
| `POST /admin/emit-trades?count=N` | inject N brand-new trades (drives the live-update demo). |

## Why it's built this way

- **Offset cursors over a stable, seeded dataset** — pagination is only resumable if the source returns the
  same rows in the same order across pages. A fixed PRNG seed guarantees that.
- **Mid-pull socket reset** (not a clean 500) — this is the realistic failure the brief describes and it
  forces the client to treat a *partially received* page as a failure and retry, rather than trusting a 200.
- **Per-page delay** — a full pull is many pages; keeping each page under 30s while the sum approaches
  ~10 min is exactly the constraint Part B must survive.

## Config

| Env | Default | Meaning |
|---|---|---|
| `MOCK_BSE_PORT` | `4001` | port |
| `MOCK_BSE_DELAY_MS` | `1500` | per-page delay (set `19000` to simulate a ~10-min pull) |
| `MOCK_BSE_FAILURE_RATE` | `0.2` | mid-pull failure probability |
| `MOCK_BSE_PAGE_SIZE` | `200` | rows per page |
| `MOCK_BSE_CLIENTS` / `MOCK_BSE_TRADES` / `MOCK_BSE_EMPLOYEES` | `400` / `6000` / `20` | seed volumes |
| `MOCK_BSE_LIVE_TRADES_MS` / `..._COUNT` | `0` / `10` | auto-emit fresh trades on an interval |
