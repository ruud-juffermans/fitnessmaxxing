import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';
import { authConfig } from '../auth/config.js';
import { generateToken } from '../auth/tokens.js';
import { sendPasswordResetEmail } from '../auth/email.js';
import { destroyAllSessions } from '../auth/session.js';

// Admin-only user management. This router is mounted behind requireAuth +
// requireAdmin (see index.ts), so every handler can assume req.user is an admin.
// Scope is deliberately account-level only: admins see metadata and activity
// counts, never the actual plan/workout content of other users.
export const adminRouter = Router();

const idParam = z.object({ id: z.string().uuid() });

// The fields returned for every user row — metadata + activity counts, no content.
const userSelect = {
  id: true,
  email: true,
  name: true,
  emailVerified: true,
  isGuest: true,
  role: true,
  disabledAt: true,
  createdAt: true,
  _count: { select: { plans: true, workouts: true, exercises: true } },
} satisfies Prisma.UserSelect;

// Load the target user or send a 404. Returns null when not found so the caller
// can simply `return`.
async function findTarget(id: string, res: import('express').Response) {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  return user;
}

// Guard against an admin locking themselves out (suspend/delete/revoke self).
// A service-token caller has no req.user — there's no "self" to protect, so the
// guard simply doesn't apply.
function blocksSelf(req: import('express').Request, res: import('express').Response, action: string): boolean {
  if (req.user && req.params.id === req.user.id) {
    res.status(400).json({ error: `You can't ${action} your own account.` });
    return true;
  }
  return false;
}

// GET /api/admin/users?search= — list users (newest first, capped).
adminRouter.get(
  '/users',
  asyncRoute(async (req, res) => {
    const { search } = z.object({ search: z.string().trim().max(254).optional() }).parse(req.query);
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: userSelect,
    });
    res.json({ users });
  }),
);

// GET /api/admin/users/:id — single user detail (same metadata-only shape).
adminRouter.get(
  '/users/:id',
  asyncRoute(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const user = await findTarget(id, res);
    if (!user) return;
    res.json({ user });
  }),
);

// POST /api/admin/users/:id/suspend — block login and revoke all sessions.
adminRouter.post(
  '/users/:id/suspend',
  asyncRoute(async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (blocksSelf(req, res, 'suspend')) return;
    if (!(await findTarget(id, res))) return;

    await prisma.user.update({ where: { id }, data: { disabledAt: new Date() } });
    // Log the user out everywhere; they can no longer sign back in while suspended.
    await destroyAllSessions(id);
    res.json({ ok: true });
  }),
);

// POST /api/admin/users/:id/unsuspend — restore access.
adminRouter.post(
  '/users/:id/unsuspend',
  asyncRoute(async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (!(await findTarget(id, res))) return;

    await prisma.user.update({ where: { id }, data: { disabledAt: null } });
    res.json({ ok: true });
  }),
);

// DELETE /api/admin/users/:id — permanently remove the user and all their data
// (plans, workouts, exercises, sessions, tokens cascade automatically).
adminRouter.delete(
  '/users/:id',
  asyncRoute(async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (blocksSelf(req, res, 'delete')) return;
    if (!(await findTarget(id, res))) return;

    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  }),
);

// POST /api/admin/users/:id/reset-password — send the user a standard reset
// link. The admin never sees or sets the password directly.
adminRouter.post(
  '/users/:id/reset-password',
  asyncRoute(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const user = await findTarget(id, res);
    if (!user) return;
    if (user.isGuest) {
      res.status(400).json({ error: 'Guest accounts have no email to reset.' });
      return;
    }

    const { token, tokenHash } = generateToken();
    await prisma.verificationToken.updateMany({
      where: { userId: id, type: 'password_reset', usedAt: null },
      data: { usedAt: new Date() },
    });
    await prisma.verificationToken.create({
      data: {
        userId: id,
        tokenHash,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + authConfig.passwordResetTtlMs),
      },
    });
    await sendPasswordResetEmail(user.email, token);
    res.json({ ok: true });
  }),
);

// POST /api/admin/users/:id/verify-email — manually mark the email verified.
adminRouter.post(
  '/users/:id/verify-email',
  asyncRoute(async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (!(await findTarget(id, res))) return;

    await prisma.user.update({ where: { id }, data: { emailVerified: true } });
    res.json({ ok: true });
  }),
);

// POST /api/admin/users/:id/revoke-sessions — sign the user out everywhere.
adminRouter.post(
  '/users/:id/revoke-sessions',
  asyncRoute(async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (blocksSelf(req, res, 'revoke sessions for')) return;
    if (!(await findTarget(id, res))) return;

    await destroyAllSessions(id);
    res.json({ ok: true });
  }),
);
