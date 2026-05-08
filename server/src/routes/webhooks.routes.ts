import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { deliverWebhook, WEBHOOK_EVENTS } from '../services/webhook.service';
import { Role } from '@agencyos/shared';

const router = Router();
router.use(authenticate);
router.use(requireRole(Role.OWNER));

const webhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  isActive: z.boolean().optional(),
});

// List
router.get('/', asyncHandler(async (req, res) => {
  const webhooks = await prisma.webhook.findMany({
    where: { agencyId: req.user!.agencyId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: webhooks });
}));

// Create
router.post('/', asyncHandler(async (req, res) => {
  const data = webhookSchema.parse(req.body);
  const secret = crypto.randomBytes(24).toString('hex');
  const webhook = await prisma.webhook.create({
    data: {
      agencyId: req.user!.agencyId,
      name: data.name,
      url: data.url,
      events: data.events,
      secret,
      isActive: data.isActive ?? true,
    },
  });
  res.status(201).json({ data: webhook });
}));

// Update
router.put('/:id', asyncHandler(async (req, res) => {
  const webhook = await prisma.webhook.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!webhook) { res.status(404).json({ error: 'Webhook not found' }); return; }
  const data = webhookSchema.partial().parse(req.body);
  const updated = await prisma.webhook.update({ where: { id: req.params.id }, data });
  res.json({ data: updated });
}));

// Regenerate secret
router.post('/:id/rotate-secret', asyncHandler(async (req, res) => {
  const webhook = await prisma.webhook.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!webhook) { res.status(404).json({ error: 'Webhook not found' }); return; }
  const secret = crypto.randomBytes(24).toString('hex');
  const updated = await prisma.webhook.update({ where: { id: req.params.id }, data: { secret } });
  res.json({ data: updated });
}));

// Delete
router.delete('/:id', asyncHandler(async (req, res) => {
  const webhook = await prisma.webhook.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!webhook) { res.status(404).json({ error: 'Webhook not found' }); return; }
  await prisma.webhook.delete({ where: { id: req.params.id } });
  res.json({ message: 'Webhook deleted' });
}));

// Send test delivery
router.post('/:id/test', asyncHandler(async (req, res) => {
  const webhook = await prisma.webhook.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!webhook) { res.status(404).json({ error: 'Webhook not found' }); return; }
  await deliverWebhook({
    agencyId: req.user!.agencyId,
    event: 'post.approved',
    payload: { test: true, message: 'This is a test delivery from Agency OS', webhookId: webhook.id },
  });
  res.json({ message: 'Test delivery sent' });
}));

// List supported events
router.get('/events', asyncHandler(async (_req, res) => {
  res.json({ data: WEBHOOK_EVENTS });
}));

export default router;
