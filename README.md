# BSE Portal

Take-home assignment: a **Mock BSE API** (Part A) and an **Internal Operations Portal** (Part B) for a
stock-broking firm. The BSE feed is deliberately painful — slow (5–10 min), 30s timeout, ~20% mid-pull
failures — yet **every portal screen loads in under a second even when BSE is down**, and updates live
when fresh data arrives.

> **The core design:** ingestion and serving are decoupled. A background worker mirrors BSE into
> Postgres (slowly, with retries and idempotent upserts); the portal reads only Postgres (always fast,
> always available). See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What's inside

```
BSE Portal/
├── part-a-mock-bse/         # Part A — mock BSE feed (slow/unreliable) + instant internal-app endpoints
├── part-b-portal/
│   ├── server/              # Part B — sync worker, serving API, dynamic RBAC, WebSocket (Prisma + Postgres)
│   └── web/                 # Part B — React + Vite + Tailwind UI (butter/green theme)
├── docs/
│   ├── ARCHITECTURE.md      # one-page architecture: diagram + reasoning
│   ├── SCALING-100x.md      # running at 100× data volume
│   └── DEMO.md              # video walkthrough script
└── docker-compose.yml       # Postgres 16
```

## Prerequisites

- **Node.js 20+** (works on 25) and **npm 9+**
- **Docker** (for Postgres) — or point `DATABASE_URL` at any Postgres you already run

## Quickstart

```bash
# 1. Install all workspaces
npm install

# 2. Start Postgres (host port 5433)
npm run db:up

# 3. Create schema + generate client, then seed RBAC + demo users
npm run prisma:migrate      # applies the migration
npm run seed                # 6 features, 2 orgs, 7 users

# 4. Run everything (mock BSE + portal server + web) in one terminal
npm run dev
```

Then open the portal and sign in with any demo account (password: `password`).

| Service | URL | Notes |
|---|---|---|
| **Internal Dashboard (Part B web)** | http://localhost:5173 | the portal |
| **Portal API (Part B server)** | http://localhost:4002 | serving API + `/ws` |
| **Mock BSE API (Part A)** | http://localhost:4001 | slow/unreliable feed + instant internal endpoints |
| Postgres | localhost:5433 | user/pass/db = `bse`/`bse`/`bse_portal` |

> Prefer separate terminals? Use `npm run dev:mock`, `npm run dev:server`, `npm run dev:web`.

## Demo accounts

All use password **`password`**. They demonstrate the dynamic RBAC matrix.

| Email | Org | Role | Sees |
|---|---|---|---|
| `admin@arham.test` | Arham Fintech | Administrator | everything incl. **Access Control** |
| `manager@arham.test` | Arham Fintech | Management | Clients, Trades, Employees, Incentives (**all**) |
| `rm1@arham.test` | Arham Fintech | Relationship Manager | **My** Clients, **my** Trades, **my own** Incentive |
| `rm2@arham.test` | Arham Fintech | Relationship Manager | (mapped to a different RM) |
| `admin@zenith.test` | Zenith Securities | Administrator | everything |
| `compliance@zenith.test` | Zenith Securities | Compliance Officer | Clients, Trades, Employees (no incentives) |
| `rm@zenith.test` | Zenith Securities | Relationship Manager | My Clients + own Incentive (**no** Trades screen — differs from Arham's RM) |

## Meeting the hard requirements (and how to see it)

- **< 1s loads, even if BSE is down** — every screen shows its server response time (typically 8–48ms). Kill the mock (`Ctrl-C` on Part A) and the portal keeps serving instantly.
- **Live updates without refresh** — click **“+ Simulate BSE trades”** in the top bar (or set `MOCK_BSE_LIVE_TRADES_MS`). Within the next sync cycle the Trades/Incentives screens update on their own; the **Live** dot and counts reflect it.
- **Correctness under failure** — the mock injects ~20% mid-pull socket resets. Watch the server log: `↻ … retry`, then `✓ … synced`. Data is never duplicated or half-written (idempotent upsert + transactional page commit).
- **Dynamic RBAC** — sign in as `admin@arham.test`, open **Access Control**, and change a role's grant/scope. That role's access changes on its next request.

## Configuration knobs

Copy `.env.example` where needed. Key knobs:

**Part A (mock):** `MOCK_BSE_DELAY_MS` (per-page delay), `MOCK_BSE_FAILURE_RATE` (default `0.2`),
`MOCK_BSE_PAGE_SIZE`, `MOCK_BSE_LIVE_TRADES_MS` (auto-generate fresh trades).

**Part B (server):** `DATABASE_URL`, `MOCK_BSE_BASE_URL`, `SYNC_INTERVAL_MS`,
`BSE_HTTP_TIMEOUT_MS` (default `30000`), `INCENTIVE_RATE` (default `0.15`).

### Proving it works at a 10-minute pull

The design is delay-independent. To feel it:

```bash
# ~19s per page × ~32 pages ≈ 10 min total, each request still under the 30s timeout
cd part-a-mock-bse && MOCK_BSE_DELAY_MS=19000 npm run dev
```

Start the portal and open any screen: it renders **immediately** from whatever the worker has committed so
far, and fills in live as pages land — the slow pull never blocks a single screen.

## Handy scripts (root)

| Command | Does |
|---|---|
| `npm run dev` | mock + server + web together |
| `npm run db:up` / `db:down` | start / stop Postgres |
| `npm run prisma:migrate` | apply DB migration |
| `npm run seed` | seed RBAC + demo users |

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — diagram + reasoning (the one-pager)
- [`docs/SCALING-100x.md`](docs/SCALING-100x.md) — 100× data volume
- [`docs/DEMO.md`](docs/DEMO.md) — walkthrough / video script
- [`part-a-mock-bse/README.md`](part-a-mock-bse/README.md), [`part-b-portal/server/README.md`](part-b-portal/server/README.md)
