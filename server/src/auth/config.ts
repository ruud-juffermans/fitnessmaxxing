// Centralised auth configuration, all overridable via environment variables.

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const authConfig = {
  // How long a login session stays valid. Sessions slide: activity past the
  // halfway point extends them by a full TTL again (see auth/session.ts).
  sessionTtlMs: int('SESSION_TTL_DAYS', 30) * 24 * 60 * 60 * 1000,
  // Email verification links.
  verificationTtlMs: int('EMAIL_VERIFICATION_TTL_HOURS', 24) * 60 * 60 * 1000,
  // Password reset links (kept short on purpose).
  passwordResetTtlMs: int('PASSWORD_RESET_TTL_MINUTES', 60) * 60 * 1000,
  // How long an INACTIVE un-converted guest account is kept before the
  // maintenance job deletes it (and its data) — see jobs/maintenance.ts.
  // Activity is measured via Session.lastUsedAt, so guests who keep using the
  // app are never purged.
  guestTtlMs: int('GUEST_TTL_DAYS', 7) * 24 * 60 * 60 * 1000,
  bcryptRounds: int('BCRYPT_ROUNDS', 12),
  cookieName: process.env.SESSION_COOKIE_NAME ?? 'fitnessmaxxing_session',
  // SameSite policy for the session cookie. 'lax' is the safe default and works
  // for same-site setups (incl. different ports in dev). Use 'none' (requires
  // HTTPS) when the API and client are served from different sites in prod.
  cookieSameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none' | undefined) ?? 'lax',
  // Force the Secure flag regardless of NODE_ENV (needed when SameSite=None).
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  // Base URL of the frontend, used to build links in emails.
  appUrl: (process.env.APP_URL ?? 'http://localhost:3002').replace(/\/$/, ''),
  // The single account promoted to admin on startup (see bootstrapAdmin). Unset
  // means no admin is provisioned automatically.
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() || null,
  isProd: process.env.NODE_ENV === 'production',
};
