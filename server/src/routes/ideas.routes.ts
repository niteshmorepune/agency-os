import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import DOMPurify from 'isomorphic-dompurify';

const router = Router();
router.use(authenticate);

function sanitize(s: string) {
  return DOMPurify.sanitize(s, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

const ideaSchema = z.object({
  clientId: z.string(),
  platform: z.string(),
  title: z.string().min(1).max(500),
  format: z.string().min(1).max(100),
  hook: z.string().max(500).optional().default(''),
  outline: z.string().max(2000).optional().default(''),
});

router.get('/', asyncHandler(async (req, res) => {
  const { clientId, platform, status } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { client: { agencyId: req.user!.agencyId } };
  if (clientId) where.clientId = clientId;
  if (platform) where.platform = platform;
  if (status) where.status = status;
  const ideas = await prisma.contentIdea.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { client: { select: { name: true } } },
  });
  res.json({ data: ideas });
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = ideaSchema.parse(req.body);
  const client = await prisma.client.findFirst({ where: { id: data.clientId, agencyId: req.user!.agencyId } });
  if (!client) { res.status(403).json({ error: 'Forbidden' }); return; }
  const idea = await prisma.contentIdea.create({
    data: {
      clientId: data.clientId,
      platform: data.platform as never,
      title: sanitize(data.title),
      format: sanitize(data.format),
      hook: sanitize(data.hook ?? ''),
      outline: sanitize(data.outline ?? ''),
    },
  });
  res.status(201).json({ data: idea });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const schema = z.object({
    status: z.enum(['SAVED', 'USED', 'REJECTED']).optional(),
    usedInPost: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const idea = await prisma.contentIdea.findFirst({
    where: { id: req.params.id, client: { agencyId: req.user!.agencyId } },
  });
  if (!idea) { res.status(404).json({ error: 'Idea not found' }); return; }
  const updated = await prisma.contentIdea.update({ where: { id: req.params.id }, data });
  res.json({ data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const idea = await prisma.contentIdea.findFirst({
    where: { id: req.params.id, client: { agencyId: req.user!.agencyId } },
  });
  if (!idea) { res.status(404).json({ error: 'Idea not found' }); return; }
  await prisma.contentIdea.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}));

export default router;
