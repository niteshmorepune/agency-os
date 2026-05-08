import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { Role } from '@agencyos/shared';

const router = Router();
router.use(authenticate);
router.use(requireRole(Role.OWNER, Role.ACCOUNT_MANAGER));

router.get('/', asyncHandler(async (req, res) => {
  const { action, userId, limit = '100' } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { agencyId: req.user!.agencyId };
  if (action) where.action = action;
  if (userId) where.userId = userId;
  const take = Math.min(parseInt(limit), 200);

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    include: { user: { select: { name: true, avatarUrl: true, role: true } } },
  });
  res.json({ data: logs });
}));

export default router;
