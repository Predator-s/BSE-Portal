/**
 * Runtime configuration for the Mock BSE API.
 * Everything is overridable by env so the same build can run "fast" in dev
 * and at the punishing 10-minute-per-pull setting the brief asks us to survive.
 */
export const config = {
  port: Number(process.env.MOCK_BSE_PORT ?? 4001),

  /**
   * Per-page delay in ms. This is the knob the brief calls "configurable delay per pull".
   * Because the exchange caps each HTTP request at 30s, a full pull is made of many
   * paginated requests. Total pull time ≈ (numPages * delayMs).
   *   dev:  ~1.5s/page  → a few seconds total
   *   10m:  ~19s/page over ~32 pages ≈ 10 minutes, while each page stays < 30s.
   */
  delayMs: Number(process.env.MOCK_BSE_DELAY_MS ?? 1500),

  /** Probability [0..1] that any single page request dies partway (mid-pull failure). */
  failureRate: Number(process.env.MOCK_BSE_FAILURE_RATE ?? 0.2),

  /** Rows per page for the paginated BSE endpoints. */
  pageSize: Number(process.env.MOCK_BSE_PAGE_SIZE ?? 200),

  // Deterministic seed volumes.
  numClients: Number(process.env.MOCK_BSE_CLIENTS ?? 400),
  numTrades: Number(process.env.MOCK_BSE_TRADES ?? 6000),
  numEmployees: Number(process.env.MOCK_BSE_EMPLOYEES ?? 20),

  /** Fixed seed → identical data on every boot (important for resumable syncs). */
  seed: Number(process.env.MOCK_BSE_SEED ?? 20260714),

  /** If > 0, auto-generate this many fresh trades on an interval (live-update demo). */
  liveTradesMs: Number(process.env.MOCK_BSE_LIVE_TRADES_MS ?? 0),
  liveTradesCount: Number(process.env.MOCK_BSE_LIVE_TRADES_COUNT ?? 10),
};

export type Config = typeof config;
