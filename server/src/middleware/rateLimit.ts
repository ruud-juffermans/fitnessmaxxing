import type { Request, Response, NextFunction } from 'express';

// Minimal in-memory fixed-window rate limiter, keyed by client IP. Intended for
// lightly protecting a single unauthenticated, write-heavy endpoint (guest
// signup) against trivial abuse — not a substitute for an edge/CDN limiter in a
// multi-instance deployment, where each process keeps its own counters.
export function rateLimit({
  windowMs,
  max,
  message = 'Too many requests, please try again later.',
}: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({ error: message });
      return;
    }

    entry.count += 1;
    next();

    // Opportunistically evict stale windows so the map can't grow unbounded.
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
  };
}
