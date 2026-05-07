import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Platform } from '@agencyos/shared';
import * as optService from '../services/optimization.service';

const router = Router();
router.use(authenticate);

router.get('/:clientId', asyncHandler(async (req, res) => {
  const data = await optService.getAllOptimizations(req.params.clientId);
  res.json({ data });
}));

// Static sub-routes must come BEFORE /:clientId/:platform
router.get('/:clientId/action-items', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const data = await optService.getActionItems(req.params.clientId, req.user!, limit);
  res.json({ data });
}));

router.get('/:clientId/score-history', asyncHandler(async (req, res) => {
  const history = await prisma.platformScoreHistory.findMany({
    where: { optimization: { clientId: req.params.clientId } },
    orderBy: { recordedAt: 'asc' },
    include: { optimization: { select: { platform: true } } },
  });
  res.json({ data: history });
}));

router.get('/:clientId/:platform', asyncHandler(async (req, res) => {
  const platform = req.params.platform.toUpperCase() as Platform;
  const data = await optService.getOptimization(req.params.clientId, platform, req.user!);
  res.json({ data });
}));

router.put('/:clientId/:platform/check/:checkId', asyncHandler(async (req, res) => {
  const platform = req.params.platform.toUpperCase() as Platform;
  const schema = z.object({
    status: z.enum(['PENDING', 'PASS', 'WARN', 'FAIL', 'NA']).optional(),
    score: z.number().min(0).max(100).optional(),
    notes: z.string().max(2000).optional(),
    manualInput: z.string().max(5000).optional(),
  });
  const data = schema.parse(req.body);
  const result = await optService.updateCheck(req.params.clientId, platform, req.params.checkId, data, req.user!);
  res.json({ data: result });
}));

router.post('/:clientId/:platform/ai-suggest/:checkId', asyncHandler(async (req, res) => {
  const platform = req.params.platform.toUpperCase() as Platform;
  const result = await optService.getAISuggestion(req.params.clientId, platform, req.params.checkId, req.user!);
  res.json({ data: result });
}));

router.post('/:clientId/:platform/ai-suggest-all', asyncHandler(async (req, res) => {
  const platform = req.params.platform.toUpperCase() as Platform;
  const result = await optService.bulkAISuggestions(req.params.clientId, platform, req.user!);
  res.json({ data: result });
}));

export default router;
