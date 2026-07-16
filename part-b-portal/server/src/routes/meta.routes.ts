import { Router } from 'express';
import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { type AuthedRequest } from '../auth.js';

export const metaRoutes = Router();

/** Sync bookkeeping + row counts — powers the "data freshness" status panel. */
metaRoutes.get('/sync/status', async (_req: AuthedRequest, res) => {
  const [states, clients, trades, employees] = await Promise.all([
    prisma.syncState.findMany(),
    prisma.client.count(),
    prisma.trade.count(),
    prisma.employee.count(),
  ]);
  res.json({
    counts: { clients, trades, employees },
    states: states.map((s) => ({
      resource: s.id,
      status: s.status,
      processed: s.processed,
      total: s.total,
      pages: s.pages,
      attempts: s.attempts,
      watermark: s.watermark,
      lastRunAt: s.lastRunAt,
      lastSuccessAt: s.lastSuccessAt,
      lastError: s.lastError,
    })),
  });
});

/**
 * Demo helper: ask the mock BSE to generate fresh trades, so you can watch open
 * screens live-update. Purely for the walkthrough — not part of the data path.
 */
metaRoutes.post('/demo/emit-trades', async (req: AuthedRequest, res) => {
  const count = Math.min(500, Math.max(1, Number(req.query.count) || 25));
  try {
    const r = await fetch(`${env.mockBaseUrl.replace(/\/$/, '')}/admin/emit-trades?count=${count}`, {
      method: 'POST',
    });
    const body = await r.json();
    res.json({ ok: true, requested: count, mock: body });
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});
