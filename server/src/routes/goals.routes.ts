import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { Role } from '@agencyos/shared';

const router = Router({ mergeParams: true });
router.use(authenticate);

const goalSchema = z.object({
  title: z.string().min(1).max(300),
  targetValue: z.number().positive(),
  currentValue: z.number().min(0).optional().default(0),
  unit: z.string().max(50).optional().default(''),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
});

// GET /api/clients/:clientId/goals
router.get('/', asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const month = req.query.month as string | undefined;

  const goals = await prisma.clientGoal.findMany({
    where: {
      clientId,
      client: { agencyId: req.user!.agencyId },
      isArchived: false,
      ...(month ? { month } : {}),
    },
    orderBy: [{ month: 'desc' }, { createdAt: 'asc' }],
  });
  res.json({ data: goals });
}));

// POST /api/clients/:clientId/goals
router.post('/', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: req.user!.agencyId },
  });
  if (!client) throw Object.assign(new Error('Client not found'), { statusCode: 404 });

  const body = goalSchema.parse(req.body);
  const goal = await prisma.clientGoal.create({
    data: { ...body, clientId, agencyId: req.user!.agencyId },
  });
  res.status(201).json({ data: goal });
}));

// PUT /api/clients/goals/:goalId — update progress or details
router.put('/goals/:goalId', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const goal = await prisma.clientGoal.findFirst({
    where: { id: req.params.goalId, agencyId: req.user!.agencyId },
  });
  if (!goal) throw Object.assign(new Error('Goal not found'), { statusCode: 404 });

  const body = goalSchema.partial().parse(req.body);
  const updated = await prisma.clientGoal.update({
    where: { id: req.params.goalId },
    data: body,
  });
  res.json({ data: updated });
}));

// DELETE /api/clients/goals/:goalId
router.delete('/goals/:goalId', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const goal = await prisma.clientGoal.findFirst({
    where: { id: req.params.goalId, agencyId: req.user!.agencyId },
  });
  if (!goal) throw Object.assign(new Error('Goal not found'), { statusCode: 404 });

  await prisma.clientGoal.update({
    where: { id: req.params.goalId },
    data: { isArchived: true },
  });
  res.json({ message: 'Goal removed' });
}));

export default router;
