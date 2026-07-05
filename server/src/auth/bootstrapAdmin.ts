import { prisma } from '../db.js';
import { authConfig } from './config.js';

// Promote the configured ADMIN_EMAIL account to admin on startup. The admin
// registers like any normal user; this runs every boot and reconciles the role
// once that account exists. We also force emailVerified so the admin can never
// be locked out by the verification gate. No-op when ADMIN_EMAIL is unset or the
// account has not been created yet.
export async function bootstrapAdmin(): Promise<void> {
  const email = authConfig.adminEmail;
  if (!email) return;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`[admin] ADMIN_EMAIL ${email} has no account yet; it will be promoted once registered.`);
    return;
  }

  if (user.role === 'admin' && user.emailVerified) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'admin', emailVerified: true },
  });
  console.log(`[admin] Promoted ${email} to admin.`);
}
