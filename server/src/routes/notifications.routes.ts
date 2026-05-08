import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.userId, agencyId: req.user!.agencyId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.notification.count({
      where: { userId: req.user!.userId, agencyId: req.user!.agencyId, read: false },
    }),
  ]);
  res.json({ data: notifications, unreadCount });
}));

router.patch('/read-all', asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, agencyId: req.user!.agencyId, read: false },
    data: { read: true },
  });
  res.json({ ok: true });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.userId },
    data: { read: true },
  });
  res.json({ ok: true });
}));

export default router;
