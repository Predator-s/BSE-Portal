# Running at 100× data volume

Today: ~400 clients, ~6k trades, ~20 employees. **100×** ≈ 40k clients, **600k+ trades/period**,
and the trade count grows without bound over time. What changes — and what doesn't.

## What already scales

- **Read path.** Screens are paginated `SELECT`s against indexed columns (`Trade.clientId`, `Trade.tradedAt`, `Client.rmId`). With the right indexes these stay sub-second at 100× — the UI never loads an unbounded set.
- **Idempotent, resumable ingestion.** The upsert-by-id + cursor/watermark design is volume-independent; a bigger pull is just more pages, each still under the 30s ceiling.
- **Incremental sync.** We pull `from = watermark`, not the whole history, so steady-state work scales with *new* trades per cycle, not total trades.

## What I'd change

**1. Ingestion throughput — parallelize by key range.**
A single serial cursor is the bottleneck at 100×. Partition the pull (e.g. by client-id range or date window) and run N workers concurrently, each with its own `SyncState` row. Idempotent upserts make overlap harmless.

**2. Incentives — precompute, don't aggregate on read.**
`GROUP BY` over 600k+ trades per request gets expensive. Maintain a rolling aggregate table (`incentive_by_rm_by_period`) updated as trades commit, or a materialized view refreshed per cycle. Reads become a tiny indexed lookup.

**3. Trades table — partition + retention.**
Range-partition `Trade` by month (`tradedAt`). Queries prune to a few partitions; old partitions can be rolled to cold storage. Keep the hot window in Postgres.

**4. Fan-out — don't broadcast every row.**
At 100× the worker commits constantly. Coalesce `data` events (e.g. one "trades changed" ping per second) and let clients debounce-refetch. For many concurrent users, move fan-out to Redis pub/sub so the API can run as multiple stateless instances behind a load balancer.

**5. Serving — scale horizontally.**
The API is stateless (JWT auth, DB-backed), so run several replicas behind a load balancer. Add a read replica for Postgres and send portal reads there; keep the worker writing to the primary.

**6. Bulk-load big backfills.**
For the first 100× backfill, stream via `COPY` / batched inserts inside a transaction per page instead of row-by-row upserts, then switch to incremental.

## What stays the same

The core contract is unchanged: **serve only from our store, ingest in the background, upsert idempotently, push deltas.** Scaling is adding partitions, replicas, a precomputed aggregate, and parallel workers — not a redesign.
