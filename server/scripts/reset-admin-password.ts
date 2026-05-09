/**
 * Run with: npx ts-node scripts/reset-admin-password.ts
 * Usage: EMAIL=you@example.com PASSWORD=NewPass123 npx ts-node scripts/reset-admin-password.ts
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;

  if (!email || !password) {
    console.error('Usage: EMAIL=you@example.com PASSWORD=NewPass123 npx ts-node scripts/reset-admin-password.ts');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { email },
    data: {
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  console.log(`Password reset successfully for ${email}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
