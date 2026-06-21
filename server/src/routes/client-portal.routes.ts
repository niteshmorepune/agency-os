import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { generateClientReport } from '../services/report.service';
import { PLATFORM_CHECKS } from '../lib/platformChecks';
import { sendContentReviewEmail } from '../services/email.service';
import { Role } from '@agencyos/shared';

const router = Router();
router.use(authenticate);

// Resolve the primary client for the logged-in user (CLIENT role or assigned staff)
async function resolveClientId(userId: string, agencyId: string): Promise<string | null> {
  const assignment = await prisma.clientAssignment.findFirst({
    where: { userId, client: { agencyId } },
    select: { clientId: true },
    orderBy: { createdAt: 'asc' },
  });
  return assignment?.clientId ?? null;
}

router.get('/summary', asyncHandler(async (req, res) => {
  const clientId = await resolveClientId(req.user!.userId, req.user!.agencyId);
  if (!clientId) {
    res.json({ data: null });
    return;
  }

  const [client, optimizations, lastAudit, recentPosts, agency] = await Promise.all([
    prisma.client.findFirst({
      where: { id: clientId, agencyId: req.user!.agencyId },
      select: { id: true, name: true, domain: true, industry: true, brandName: true, contactName: true, onboardingComplete: true },
    }),
    prisma.platformOptimization.findMany({
      where: { clientId, client: { agencyId: req.user!.agencyId } },
      select: { platform: true, score: true, updatedAt: true, _count: { select: { checks: true } } },
    }),
    prisma.auditProject.findFirst({
      where: { clientId, client: { agencyId: req.user!.agencyId } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, overallScore: true, status: true, createdAt: true },
    }),
    prisma.postDraft.findMany({
      where: { clientId, client: { agencyId: req.user!.agencyId }, approvalStatus: 'APPROVED', status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, caption: true, platforms: true, status: true, scheduledAt: true, createdAt: true, aiGenerated: true },
    }),
    prisma.agency.findUnique({
      where: { id: req.user!.agencyId },
      select: { name: true, primaryColor: true, accentColor: true, logoUrl: true, reportTagline: true },
    }),
  ]);

  // Top action items
  const failChecks = await prisma.platformCheck.findMany({
    where: { status: { in: ['FAIL', 'WARN'] }, optimization: { clientId } },
    include: { optimization: { select: { platform: true } } },
    take: 100,
  });
  const topActions = failChecks
    .map(c => {
      const defs = PLATFORM_CHECKS[c.optimization.platform] ?? [];
      const def = defs.find(d => d.id === c.checkId);
      return { name: def?.name ?? c.checkId, platform: c.optimization.platform, status: c.status, weight: def?.weight ?? 1 };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8);

  const activePlatforms = optimizations.filter(o => o.score > 0);
  const avgScore = activePlatforms.length > 0
    ? Math.round(activePlatforms.reduce((s, o) => s + o.score, 0) / activePlatforms.length)
    : 0;

  res.json({ data: { client, agency, optimizations, lastAudit, recentPosts, topActions, avgScore } });
}));

router.get('/report', asyncHandler(async (req, res) => {
  const schema = z.object({ clientId: z.string().optional() });
  const { clientId: qClientId } = schema.parse(req.query);

  const clientId = qClientId ?? await resolveClientId(req.user!.userId, req.user!.agencyId);
  if (!clientId) { res.status(404).json({ error: 'No assigned client found' }); return; }

  const pdf = await generateClientReport(clientId, req.user!);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="my-report.pdf"`);
  res.send(pdf);
}));

router.post('/onboarding/:clientId/complete', asyncHandler(async (req, res) => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.clientId, agencyId: req.user!.agencyId },
  });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
  const updated = await prisma.client.update({
    where: { id: req.params.clientId },
    data: { onboardingComplete: true },
  });
  res.json({ data: updated });
}));

// Posts available for client review (not ARCHIVED, not PUBLISHED)
router.get('/posts', asyncHandler(async (req, res) => {
  const clientId = await resolveClientId(req.user!.userId, req.user!.agencyId);
  if (!clientId) { res.json({ data: [] }); return; }

  const posts = await prisma.postDraft.findMany({
    where: {
      clientId,
      client: { agencyId: req.user!.agencyId },
      status: { notIn: ['ARCHIVED', 'PUBLISHED'] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      caption: true,
      platforms: true,
      hashtags: true,
      scheduledAt: true,
      status: true,
      approvalStatus: true,
      clientReviewStatus: true,
      clientFeedback: true,
      aiGenerated: true,
      createdAt: true,
    },
  });

  res.json({ data: posts });
}));

// Client reviews a post — approve or request changes
const reviewSchema = z.object({
  action: z.enum(['CLIENT_APPROVED', 'CHANGES_REQUESTED']),
  feedback: z.string().max(1000).optional(),
});

router.post('/posts/:id/review', asyncHandler(async (req, res) => {
  const { action, feedback } = reviewSchema.parse(req.body);

  const clientId = await resolveClientId(req.user!.userId, req.user!.agencyId);
  if (!clientId) { res.status(403).json({ error: 'No client assigned' }); return; }

  const post = await prisma.postDraft.findFirst({
    where: { id: req.params.id, clientId, client: { agencyId: req.user!.agencyId } },
    select: { id: true, caption: true, clientId: true },
  });
  if (!post) { res.status(404).json({ error: 'Post not found' }); return; }

  const updated = await prisma.postDraft.update({
    where: { id: req.params.id },
    data: {
      clientReviewStatus: action,
      clientFeedback: action === 'CHANGES_REQUESTED' ? (feedback ?? null) : null,
    },
  });

  // Notify assigned AM/Owner via email (best-effort)
  const client = await prisma.client.findFirst({
    where: { id: clientId },
    select: {
      name: true,
      assignments: {
        include: {
          user: { select: { email: true, role: true } },
        },
      },
    },
  });

  const amAssignment = client?.assignments.find(
    a => a.user.role === Role.ACCOUNT_MANAGER || a.user.role === Role.OWNER
  );
  if (amAssignment?.user?.email && client) {
    void sendContentReviewEmail({
      agencyId: req.user!.agencyId,
      amEmail: amAssignment.user.email,
      clientName: client.name,
      action,
      caption: post.caption,
      feedback,
      postId: post.id,
    });
  }

  res.json({ data: updated });
}));

export default router;
