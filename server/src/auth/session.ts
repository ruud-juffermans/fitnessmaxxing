import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { authConfig } from './config.js';
import { generateToken, hashToken } from './tokens.js';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  isGuest: boolean;
  role: 'user' | 'admin';
}

// How often (at most) an authenticated request bumps Session.lastUsedAt. Keeps
// the activity signal fresh enough for sliding expiry and the guest purge
// without turning every read into a write.
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

// Options must match between set and clear or some browsers won't remove it.
function cookieOptions() {
  return {
    httpOnly: true,
    // SameSite=None mandates Secure; otherwise follow prod/explicit override.
    secure: authConfig.cookieSameSite === 'none' || authConfig.cookieSecure || authConfig.isProd,
    sameSite: authConfig.cookieSameSite,
    path: '/',
  } as const;
}

// Create a DB-backed session and set the httpOnly session cookie on the response.
export async function createSession(req: Request, res: Response, userId: string): Promise<void> {
  const { token, tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + authConfig.sessionTtlMs);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
      ip: req.ip ?? null,
    },
  });

  res.cookie(authConfig.cookieName, token, { ...cookieOptions(), expires: expiresAt });
}

// Resolve the current user from the session cookie, or null when there is no
// valid, unexpired session. Expired sessions are cleaned up opportunistically.
// Valid sessions are touched (throttled) to record activity, and slide: once a
// session is past the halfway point of its TTL, activity extends it by a full
// TTL so an active user is never logged out mid-use.
export async function getSessionUser(req: Request, res?: Response): Promise<SessionUser | null> {
  const token = req.cookies?.[authConfig.cookieName];
  if (!token || typeof token !== 'string') return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() < now) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // A suspended account is treated as logged out everywhere (defense in depth;
  // suspending already revokes sessions). Drop the lingering session too.
  if (session.user.disabledAt) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (now - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    const shouldSlide = session.expiresAt.getTime() - now < authConfig.sessionTtlMs / 2;
    const expiresAt = shouldSlide ? new Date(now + authConfig.sessionTtlMs) : session.expiresAt;
    await prisma.session
      .update({
        where: { id: session.id },
        data: { lastUsedAt: new Date(now), ...(shouldSlide ? { expiresAt } : {}) },
      })
      .catch(() => {}); // best-effort; losing a touch must never fail the request
    // Keep the cookie's own expiry in sync with the extended session.
    if (shouldSlide && res) {
      res.cookie(authConfig.cookieName, token, { ...cookieOptions(), expires: expiresAt });
    }
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    emailVerified: session.user.emailVerified,
    isGuest: session.user.isGuest,
    role: session.user.role,
  };
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[authConfig.cookieName];
  if (token && typeof token === 'string') {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  res.clearCookie(authConfig.cookieName, cookieOptions());
}

// Invalidate every session for a user (used after a password reset/change).
export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
