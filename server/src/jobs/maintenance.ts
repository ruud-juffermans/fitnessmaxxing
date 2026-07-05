import { prisma } from '../db.js';
import { authConfig } from '../auth/config.js';

// Periodic database hygiene. Runs in-process once a day (see index.ts) and can
// also be invoked from infrastructure cron:
//
//   0 3 * * *  cd /app/server && npm run maintenance
//
// 1. Purge INACTIVE guest accounts: un-converted guests whose account is older
//    than GUEST_TTL_DAYS *and* who have no session used within that window.
//    Session.lastUsedAt is touched on authenticated requests, so a guest who
//    keeps training is never purged — only abandoned trials are. Their plans,
//    workouts, sessions and tokens cascade away with the user row.
// 2. Delete expired sessions (normally cleaned up lazily on next use, which
//    never happens for abandoned ones).
// 3. Delete used or expired verification/reset tokens.
export async function runMaintenance(now = Date.now()): Promise<{
  guests: number;
  sessions: number;
  tokens: number;
}> {
  const guestCutoff = new Date(now - authConfig.guestTtlMs);
  const { count: guests } = await prisma.user.deleteMany({
    where: {
      isGuest: true,
      createdAt: { lt: guestCutoff },
      sessions: { none: { lastUsedAt: { gte: guestCutoff } } },
    },
  });

  const { count: sessions } = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date(now) } },
  });

  const { count: tokens } = await prisma.verificationToken.deleteMany({
    where: { OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date(now) } }] },
  });

  return { guests, sessions, tokens };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Schedule the daily in-process run. Kicked off from index.ts after the server
// starts; failures are logged and the next run still happens.
export function scheduleMaintenance(): void {
  const run = () =>
    runMaintenance()
      .then(({ guests, sessions, tokens }) => {
        if (guests || sessions || tokens) {
          console.log(`[maintenance] purged ${guests} guest(s), ${sessions} session(s), ${tokens} token(s)`);
        }
      })
      .catch((err) => console.error('[maintenance] failed:', err));

  run();
  const timer = setInterval(run, DAY_MS);
  // Never keep the process alive just for housekeeping.
  timer.unref();
}

// Only run when invoked directly (not when imported by the server or a test).
const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  runMaintenance()
    .then(({ guests, sessions, tokens }) => {
      console.log(`Purged ${guests} guest account(s), ${sessions} expired session(s), ${tokens} stale token(s).`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
