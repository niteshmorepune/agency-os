import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, getRefreshExpiry } from '../lib/jwt';
import { JwtPayload, Role } from '@agencyos/shared';
import { logger } from '../lib/logger';

const LOCK_THRESHOLD = 10;
const LOCK_DURATION_MS = 30 * 60 * 1000;

export async function login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: JwtPayload }> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw Object.assign(new Error('Account temporarily locked. Try again later.'), { statusCode: 429 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const newCount = user.failedLoginCount + 1;
    const lockedUntil = newCount >= LOCK_THRESHOLD ? new Date(Date.now() + LOCK_DURATION_MS) : undefined;
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: newCount, lockedUntil } });
    logger.warn({ msg: 'Failed login attempt', email, count: newCount });
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const payload: JwtPayload = { userId: user.id, agencyId: user.agencyId, role: user.role as Role, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshExpiry(),
    },
  });

  logger.info({ msg: 'User logged in', userId: user.id });
  return { accessToken, refreshToken, user: payload };
}

export async function refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { userId } = verifyRefreshToken(token);
  const tokenHash = hashToken(token);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = stored.user;
  const payload: JwtPayload = { userId: user.id, agencyId: user.agencyId, role: user.role as Role, email: user.email };
  const newAccess = signAccessToken(payload);
  const newRefresh = signRefreshToken({ userId });

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(newRefresh), expiresAt: getRefreshExpiry() },
  });

  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function logout(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
