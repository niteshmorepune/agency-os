import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { loginHandler, refreshHandler, logoutHandler, meHandler } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../services/auth.service';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

router.post('/login', loginLimiter, asyncHandler(loginHandler));
router.post('/refresh', asyncHandler(refreshHandler));
router.post('/logout', asyncHandler(logoutHandler));
router.get('/me', authenticate, asyncHandler(meHandler));

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
}).refine(d => !d.newPassword || d.currentPassword, { message: 'Current password required to set a new password', path: ['currentPassword'] });

router.patch('/profile', authenticate, asyncHandler(async (req, res) => {
  const data = profileSchema.parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });

  if (data.newPassword) {
    const valid = await verifyPassword(data.currentPassword!, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.newPassword) updateData.passwordHash = await hashPassword(data.newPassword);

  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: updateData,
    select: { id: true, email: true, name: true, role: true, agencyId: true, avatarUrl: true },
  });
  res.json({ data: updated });
}));

// Mark team onboarding complete for current user
router.post('/complete-onboarding', authenticate, asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { teamOnboardingAt: new Date() },
  });
  res.json({ message: 'Onboarding marked complete' });
}));

export default router;
