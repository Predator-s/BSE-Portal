import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 4002),
  databaseUrl: required('DATABASE_URL'),
  mockBaseUrl: process.env.MOCK_BSE_BASE_URL ?? 'http://localhost:4001',
  syncIntervalMs: Number(process.env.SYNC_INTERVAL_MS ?? 30_000),
  // The exchange network kills any HTTP request after 30s — we enforce the same
  // ceiling client-side so a slow page is abandoned and retried, never hung on.
  bseHttpTimeoutMs: Number(process.env.BSE_HTTP_TIMEOUT_MS ?? 30_000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  // Rows requested per page from the BSE feed.
  pullPageSize: Number(process.env.PULL_PAGE_SIZE ?? 200),
  // Max retry attempts per failed page before the cycle backs off.
  maxPageAttempts: Number(process.env.MAX_PAGE_ATTEMPTS ?? 8),
};
