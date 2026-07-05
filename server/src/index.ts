import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { authRouter } from './routes/auth.js';
import { exercisesRouter } from './routes/exercises.js';
import { plansRouter } from './routes/plans.js';
import { splitsRouter } from './routes/splits.js';
import { workoutsRouter } from './routes/workouts.js';
import { statsRouter } from './routes/stats.js';
import { adminRouter } from './routes/admin.js';
import { requireAuth } from './middleware/auth.js';
import { requireServiceOrAdmin } from './middleware/serviceAuth.js';
import { bootstrapAdmin } from './auth/bootstrapAdmin.js';
import { scheduleMaintenance } from './jobs/maintenance.js';

const app = express();

// Credentialed CORS: the browser must send the session cookie, which requires an
// explicit origin (not "*"). Configure allowed origins via CORS_ORIGIN (comma
// separated); defaults to the local Vite dev server.
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3002')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Public auth endpoints.
app.use('/api/auth', authRouter);

// Everything below requires an authenticated, email-verified user.
app.use('/api/exercises', requireAuth, exercisesRouter);
app.use('/api/plans', requireAuth, plansRouter);
app.use('/api/splits', requireAuth, splitsRouter);
app.use('/api/workouts', requireAuth, workoutsRouter);
app.use('/api/stats', requireAuth, statsRouter);

// Admin-only user management. Accessible to a session admin user OR the central
// admin app via a shared service token (X-Service-Token: ADMIN_SERVICE_TOKEN).
app.use('/api/admin', requireServiceOrAdmin, adminRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Already exists' });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal error';
  res.status(500).json({ error: message });
});

const port = Number(process.env.SERVER_PORT ?? 4000);
// Reconcile the configured admin account, then start accepting requests. A
// bootstrap failure is logged but never blocks the server from coming up.
bootstrapAdmin()
  .catch((err) => console.error('[admin] bootstrap failed:', err))
  .finally(() => {
    app.listen(port, () => {
      console.log(`server listening on :${port}`);
      // Daily DB hygiene: purge inactive guests, expired sessions, stale tokens.
      scheduleMaintenance();
    });
  });
