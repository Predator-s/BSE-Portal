import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { emitData, emitSyncStatus } from '../events.js';
import {
  pullClients,
  pullTrades,
  pullEmployees,
  pullMappings,
  type Page,
} from '../bseClient.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Get-or-create the bookkeeping row for a resource. */
async function getState(id: string) {
  return prisma.syncState.upsert({
    where: { id },
    update: {},
    create: { id },
  });
}

/**
 * Fetch one page, retrying transient failures (timeout, socket reset mid-pull,
 * non-2xx, truncated JSON) with exponential backoff. Throws only after the page
 * has failed `maxPageAttempts` times — at which point the caller ends the cycle
 * and we resume from the persisted cursor next time.
 */
async function fetchPageWithRetry<T>(
  resource: string,
  cursor: number,
  fetchPage: (cursor: number) => Promise<Page<T>>,
): Promise<Page<T>> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const page = await fetchPage(cursor);
      if (attempt > 0) {
        await prisma.syncState.update({ where: { id: resource }, data: { attempts: 0 } });
      }
      return page;
    } catch (err) {
      attempt += 1;
      await prisma.syncState.update({
        where: { id: resource },
        data: { attempts: attempt, lastError: (err as Error).message },
      });
      if (attempt >= env.maxPageAttempts) {
        throw new Error(
          `${resource}: page at cursor=${cursor} failed ${attempt}× — ${(err as Error).message}`,
        );
      }
      const backoff = Math.min(1000 * 2 ** (attempt - 1), 15_000);
      console.log(
        `   ↻ ${resource} cursor=${cursor} attempt ${attempt} failed (${(err as Error).message}); retry in ${backoff}ms`,
      );
      await sleep(backoff);
    }
  }
}

// ── Internal app (fast + reliable): employees + mappings ─────────────────────
export async function syncInternal(): Promise<void> {
  await prisma.syncState.update({
    where: { id: (await getState('internal')).id },
    data: { status: 'running', lastRunAt: new Date() },
  });
  try {
    const [emps, maps] = await Promise.all([pullEmployees(), pullMappings()]);

    // Employees can change fields (title/dept), so upsert rather than skip-dup.
    for (const e of emps.data) {
      await prisma.employee.upsert({
        where: { id: e.id },
        create: { id: e.id, name: e.name, email: e.email, title: e.title, department: e.department },
        update: { name: e.name, email: e.email, title: e.title, department: e.department },
      });
    }

    // Apply client→RM mappings, grouped by employee (skips clients not yet synced).
    const byEmp = new Map<string, string[]>();
    for (const m of maps.data) {
      if (!byEmp.has(m.employeeId)) byEmp.set(m.employeeId, []);
      byEmp.get(m.employeeId)!.push(m.clientId);
    }
    for (const [employeeId, clientIds] of byEmp) {
      await prisma.client.updateMany({
        where: { id: { in: clientIds } },
        data: { rmId: employeeId },
      });
    }

    await prisma.syncState.update({
      where: { id: 'internal' },
      data: {
        status: 'success',
        processed: emps.data.length,
        total: emps.total,
        lastSuccessAt: new Date(),
        lastError: null,
      },
    });
    emitData({ resource: 'employees', action: 'upserted', count: emps.data.length });
    emitData({ resource: 'mappings', action: 'upserted', count: maps.data.length });
  } catch (err) {
    await prisma.syncState.update({
      where: { id: 'internal' },
      data: { status: 'failed', lastError: (err as Error).message },
    });
    console.log(`   ✗ internal sync failed: ${(err as Error).message}`);
  }
}

// ── Clients (slow + unreliable): full resumable pull, change-detected ─────────
export async function syncClients(): Promise<boolean> {
  const st = await getState('clients');
  const dbCount = await prisma.client.count();

  // Cheap change-detection: one tiny probe to read the source total.
  if (st.status === 'success' && dbCount > 0) {
    try {
      const probe = await pullClients(0, 1);
      if (probe.total === dbCount) return true; // in sync, nothing to do
      console.log(`   ⤷ clients changed at source (${probe.total} vs ${dbCount}) — resyncing`);
    } catch {
      return true; // probe failed but we already have data; try again next cycle
    }
  }

  // Resume from the persisted cursor unless the previous window already finished.
  let cursor = st.status === 'running' ? st.cursor : 0;
  await prisma.syncState.update({
    where: { id: 'clients' },
    data: { status: 'running', cursor, processed: st.status === 'running' ? st.processed : 0, lastRunAt: new Date() },
  });

  try {
    let processed = st.status === 'running' ? st.processed : 0;
    let pages = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await fetchPageWithRetry('clients', cursor, (c) =>
        pullClients(c, env.pullPageSize),
      );

      // Atomic page commit: insert rows AND advance the cursor in one transaction,
      // so a crash can never leave the cursor ahead of the committed rows.
      const rows = page.data.map((c) => ({
        id: c.id,
        name: c.name,
        pan: c.pan,
        email: c.email,
        city: c.city,
        segment: c.segment,
        kycStatus: c.kycStatus,
        openedAt: new Date(c.createdAt),
      }));
      const nextCursor = page.nextCursor;
      const [inserted] = await prisma.$transaction([
        prisma.client.createMany({ data: rows, skipDuplicates: true }),
        prisma.syncState.update({
          where: { id: 'clients' },
          data: {
            cursor: nextCursor ?? cursor + rows.length,
            processed: processed + rows.length,
            total: page.total,
            pages: pages + 1,
          },
        }),
      ]);
      processed += rows.length;
      pages += 1;
      if (inserted.count > 0) emitData({ resource: 'clients', action: 'upserted', count: inserted.count });
      emitSyncStatus({ type: 'sync-status', resource: 'clients', status: 'running', processed, total: page.total, pages });

      if (nextCursor === null) break;
      cursor = nextCursor;
    }

    await prisma.syncState.update({
      where: { id: 'clients' },
      data: { status: 'success', cursor: 0, lastSuccessAt: new Date(), lastError: null },
    });
    console.log(`   ✓ clients synced (${processed} rows, ${pages} pages)`);
    emitSyncStatus({ type: 'sync-status', resource: 'clients', status: 'success', processed, total: processed, pages });
    return true;
  } catch (err) {
    await prisma.syncState.update({
      where: { id: 'clients' },
      data: { status: 'failed', lastError: (err as Error).message },
    });
    console.log(`   ✗ clients sync failed (will resume next cycle): ${(err as Error).message}`);
    return false;
  }
}

