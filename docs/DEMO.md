# Demo / Video walkthrough script

A ~4–5 minute walkthrough that hits every evaluation point. Record screen + voice.

## 0. Setup (before recording)
```bash
npm install && npm run db:up && npm run prisma:migrate && npm run seed
npm run dev
```
Have three things visible: the browser (`localhost:5173`), the **portal-server terminal** (sync logs), and
the **mock terminal**.

## 1. The problem (20s)
> "The BSE feed takes 5–10 minutes, times out at 30s, and ~20% of pulls fail midway. But every screen has
> to load in under a second and update live. So I never read BSE on the request path — I mirror it into
> Postgres in the background and serve only from there."

Show `docs/ARCHITECTURE.md` diagram.

## 2. Ingestion under failure (60s)
Point at the **server terminal** during the first sync:
- `✓ clients synced (400 rows, 2 pages)`
- `↻ trades cursor=… retry` → `✓ trades synced (6000 rows, 30 pages)`
> "Each page is under the 30s timeout. A page that dies mid-pull is retried and resumed from the last
> committed cursor — and because rows are keyed by id and committed transactionally with the cursor,
> retries never duplicate or half-write."

## 3. Sub-1s, always available (45s)
Sign in as **`manager@arham.test`**. Click through Clients / Trades / Employees / Incentives.
> "Notice the response-time badge — 8 to 48 ms."
Now **Ctrl-C the mock** (Part A). Reload a screen.
> "BSE is down. The portal still serves instantly, because it only reads our own store."
(Restart the mock afterward.)

## 4. Live updates, no refresh (45s)
On the **Trades** or **Incentives** screen, click **“+ Simulate BSE trades.”**
> "That injects fresh trades into the mock. On the next sync cycle the worker ingests them and pushes a
> WebSocket event — watch the counts and the table update without me refreshing."
Point at the **Live** dot and the "syncing trades …" chip.

## 5. Incentives correctness (30s)
On **Incentives** (as manager):
> "Incentive = 15% of the brokerage on each RM's mapped clients' trades — one GROUP BY. Management sees
> all RMs; totals up top."
Sign out, sign in as **`rm1@arham.test`** → Incentives.
> "The same screen, scoped to OWN — this RM sees only their own row. And they have no Clients or Access
> Control in the sidebar at all."

## 6. Dynamic RBAC (45s)
Sign in as **`admin@arham.test`** → **Access Control**.
> "Access is data, not code: Org × Role × Feature, each grant with a scope. Two orgs — Arham and Zenith —
> give the same 'RM' role different features."
Change the **rm** role's `trades` cell to `— none —` (or flip a scope). In another tab signed in as that RM,
navigate — the Trades screen is gone.

## 7. Wrap (20s)
> "Decouple ingestion from serving, make ingestion idempotent and resumable, push deltas over WebSocket,
> and drive permissions from a matrix in the DB. Scaling to 100× is partitioning, a precomputed incentive
> aggregate, and parallel workers — same contract." (Show `docs/SCALING-100x.md`.)
```
```
