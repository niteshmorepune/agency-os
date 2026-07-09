import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';

import { authenticate, requireOwner, requireRole } from '../middleware/auth.middleware';
import { serviceKeyAuth } from '../middleware/service-key.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../services/auth.service';
import { sendTeamInviteEmail } from '../services/email.service';
import { Role } from '@agencyos/shared';

const router = Router();

// POST /api/users also accepts a service key from the CRM so it can create a
// CLIENT-role portal user on deal won. serviceKeyAuth resolves as OWNER, which
// satisfies requireOwner for all subsequent routes.
const serviceKeyOrAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  if (req.headers['x-service-key']) {
    void serviceKeyAuth(req, res, next);
  } else {
    authenticate(req, res, next);
  }
};

router.use(serviceKeyOrAuthenticate);

// Listing users is needed by Account Managers too (e.g. the "assign team
// member" picker on Client Detail, which POST /clients/:id/assign already
// permits for ACCOUNT_MANAGER) — only mutating routes below require OWNER.
router.get('/', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { agencyId: req.user!.agencyId },
    select: { id: true, email: true, name: true, role: true, avatarUrl: true, isActive: true, lastLoginAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: users });
}));

// Service-key callers (CRM) still create the user with an explicit password
// directly — that integration is unaffected by the invite-link flow below.
const serviceKeyCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['ACCOUNT_MANAGER', 'CONTENT_CREATOR', 'SEO_ANALYST', 'CLIENT']),
  password: z.string().min(8),
});

// Interactive Owner invites (Settings -> Team): no password is collected here.
// The user is created with an unusable random passwordHash and a one-time
// PasswordSetupToken is emailed via sendTeamInviteEmail; they set their own
// password at /accept-invite/:token (see invite.routes.ts). Inviting a CLIENT
// requires clientId so the portal ClientAssignment is created in the same
// request — without it the client has no client to view (see [[backlog]]).
const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['ACCOUNT_MANAGER', 'CONTENT_CREATOR', 'SEO_ANALYST', 'CLIENT']),
  clientId: z.string().optional(),
});

router.post('/', requireOwner, asyncHandler(async (req, res) => {
  if (req.headers['x-service-key']) {
    const { email, name, role, password } = serviceKeyCreateSchema.parse(req.body);
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name, role, passwordHash, agencyId: req.user!.agencyId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.status(201).json({ data: user });
    return;
  }

  const { email, name, role, clientId } = inviteSchema.parse(req.body);

  if (role === 'CLIENT' && !clientId) {
    res.status(400).json({ error: 'Select a client for a Client-role invite' });
    return;
  }
  if (clientId) {
    const client = await prisma.client.findFirst({ where: { id: clientId, agencyId: req.user!.agencyId }, select: { id: true } });
    if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
  }

  const placeholderHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, name, role, passwordHash: placeholderHash, agencyId: req.user!.agencyId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    await tx.passwordSetupToken.create({ data: { userId: created.id, token, expiresAt } });
    if (clientId) {
      await tx.clientAssignment.create({ data: { clientId, userId: created.id } });
    }
    return created;
  });

  await sendTeamInviteEmail({ agencyId: req.user!.agencyId, name, email, role, token }).catch(() => null);

  res.status(201).json({ data: user });
}));

router.put('/:id', requireOwner, asyncHandler(async (req, res) => {
  if (req.params.id === req.user!.userId) { res.status(400).json({ error: 'Cannot change your own role' }); return; }
  const schema = z.object({ name: z.string().min(1).optional(), role: z.enum(['OWNER', 'ACCOUNT_MANAGER', 'CONTENT_CREATOR', 'SEO_ANALYST', 'CLIENT']).optional(), isActive: z.boolean().optional() });
  const data = schema.parse(req.body);
  if (data.role !== undefined) {
    const target = await prisma.user.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId }, select: { role: true } });
    if (!target) { res.status(404).json({ error: 'User not found' }); return; }
    if (target.role === 'OWNER') { res.status(400).json({ error: 'Cannot change the role of another Owner' }); return; }
  }
  const user = await prisma.user.update({ where: { id: req.params.id, agencyId: req.user!.agencyId }, data, select: { id: true, email: true, name: true, role: true, isActive: true } });
  res.json({ data: user });
}));

router.delete('/:id', requireOwner, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ownerId = req.user!.userId;
  const agencyId = req.user!.agencyId;

  if (id === ownerId) { res.status(400).json({ error: 'Cannot delete yourself' }); return; }
  const target = await prisma.user.findFirst({ where: { id, agencyId } });
  if (!target) { res.status(404).json({ error: 'User not found' }); return; }
  if (target.role === 'OWNER') { res.status(400).json({ error: 'Cannot delete an Owner account' }); return; }

  // Reassign or remove all FK-referenced records so the user row can be deleted.
  // Business content (posts, audit notes) is reassigned to the owner rather than dropped.
  await prisma.$transaction([
    prisma.clientAssignment.deleteMany({ where: { userId: id } }),
    prisma.activityLog.deleteMany({ where: { userId: id } }),
    prisma.aIUsageLog.deleteMany({ where: { userId: id } }),
    prisma.postDraft.updateMany({ where: { approvedById: id }, data: { approvedById: null } }),
    prisma.postDraft.updateMany({ where: { createdById: id }, data: { createdById: ownerId } }),
    prisma.auditNote.updateMany({ where: { authorId: id }, data: { authorId: ownerId } }),
  ]);

  await prisma.user.delete({ where: { id } });
  res.json({ message: 'User deleted' });
}));

export default router;
