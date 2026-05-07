import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { Role } from '@agencyos/shared';
import DOMPurify from 'isomorphic-dompurify';

const router = Router();
router.use(authenticate);

const postSchema = z.object({
  clientId: z.string(),
  platforms: z.array(z.string()).min(1),
  caption: z.string().min(1).max(5000),
  hashtags: z.array(z.string()).optional(),
  mediaUrls: z.array(z.string()).optional(),
  altTexts: z.array(z.string()).optional(),
  platformOverrides: z.record(z.object({ caption: z.string(), hashtags: z.array(z.string()) })).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional(),
  aiGenerated: z.boolean().optional(),
});

function sanitize(s: string) {
  return DOMPurify.sanitize(s, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

router.get('/', asyncHandler(async (req, res) => {
  const { clientId, status, platform, page = '1', limit = '20' } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { client: { agencyId: req.user!.agencyId } };
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;
  if (platform) where.platforms = { has: platform };
  const take = Math.min(parseInt(limit), 100);
  const skip = (parseInt(page) - 1) * take;
  const [posts, total] = await Promise.all([
    prisma.postDraft.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { name: true } } } }),
    prisma.postDraft.count({ where }),
  ]);
  res.json({ data: posts, pagination: { page: parseInt(page), limit: take, total, totalPages: Math.ceil(total / take) } });
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = postSchema.parse(req.body);
  const post = await prisma.postDraft.create({
    data: {
      clientId: data.clientId,
      createdById: req.user!.userId,
      platforms: data.platforms as never,
      caption: sanitize(data.caption),
      hashtags: data.hashtags ?? [],
      mediaUrls: data.mediaUrls ?? [],
      altTexts: data.altTexts ?? [],
      platformOverrides: data.platformOverrides,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      notes: sanitize(data.notes ?? ''),
      aiGenerated: data.aiGenerated ?? false,
    },
  });
  res.status(201).json({ data: post });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const post = await prisma.postDraft.findFirst({ where: { id: req.params.id, client: { agencyId: req.user!.agencyId } }, include: { createdBy: { select: { name: true, avatarUrl: true } } } });
  if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
  res.json({ data: post });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const data = postSchema.partial().parse(req.body);
  const post = await prisma.postDraft.findFirst({ where: { id: req.params.id, client: { agencyId: req.user!.agencyId } } });
  if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
  const updated = await prisma.postDraft.update({
    where: { id: req.params.id },
    data: {
      ...data,
      caption: data.caption ? sanitize(data.caption) : undefined,
      notes: data.notes !== undefined ? sanitize(data.notes) : undefined,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : data.scheduledAt === null ? null : undefined,
      platforms: data.platforms as never,
    },
  });
  res.json({ data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const post = await prisma.postDraft.findFirst({ where: { id: req.params.id, client: { agencyId: req.user!.agencyId } } });
  if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
  await prisma.postDraft.update({ where: { id: req.params.id }, data: { status: 'ARCHIVED' } });
  res.json({ message: 'Post archived' });
}));

router.post('/:id/approve', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const post = await prisma.postDraft.findFirst({ where: { id: req.params.id, client: { agencyId: req.user!.agencyId } } });
  if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
  const updated = await prisma.postDraft.update({ where: { id: req.params.id }, data: { approvalStatus: 'APPROVED', approvedById: req.user!.userId } });
  res.json({ data: updated });
}));

router.post('/:id/reject', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const post = await prisma.postDraft.findFirst({ where: { id: req.params.id, client: { agencyId: req.user!.agencyId } } });
  if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
  const updated = await prisma.postDraft.update({ where: { id: req.params.id }, data: { approvalStatus: 'REJECTED' } });
  res.json({ data: updated });
}));

export default router;
