import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { encrypt } from '../lib/encryption';
import { testSocialConnection } from '../services/publisher.service';
import { Role } from '@agencyos/shared';
import { logActivity } from '../lib/activity';

const router = Router();
router.use(authenticate);

const connectSchema = z.object({
  clientId: z.string(),
  platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE']),
  accountName: z.string().min(1).max(200),
  accountId: z.string().min(1).max(500),
  accessToken: z.string().min(1),
  tokenExpiresAt: z.string().datetime().optional().nullable(),
});

// GET /api/social?clientId=:clientId — list accounts for a client
router.get('/', asyncHandler(async (req, res): Promise<void> => {
  const clientId = req.query.clientId as string | undefined;
  if (!clientId) {
    throw Object.assign(new Error('clientId query param required'), { statusCode: 400 });
  }

  const accounts = await prisma.socialAccount.findMany({
    where: { agencyId: req.user!.agencyId, clientId },
    select: {
      id: true,
      platform: true,
      accountName: true,
      accountId: true,
      isActive: true,
      tokenExpiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data: accounts });
}));

// POST /api/social/connect — save or update a social account
router.post('/connect', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const body = connectSchema.parse(req.body);

  // Verify client belongs to this agency
  const client = await prisma.client.findFirst({
    where: { id: body.clientId, agencyId: req.user!.agencyId },
    select: { id: true, name: true },
  });
  if (!client) throw Object.assign(new Error('Client not found'), { statusCode: 404 });

  const encryptedToken = encrypt(body.accessToken);

  const account = await prisma.socialAccount.upsert({
    where: {
      clientId_platform: { clientId: body.clientId, platform: body.platform as never },
    },
    create: {
      agencyId: req.user!.agencyId,
      clientId: body.clientId,
      platform: body.platform as never,
      accountName: body.accountName,
      accountId: body.accountId,
      accessToken: encryptedToken,
      tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
      isActive: true,
    },
    update: {
      accountName: body.accountName,
      accountId: body.accountId,
      accessToken: encryptedToken,
      tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
      isActive: true,
    },
    select: { id: true, platform: true, accountName: true, isActive: true },
  });

  await logActivity({
    agencyId: req.user!.agencyId,
    userId: req.user!.userId,
    action: 'social_account_connected',
    resourceType: 'SocialAccount',
    resourceId: account.id,
    metadata: { platform: body.platform, clientName: client.name, accountName: body.accountName },
  });

  res.status(201).json({ data: account });
}));

// DELETE /api/social/:id — disconnect a social account
router.delete('/:id', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const account = await prisma.socialAccount.findFirst({
    where: { id: req.params.id, agencyId: req.user!.agencyId },
  });
  if (!account) throw Object.assign(new Error('Account not found'), { statusCode: 404 });

  await prisma.socialAccount.delete({ where: { id: req.params.id } });

  res.json({ message: 'Disconnected' });
}));

// POST /api/social/:id/test — verify token still works
router.post('/:id/test', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const account = await prisma.socialAccount.findFirst({
    where: { id: req.params.id, agencyId: req.user!.agencyId },
  });
  if (!account) throw Object.assign(new Error('Account not found'), { statusCode: 404 });

  const result = await testSocialConnection(
    account.platform as string,
    account.accountId,
    account.accessToken
  );

  // Mark inactive if test fails
  if (!result.ok) {
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: { isActive: false },
    });
  } else if (!account.isActive) {
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: { isActive: true },
    });
  }

  res.json({ ok: result.ok, name: result.name, error: result.error });
}));

export default router;
