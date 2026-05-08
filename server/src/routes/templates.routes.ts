import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  platform: z.string().optional().nullable(),
  caption: z.string().min(1).max(5000),
  hashtags: z.array(z.string()).max(30).optional(),
  category: z.string().max(100).optional().nullable(),
});

router.get('/', asyncHandler(async (req, res) => {
  const { platform } = z.object({ platform: z.string().optional() }).parse(req.query);
  const where: Record<string, unknown> = { agencyId: req.user!.agencyId };
  if (platform) where.platform = platform;
  const templates = await prisma.postTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json({ data: templates });
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = templateSchema.parse(req.body);
  const template = await prisma.postTemplate.create({
    data: {
      agencyId: req.user!.agencyId,
      name: data.name,
      platform: (data.platform as never) ?? null,
      caption: data.caption,
      hashtags: data.hashtags ?? [],
      category: data.category ?? null,
    },
  });
  res.status(201).json({ data: template });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const t = await prisma.postTemplate.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!t) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.postTemplate.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

export default router;
