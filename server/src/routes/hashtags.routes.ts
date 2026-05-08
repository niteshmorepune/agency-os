import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const { clientId, platform } = z.object({
    clientId: z.string().optional(),
    platform: z.string().optional(),
  }).parse(req.query);

  const where: Record<string, unknown> = { client: { agencyId: req.user!.agencyId } };
  if (clientId) where.clientId = clientId;
  if (platform) where.platform = platform;

  const sets = await prisma.hashtagSet.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json({ data: sets });
}));

router.post('/', asyncHandler(async (req, res) => {
  const schema = z.object({
    clientId: z.string(),
    platform: z.string(),
    topic: z.string().min(1).max(200),
    niche: z.string().max(200).optional(),
    hashtags: z.array(z.string()).min(1).max(30),
  });
  const data = schema.parse(req.body);
  const client = await prisma.client.findFirst({ where: { id: data.clientId, agencyId: req.user!.agencyId } });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
  const set = await prisma.hashtagSet.create({
    data: { clientId: data.clientId, platform: data.platform as never, topic: data.topic, niche: data.niche, hashtags: data.hashtags },
  });
  res.status(201).json({ data: set });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const set = await prisma.hashtagSet.findFirst({ where: { id: req.params.id, client: { agencyId: req.user!.agencyId } } });
  if (!set) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.hashtagSet.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

export default router;
