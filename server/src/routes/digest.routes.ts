import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { generateDigest } from '../services/ai/digest';
import { sendDigestEmail } from '../services/email.service';
import { Role } from '@agencyos/shared';

const router = Router();
router.use(authenticate);
router.use(requireRole(Role.OWNER, Role.ACCOUNT_MANAGER));

// Get latest digest
router.get('/latest', asyncHandler(async (req, res) => {
  const digest = await prisma.agencyDigest.findFirst({
    where: { agencyId: req.user!.agencyId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: digest ?? null });
}));

// Generate new digest
router.post('/generate', asyncHandler(async (req, res) => {
  const { content, weekLabel, id } = await generateDigest(req.user!);
  res.json({ data: { id, content, weekLabel } });
}));

// Email digest to Owner
router.post('/email', requireRole(Role.OWNER), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { email: true, name: true },
  });
  if (!user?.email) { res.status(400).json({ error: 'User email not found' }); return; }

  const latest = await prisma.agencyDigest.findFirst({
    where: { agencyId: req.user!.agencyId },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) { res.status(404).json({ error: 'No digest generated yet. Generate one first.' }); return; }

  await sendDigestEmail({
    agencyId: req.user!.agencyId,
    ownerEmail: user.email,
    ownerName: user.name,
    weekLabel: latest.weekLabel,
    digestHtml: latest.content,
  });

  res.json({ message: 'Digest emailed successfully' });
}));

export default router;
