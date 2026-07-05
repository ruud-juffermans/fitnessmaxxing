import nodemailer, { type Transporter } from 'nodemailer';
import { authConfig } from './config.js';

// Build a transport from SMTP_* env vars. When none are configured (typical in
// local dev) we fall back to logging the message — including the action link —
// to the server console so the flow can be exercised end to end without a real
// mail server.

let cachedTransport: Transporter | null = null;
let transportIsReal = false;

function getTransport(): Transporter | null {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  if (!host) {
    transportIsReal = false;
    return null;
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  transportIsReal = true;
  return cachedTransport;
}

const from = process.env.MAIL_FROM ?? 'fitnessmaxxing <no-reply@fitnessmaxxing.local>';

async function send(to: string, subject: string, html: string, text: string): Promise<void> {
  const transport = getTransport();
  if (!transport || !transportIsReal) {
    // Dev fallback: surface the message (and its link) on the console.
    console.log('\n──────── ✉️  email (dev console fallback) ────────');
    console.log(`to:      ${to}`);
    console.log(`subject: ${subject}`);
    console.log(text);
    console.log('─────────────────────────────────────────────────\n');
    return;
  }
  await transport.sendMail({ from, to, subject, html, text });
}

function layout(title: string, body: string, button: { label: string; url: string }): string {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f172a;padding:32px;color:#e2e8f0">
  <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:20px">${title}</h1>
    <p style="line-height:1.6;color:#cbd5e1">${body}</p>
    <p style="margin:28px 0">
      <a href="${button.url}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${button.label}</a>
    </p>
    <p style="font-size:13px;color:#94a3b8;line-height:1.6">If the button doesn't work, copy this link:<br>
      <a href="${button.url}" style="color:#fb923c;word-break:break-all">${button.url}</a></p>
  </div></body></html>`;
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${authConfig.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await send(
    to,
    'Verify your fitnessmaxxing email',
    layout(
      'Confirm your email',
      'Thanks for signing up for fitnessmaxxing. Confirm this email address to activate your account.',
      { label: 'Verify email', url },
    ),
    `Confirm your fitnessmaxxing email by visiting:\n${url}\n\nThis link expires in 24 hours.`,
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${authConfig.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await send(
    to,
    'Reset your fitnessmaxxing password',
    layout(
      'Reset your password',
      'We received a request to reset your password. Click below to choose a new one. If you did not request this, you can safely ignore this email.',
      { label: 'Reset password', url },
    ),
    `Reset your fitnessmaxxing password by visiting:\n${url}\n\nThis link expires in 60 minutes. If you did not request this, ignore this email.`,
  );
}
