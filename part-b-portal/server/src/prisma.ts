import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/**
 * Wait until Postgres is reachable before the server starts serving / ingesting.
 * On `npm run dev` the DB, mock, server and web all boot at once; without this
 * the server could lose the race, fail its first query, and exit — leaving the
 * web UI with connection-refused errors. We retry a cheap `SELECT 1` with a
 * short backoff instead of dying, so startup order no longer matters.
 */
export async function waitForDatabase(
  maxAttempts = 30,
  delayMs = 1000,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      if (attempt > 1) console.log(`   ✓ database ready (after ${attempt} attempts)`);
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        throw new Error(
          `database not reachable after ${maxAttempts} attempts — ${(err as Error).message}`,
        );
      }
      console.log(
        `   ⏳ waiting for database (attempt ${attempt}/${maxAttempts})…`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
