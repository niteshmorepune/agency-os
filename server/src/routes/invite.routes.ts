import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/asyncHandler';
import { acceptInvite } from '../services/auth.service';

const router = Router();

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

// GET /api/invite/:token — used by the accept-invite page to show who's
// being invited before asking them to set a password.
router.get('/:token', asyncHandler(async (req, res) => {
  const record = await prisma.passwordSetupToken.findUnique({
    where: { token: req.params.token },
    include: { user: { select: { name: true, email: true, role: true } } },
  });
  if (!record) { res.status(404).json({ error: 'Invalid invite link' }); return; }
  if (record.usedAt) { res.status(409).json({ error: 'This invite link has already been used' }); return; }
  if (record.expiresAt < new Date()) { res.status(410).json({ error: 'This invite link has expired. Ask your Owner to resend it.' }); return; }

  res.json({ data: { name: record.user.name, email: record.user.email, role: record.user.role } });
}));

const acceptSchema = z.object({ password: z.string().min(8) });

router.post('/:token', asyncHandler(async (req, res) => {
  const { password } = acceptSchema.parse(req.body);
  const { accessToken, refreshToken, user } = await acceptInvite(req.params.token, password);

  res.cookie('access_token', accessToken, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth/refresh' });

  res.json({ user: { id: user.userId, email: user.email, role: user.role, agencyId: user.agencyId } });
}));

export default router;
