import type { Request, Response, NextFunction } from 'express';
import { getSessionUser, type SessionUser } from '../auth/session.js';

// Augment Express's Request so handlers can read the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

// Gate a route: require a valid session whose user has a verified email.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getSessionUser(req, res);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!user.emailVerified) {
      res.status(403).json({ error: 'Email not verified' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Gate a route to admins only. Must run after requireAuth, which populates
// req.user; returns 403 for any non-admin (and 401 if used without requireAuth).
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
