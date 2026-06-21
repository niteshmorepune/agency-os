import { Request, Response } from 'express';
import { z } from 'zod';
import { login, refresh, logout } from '../services/auth.service';
import { prisma } from '../lib/prisma';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);
  const { accessToken, refreshToken, user } = await login(email, password);

  res.cookie('access_token', accessToken, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth/refresh' });

  res.json({ user: { id: user.userId, email: user.email, role: user.role, agencyId: user.agencyId } });
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refresh_token;
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }
  const { accessToken, refreshToken } = await refresh(token);
  res.cookie('access_token', accessToken, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth/refresh' });
  res.json({ message: 'Token refreshed' });
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refresh_token;
  if (token) await logout(token);
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
  res.json({ message: 'Logged out' });
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, role: true, agencyId: true, avatarUrl: true, lastLoginAt: true, teamOnboardingAt: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ data: user });
}
