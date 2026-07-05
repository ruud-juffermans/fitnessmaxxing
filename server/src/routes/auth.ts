import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';
import { authConfig } from '../auth/config.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { generateToken, hashToken } from '../auth/tokens.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../auth/email.js';
import {
  createSession,
  destroySession,
  destroyAllSessions,
  getSessionUser,
} from '../auth/session.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { provisionDefaults } from '../defaults.js';

export const authRouter = Router();

const emailField = z.string().trim().toLowerCase().email().max(254);
const passwordField = z.string().min(8, 'Password must be at least 8 characters').max(200);

// A hash of nothing anyone can log in with, compared against when the email is
// unknown so login takes the same time either way (no account-enumeration
// timing oracle). Computed once at module load.
const dummyHash = bcrypt.hashSync(generateToken().token, authConfig.bcryptRounds);

// Issue (or re-issue) an email-verification token and send the email. Any
// previous unused verification tokens for the user are invalidated first.
async function issueVerification(userId: string, email: string): Promise<void> {
  const { token, tokenHash } = generateToken();
  await prisma.verificationToken.updateMany({
    where: { userId, type: 'email_verification', usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + authConfig.verificationTtlMs),
    },
  });
  await sendVerificationEmail(email, token);
}

// POST /api/auth/register
authRouter.post(
  '/register',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many accounts created from this address. Please try again later.' }),
  asyncRoute(async (req, res) => {
    const { email, password, name } = z
      .object({ email: emailField, password: passwordField, name: z.string().trim().max(100).optional() })
      .parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Do not reveal whether an account exists; if it is unverified, re-send.
      if (!existing.emailVerified) await issueVerification(existing.id, email);
      res.status(201).json({ ok: true });
      return;
    }

    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password), name: name || null },
    });
    await provisionDefaults(user.id);
    await issueVerification(user.id, email);
    res.status(201).json({ ok: true });
  }),
);

// POST /api/auth/verify-email
authRouter.post(
  '/verify-email',
  asyncRoute(async (req, res) => {
    const { token } = z.object({ token: z.string().min(1) }).parse(req.body);
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!record || record.type !== 'email_verification' || record.usedAt || record.expiresAt < new Date()) {
      res.status(400).json({ error: 'This verification link is invalid or has expired.' });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
      prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    res.json({ ok: true });
  }),
);

// POST /api/auth/resend-verification
authRouter.post(
  '/resend-verification',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many verification emails requested. Please try again later.' }),
  asyncRoute(async (req, res) => {
    const { email } = z.object({ email: emailField }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified) await issueVerification(user.id, email);
    // Always generic to avoid account enumeration.
    res.json({ ok: true });
  }),
);

// POST /api/auth/login
authRouter.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many sign-in attempts. Please try again in a few minutes.' }),
  asyncRoute(async (req, res) => {
    const { email, password } = z.object({ email: emailField, password: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    // Always run a bcrypt comparison so the response time doesn't reveal
    // whether the account exists.
    const ok = await verifyPassword(password, user?.passwordHash ?? dummyHash);
    if (!user || !ok) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (!user.emailVerified) {
      res.status(403).json({ error: 'Please verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' });
      return;
    }
    if (user.disabledAt) {
      res.status(403).json({ error: 'This account has been suspended.', code: 'ACCOUNT_SUSPENDED' });
      return;
    }

    // Signing in from a guest session abandons that guest account for good (its
    // only key is the cookie we're about to replace), so delete it and its data
    // now instead of leaving it for the purge job.
    const current = await getSessionUser(req);
    if (current?.isGuest && current.id !== user.id) {
      await prisma.user.delete({ where: { id: current.id } }).catch(() => {});
    }

    await createSession(req, res, user.id);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, emailVerified: true, isGuest: user.isGuest, role: user.role },
    });
  }),
);

