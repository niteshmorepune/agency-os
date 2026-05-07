import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

router.get('/summary', asyncHandler(async (req, res) => {
  const agencyId = req.user!.agencyId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    clients,
    allPosts,
    thisMonthPosts,
    audits,
    optimizations,
    aiUsage,
    recentPosts,
  ] = await Promise.all([
    // Client counts
    prisma.client.findMany({
      where: { agencyId },
      select: { id: true, name: true, status: true },
    }),

    // All posts count by status
    prisma.postDraft.groupBy({
      by: ['status'],
      where: { client: { agencyId } },
      _count: true,
    }),

    // Posts created this month
    prisma.postDraft.count({
      where: { client: { agencyId }, createdAt: { gte: startOfMonth } },
    }),

    // Audit stats
    prisma.auditProject.findMany({
      where: { client: { agencyId } },
      select: { status: true, overallScore: true },
    }),

    // Platform optimization scores
    prisma.platformOptimization.findMany({
      where: { client: { agencyId }, score: { gt: 0 } },
      select: { platform: true, score: true, clientId: true, client: { select: { name: true } } },
    }),

    // AI usage this month
    prisma.aIUsageLog.aggregate({
      where: { user: { agencyId }, createdAt: { gte: startOfMonth } },
      _sum: { costUsd: true },
      _count: true,
    }),

    // Recent posts
    prisma.postDraft.findMany({
      where: { client: { agencyId } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        caption: true,
        platforms: true,
        status: true,
        approvalStatus: true,
        scheduledAt: true,
        createdAt: true,
        aiGenerated: true,
        createdBy: { select: { name: true } },
        client: { select: { name: true } },
      },
    }),
  ]);

  // Count AI cached calls
  const cachedCalls = await prisma.aIUsageLog.count({
    where: { user: { agencyId }, createdAt: { gte: startOfMonth }, cached: true },
  });

  // Build post status map
  const postsByStatus: Record<string, number> = {};
  for (const row of allPosts) {
    postsByStatus[row.status] = row._count;
  }

  // Audit stats
  const auditCompleted = audits.filter(a => a.status === 'COMPLETED');
  const avgAuditScore = auditCompleted.length > 0
    ? Math.round(auditCompleted.reduce((s, a) => s + (a.overallScore ?? 0), 0) / auditCompleted.length)
    : null;

  // Platform avg scores
  const byPlatform: Record<string, { total: number; count: number }> = {};
  for (const opt of optimizations) {
    byPlatform[opt.platform] ??= { total: 0, count: 0 };
    byPlatform[opt.platform].total += opt.score;
    byPlatform[opt.platform].count += 1;
  }
  const platformScores = Object.entries(byPlatform)
    .map(([platform, { total, count }]) => ({ platform, avgScore: Math.round(total / count), count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // Top clients by avg optimization score
  const byClient: Record<string, { name: string; total: number; count: number }> = {};
  for (const opt of optimizations) {
    byClient[opt.clientId] ??= { name: opt.client.name, total: 0, count: 0 };
    byClient[opt.clientId].total += opt.score;
    byClient[opt.clientId].count += 1;
  }
  const topClients = Object.entries(byClient)
    .map(([clientId, { name, total, count }]) => ({ clientId, name, avgScore: Math.round(total / count), platforms: count }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 8);

  const overallAvg = platformScores.length > 0
    ? Math.round(platformScores.reduce((s, p) => s + p.avgScore, 0) / platformScores.length)
    : 0;

  res.json({
    data: {
      clients: {
        total: clients.length,
        active: clients.filter(c => c.status === 'ACTIVE').length,
      },
      posts: {
        total: Object.values(postsByStatus).reduce((s, n) => s + n, 0),
        thisMonth: thisMonthPosts,
        byStatus: postsByStatus,
      },
      audits: {
        total: audits.length,
        inProgress: audits.filter(a => a.status === 'IN_PROGRESS').length,
        completed: auditCompleted.length,
        avgScore: avgAuditScore,
      },
      optimization: {
        overallAvg,
        platformScores,
        topClients,
      },
      aiUsage: {
        totalCost: aiUsage._sum.costUsd ?? 0,
        totalCalls: aiUsage._count,
        cachedCalls,
      },
      recentPosts,
    },
  });
}));

export default router;