// ── Trades (slow + unreliable): incremental by tradedAt, resumable ────────────
export async function syncTrades(): Promise<void> {
  const st = await getState('trades');

  // Continue an interrupted window (same from-filter + cursor), else open a new
  // incremental window starting at the high-water mark.
  const resuming = st.status === 'running';
  const windowFrom = resuming ? st.windowFrom : st.watermark;
  let cursor = resuming ? st.cursor : 0;

  await prisma.syncState.update({
    where: { id: 'trades' },
    data: {
      status: 'running',
      cursor,
      windowFrom: windowFrom ?? null,
      processed: resuming ? st.processed : 0,
      lastRunAt: new Date(),
    },
  });

  const fromIso = windowFrom ? windowFrom.toISOString() : undefined;

  try {
    let processed = resuming ? st.processed : 0;
    let pages = 0;
    let maxTradedAt: Date | null = st.watermark ?? null;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await fetchPageWithRetry('trades', cursor, (c) =>
        pullTrades(c, env.pullPageSize, { from: fromIso }),
      );

      const rows = page.data.map((t) => {
        const tradedAt = new Date(t.tradedAt);
        if (!maxTradedAt || tradedAt > maxTradedAt) maxTradedAt = tradedAt;
        return {
          id: t.id,
          clientId: t.clientId,
          symbol: t.symbol,
          side: t.side,
          quantity: t.quantity,
          price: t.price,
          tradeValue: t.tradeValue,
          brokerage: t.brokerage,
          exchange: t.exchange,
          tradedAt,
        };
      });
      const nextCursor = page.nextCursor;

      // Idempotent by primary key: overlapping windows / retried pages never dup.
      const [inserted] = await prisma.$transaction([
        prisma.trade.createMany({ data: rows, skipDuplicates: true }),
        prisma.syncState.update({
          where: { id: 'trades' },
          data: {
            cursor: nextCursor ?? cursor + rows.length,
            processed: processed + rows.length,
            total: page.total,
            pages: pages + 1,
          },
        }),
      ]);
      processed += rows.length;
      pages += 1;
      if (inserted.count > 0) emitData({ resource: 'trades', action: 'upserted', count: inserted.count });
      emitSyncStatus({ type: 'sync-status', resource: 'trades', status: 'running', processed, total: page.total, pages });

      if (nextCursor === null) break;
      cursor = nextCursor;
    }

    await prisma.syncState.update({
      where: { id: 'trades' },
      data: {
        status: 'success',
        cursor: 0,
        windowFrom: null,
        watermark: maxTradedAt ?? undefined,
        lastSuccessAt: new Date(),
        lastError: null,
      },
    });
    console.log(`   ✓ trades synced (${processed} rows this window, ${pages} pages)`);
    emitSyncStatus({ type: 'sync-status', resource: 'trades', status: 'success', processed, total: processed, pages });
  } catch (err) {
    await prisma.syncState.update({
      where: { id: 'trades' },
      data: { status: 'failed', lastError: (err as Error).message },
    });
    console.log(`   ✗ trades sync failed (will resume next cycle): ${(err as Error).message}`);
  }
}

// ── Orchestration ─────────────────────────────────────────────────────────────
export async function runSyncCycle(): Promise<void> {
  console.log('── sync cycle start ──');
  await syncInternal();
  const clientsOk = await syncClients();
  // Only ingest trades once every client they reference exists (referential safety).
  if (clientsOk) {
    await syncTrades();
  } else {
    console.log('   ⤷ skipping trades this cycle until clients finish');
  }
  console.log('── sync cycle end ──');
}

let ticking = false;
export function startWorker(): void {
  const tick = async () => {
    if (ticking) return; // never overlap cycles
    ticking = true;
    try {
      await runSyncCycle();
    } catch (err) {
      console.error('sync cycle error:', (err as Error).message);
    } finally {
      ticking = false;
    }
  };
  void tick(); // kick off immediately on boot
  setInterval(tick, env.syncIntervalMs);
  console.log(`🔁 sync worker started (every ${env.syncIntervalMs}ms)`);
}