// POST /api/auth/guest
// Spin up a throwaway, pre-verified account so a visitor can explore the app
// without signing up. It is a real user (so every data route works unchanged),
// flagged isGuest for the cleanup job and the "convert" flow. Rate-limited per
// IP since it is unauthenticated and writes a batch of rows per call.
authRouter.post(
  '/guest',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many guest sessions from this address. Please try again later.' }),
  asyncRoute(async (req, res) => {
    // Synthetic, non-deliverable address; the random local-part keeps it unique
    // and the .local TLD can never collide with a real signup.
    const email = `guest_${generateToken().token}@guest.local`;
    const user = await prisma.user.create({
      data: {
        email,
        // Unguessable hash so the account can never be password-logged-into;
        // it is only reachable through this session's cookie.
        passwordHash: await hashPassword(generateToken().token),
        name: 'Guest',
        emailVerified: true,
        isGuest: true,
      },
    });
    await provisionDefaults(user.id);
    await createSession(req, res, user.id);
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, emailVerified: true, isGuest: true, role: user.role },
    });
  }),
);

// POST /api/auth/convert (authenticated guest -> real account)
// Claims the current guest account by attaching real credentials. The same user
// row is upgraded, so all trial data carries over. We keep the account usable
// immediately (emailVerified stays true) and send a confirmation email as a
// courtesy rather than a gate.
authRouter.post(
  '/convert',
  requireAuth,
  asyncRoute(async (req, res) => {
    if (!req.user!.isGuest) {
      res.status(409).json({ error: 'This account is already registered.' });
      return;
    }
    const { email, password, name } = z
      .object({ email: emailField, password: passwordField, name: z.string().trim().max(100).optional() })
      .parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'That email is already in use.' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { email, passwordHash: await hashPassword(password), name: name || null, isGuest: false },
    });
    await issueVerification(user.id, email);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified, isGuest: false, role: user.role },
    });
  }),
);

// POST /api/auth/logout
authRouter.post(
  '/logout',
  asyncRoute(async (req, res) => {
    await destroySession(req, res);
    res.json({ ok: true });
  }),
);

// GET /api/auth/me
authRouter.get(
  '/me',
  asyncRoute(async (req, res) => {
    const user = await getSessionUser(req, res);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    res.json({ user });
  }),
);

// POST /api/auth/forgot-password
authRouter.post(
  '/forgot-password',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many password reset requests. Please try again later.' }),
  asyncRoute(async (req, res) => {
    const { email } = z.object({ email: emailField }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const { token, tokenHash } = generateToken();
      await prisma.verificationToken.updateMany({
        where: { userId: user.id, type: 'password_reset', usedAt: null },
        data: { usedAt: new Date() },
      });
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          type: 'password_reset',
          expiresAt: new Date(Date.now() + authConfig.passwordResetTtlMs),
        },
      });
      await sendPasswordResetEmail(email, token);
    }
    // Generic response regardless of whether the account exists.
    res.json({ ok: true });
  }),
);

// POST /api/auth/reset-password
authRouter.post(
  '/reset-password',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many reset attempts. Please try again later.' }),
  asyncRoute(async (req, res) => {
    const { token, password } = z
      .object({ token: z.string().min(1), password: passwordField })
      .parse(req.body);

    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.type !== 'password_reset' || record.usedAt || record.expiresAt < new Date()) {
      res.status(400).json({ error: 'This reset link is invalid or has expired.' });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        // A successful reset also confirms ownership of the inbox.
        data: { passwordHash: await hashPassword(password), emailVerified: true },
      }),
      prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    // Force re-login everywhere after a password change.
    await destroyAllSessions(record.userId);
    res.json({ ok: true });
  }),
);

// POST /api/auth/change-password (authenticated)
authRouter.post(
  '/change-password',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { currentPassword, newPassword } = z
      .object({ currentPassword: z.string().min(1), newPassword: passwordField })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    // Keep the current session, drop the others, then refresh this cookie.
    await destroyAllSessions(user.id);
    await createSession(req, res, user.id);
    res.json({ ok: true });
  }),
);
