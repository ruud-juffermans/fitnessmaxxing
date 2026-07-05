import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

// We hand the raw token to the user (in a cookie or email link) and only store
// its SHA-256 hash. A database leak therefore does not expose usable tokens.

export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Constant-time comparison of two hex digests of equal length.
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
