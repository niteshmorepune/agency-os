import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { serviceKeyAuth } from '../middleware/service-key.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import * as ctrl from '../controllers/client.controller';
import { Role } from '@agencyos/shared';
import { sendActionItemEmail, sendMessageEmail } from '../services/email.service';
import crypto from 'crypto';
import { sendOnboardingEmail } from '../services/email.service';
import goalsRouter from './goals.routes';

const router = Router();

// POST /api/clients also accepts a service key from the CRM (deal-won provisioning).
// All other routes require a normal session. serviceKeyAuth resolves as OWNER so
// requireRole checks below are satisfied for service-key callers automatically.
const serviceKeyOrAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  if (req.headers['x-service-key']) {
    void serviceKeyAuth(req, res, next);
  } else {
    authenticate(req, res, next);
  }
};

router.use(serviceKeyOrAuthenticate);

router.get('/', asyncHandler(ctrl.listClients));
router.post('/', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(ctrl.createClient));
router.get('/:id', asyncHandler(ctrl.getClient));
router.put('/:id', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(ctrl.updateClient));
router.delete('/:id', requireRole(Role.OWNER), asyncHandler(ctrl.deleteClient));
router.post('/:id/assign',  requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(ctrl.assignTeamMember));
router.delete('/:id/assign', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(ctrl.removeTeamMember));
router.get('/:id/dashboard', asyncHandler(ctrl.getClientDashboard));

// Monthly delivery metrics for a date range — used by the NEDS CRM's monthly
// wins note (server-to-server, X-Service-Key) to fold real marketing-delivery
// numbers into its own staff-facing summary. Mirrors the same three counts the
// weekly client digest already computes (see services/ai/digest.ts /
// lib/scheduler.ts runWeeklyClientDigests), just parameterized by date range
// instead of a hardcoded week.
router.get('/:id/monthly-metrics', asyncHandler(async (req, res) => {
  const schema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  });
  const { from, to } = schema.parse(req.query);
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const client = await prisma.client.findFirst({
    where: { id: req.params.id, agencyId: req.user!.agencyId },
    select: { id: true },
  });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }

  const [postsPublished, auditsCompleted, actionItemsDone] = await Promise.all([
    prisma.postDraft.count({ where: { clientId: client.id, status: 'PUBLISHED', updatedAt: { gte: fromDate, lte: toDate } } }),
    prisma.auditProject.count({ where: { clientId: client.id, status: 'COMPLETED', updatedAt: { gte: fromDate, lte: toDate } } }),
    prisma.clientActionItem.count({ where: { clientId: client.id, status: 'COMPLETED', updatedAt: { gte: fromDate, lte: toDate } } }),
  ]);

  res.json({ data: { postsPublished, auditsCompleted, actionItemsDone } });
}));

// ─── Action Items ─────────────────────────────────────────────────────────────

router.get('/:id/action-items', asyncHandler(async (req, res) => {
  const items = await prisma.clientActionItem.findMany({
    where: { clientId: req.params.id, agencyId: req.user!.agencyId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: items });
}));

router.post('/:id/action-items', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    dueDate: z.string().datetime().optional(),
  });
  const { title, description, dueDate } = schema.parse(req.body);
  const dueDateObj = dueDate ? new Date(dueDate) : undefined;
  const [item, client] = await Promise.all([
    prisma.clientActionItem.create({
      data: {
        agencyId: req.user!.agencyId,
        clientId: req.params.id,
        title,
        description,
        dueDate: dueDateObj,
        createdById: req.user!.userId,
      },
    }),
    prisma.client.findFirst({
      where: { id: req.params.id, agencyId: req.user!.agencyId },
      select: { contactEmail: true, contactName: true, name: true },
    }),
  ]);
  if (client?.contactEmail) {
    sendActionItemEmail({
      agencyId: req.user!.agencyId,
      clientEmail: client.contactEmail,
      clientName: client.contactName ?? client.name,
      title,
      description,
      dueDate: dueDateObj,
    }).catch(() => null);
  }
  res.status(201).json({ data: item });
}));

router.put('/action-items/:itemId', asyncHandler(async (req, res) => {
  const schema = z.object({
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    completedNote: z.string().max(1000).optional(),
  });
  const data = schema.parse(req.body);
  const item = await prisma.clientActionItem.update({
    where: { id: req.params.itemId, agencyId: req.user!.agencyId },
    data: {
      ...data,
      dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
      completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
    },
  });
  res.json({ data: item });
}));

router.delete('/action-items/:itemId', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  await prisma.clientActionItem.delete({
    where: { id: req.params.itemId, agencyId: req.user!.agencyId },
  });
  res.json({ data: { ok: true } });
}));

// ─── Messages ─────────────────────────────────────────────────────────────────

router.get('/:id/messages', asyncHandler(async (req, res) => {
  const { page = '1' } = req.query as Record<string, string>;
  const take = 50;
  const skip = (parseInt(page) - 1) * take;
  const messages = await prisma.clientMessage.findMany({
    where: { clientId: req.params.id, agencyId: req.user!.agencyId },
    orderBy: { createdAt: 'asc' },
    skip,
    take,
  });
  res.json({ data: messages });
}));

router.post('/:id/messages', asyncHandler(async (req, res) => {
  const schema = z.object({ body: z.string().min(1).max(5000) });
  const { body } = schema.parse(req.body);

  const sender = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true } });
  const msg = await prisma.clientMessage.create({
    data: {
      agencyId: req.user!.agencyId,
      clientId: req.params.id,
      senderId: req.user!.userId,
      senderRole: req.user!.role,
      senderName: sender?.name ?? 'Team',
      body,
    },
  });

  sendMessageEmail({ agencyId: req.user!.agencyId, clientId: req.params.id, senderRole: req.user!.role, body }).catch(() => null);

  res.status(201).json({ data: msg });
}));

router.put('/:id/messages/read', asyncHandler(async (req, res) => {
  await prisma.clientMessage.updateMany({
    where: { clientId: req.params.id, agencyId: req.user!.agencyId, isRead: false },
    data: { isRead: true },
  });
  res.json({ data: { ok: true } });
}));

// ─── Onboarding ───────────────────────────────────────────────────────────────

router.post('/:id/onboarding/send-link', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.id, agencyId: req.user!.agencyId },
    select: { id: true, name: true, contactEmail: true },
  });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
  if (!client.contactEmail) { res.status(400).json({ error: 'Client has no contact email configured' }); return; }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.onboardingToken.upsert({
    where: { clientId: client.id },
    create: { clientId: client.id, token, expiresAt },
    update: { token, expiresAt, usedAt: null },
  });

  await sendOnboardingEmail({ agencyId: req.user!.agencyId, clientName: client.name, contactEmail: client.contactEmail, token }).catch(() => null);

  res.json({ data: { sent: true, expiresAt } });
}));

router.get('/:id/onboarding', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.id, agencyId: req.user!.agencyId },
    select: { onboardingData: true, onboardingCompletedAt: true, onboardingComplete: true },
  });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
  res.json({ data: client });
}));

// Goals — mounted under /:id so goalsRouter can read clientId from params
router.use('/:id', goalsRouter);

export default router;
