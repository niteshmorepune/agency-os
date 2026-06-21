import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { Role } from '@agencyos/shared';
import {
  sendPendingApprovalDigest,
  sendOverdueItemsDigest,
  sendInvoiceOverdueAlert,
} from '../services/email.service';

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

// "Today" command-center data — pending approvals, overdue items, today's schedule, client feedback, unread messages
router.get('/today', asyncHandler(async (req, res) => {
  const agencyId = req.user!.agencyId;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const [pendingApprovals, overdueItems, todayScheduled, clientFeedbackPosts, rawUnread] = await Promise.all([
    // Posts waiting for team approval, oldest first
    prisma.postDraft.findMany({
      where: { client: { agencyId }, approvalStatus: 'PENDING', status: { notIn: ['ARCHIVED', 'PUBLISHED'] } },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: {
        id: true, caption: true, platforms: true, scheduledAt: true,
        aiGenerated: true, clientReviewStatus: true, createdAt: true,
        client: { select: { id: true, name: true } },
      },
    }),

    // Overdue action items
    prisma.clientActionItem.findMany({
      where: { agencyId, status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: now } },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: {
        id: true, title: true, dueDate: true, status: true,
        clientId: true, client: { select: { name: true } },
      },
    }),

    // Posts scheduled for today
    prisma.postDraft.findMany({
      where: {
        client: { agencyId },
        status: 'SCHEDULED',
        scheduledAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true, caption: true, platforms: true, scheduledAt: true,
        approvalStatus: true, client: { select: { id: true, name: true } },
      },
    }),

    // Posts where client has requested changes (team needs to act)
    prisma.postDraft.findMany({
      where: {
        client: { agencyId },
        clientReviewStatus: 'CHANGES_REQUESTED',
        approvalStatus: 'PENDING',
        status: { notIn: ['ARCHIVED', 'PUBLISHED'] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true, caption: true, platforms: true, clientFeedback: true, updatedAt: true,
        client: { select: { id: true, name: true } },
      },
    }),

    // Unread messages sent by clients (team hasn't read yet)
    prisma.clientMessage.groupBy({
      by: ['clientId'],
      where: { agencyId, isRead: false, senderRole: 'CLIENT' },
      _count: { id: true },
    }),
  ]);

  // Resolve client names for unread message groups
  const msgClientIds = rawUnread.map(m => m.clientId);
  const msgClients = msgClientIds.length
    ? await prisma.client.findMany({
        where: { id: { in: msgClientIds }, agencyId },
        select: { id: true, name: true },
      })
    : [];
  const clientNameMap = Object.fromEntries(msgClients.map(c => [c.id, c.name]));

  const unreadMessages = rawUnread.map(m => ({
    clientId: m.clientId,
    clientName: clientNameMap[m.clientId] ?? 'Unknown',
    count: m._count.id,
  }));

  res.json({
    data: {
      pendingApprovals,
      overdueItems,
      todayScheduled,
      clientFeedback: clientFeedbackPosts,
      unreadMessages,
    },
  });
}));

// Team workload view — OWNER only
router.get('/workload', requireRole(Role.OWNER), asyncHandler(async (req, res) => {
  const agencyId = req.user!.agencyId;
  const now = new Date();

  // Get all agency users with their assigned clients
  const teamMembers = await prisma.user.findMany({
    where: { agencyId, isActive: true, role: { in: ['OWNER', 'ACCOUNT_MANAGER', 'CONTENT_CREATOR', 'SEO_ANALYST'] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      assignments: {
        select: {
          client: {
            select: { id: true, name: true, status: true },
          },
        },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  // For each member, aggregate workload metrics
  const workload = await Promise.all(teamMembers.map(async (member) => {
    const clientIds = member.assignments.map((a: { client: { id: string } }) => a.client.id);

    if (clientIds.length === 0) {
      return {
        ...member,
        clients: [],
        totals: { pendingApprovals: 0, openActionItems: 0, overdueInvoices: 0 },
      };
    }

    const [pendingApprovals, openActionItems, overdueInvoices] = await Promise.all([
      prisma.postDraft.count({
        where: { clientId: { in: clientIds }, approvalStatus: 'PENDING', status: { notIn: ['ARCHIVED', 'PUBLISHED'] } },
      }),
      prisma.clientActionItem.count({
        where: { clientId: { in: clientIds }, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      prisma.invoice.count({
        where: { clientId: { in: clientIds }, status: { in: ['SENT', 'OVERDUE'] }, dueDate: { lt: now } },
      }),
    ]);

    // Per-client breakdown
    const clients = await Promise.all(
      member.assignments.map(async ({ client }: { client: { id: string; name: string; status: string } }) => {
        const [cp, ca, ci] = await Promise.all([
          prisma.postDraft.count({
            where: { clientId: client.id, approvalStatus: 'PENDING', status: { notIn: ['ARCHIVED', 'PUBLISHED'] } },
          }),
          prisma.clientActionItem.count({
            where: { clientId: client.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
          }),
          prisma.invoice.count({
            where: { clientId: client.id, status: { in: ['SENT', 'OVERDUE'] }, dueDate: { lt: now } },
          }),
        ]);
        return { ...client, pendingApprovals: cp, openActionItems: ca, overdueInvoices: ci };
      })
    );

    return {
      ...member,
      clients,
      totals: { pendingApprovals, openActionItems, overdueInvoices },
    };
  }));

  res.json({ data: workload });
}));

// Manual trigger for smart alerts — OWNER only, useful for testing
router.post('/alerts/run', requireRole(Role.OWNER), asyncHandler(async (req, res) => {
  const agencyId = req.user!.agencyId;
  const now = new Date();
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const results: string[] = [];

  // 1. Pending approvals
  const stalePosts = await prisma.postDraft.findMany({
    where: { client: { agencyId }, approvalStatus: 'PENDING', status: { notIn: ['ARCHIVED', 'PUBLISHED'] }, createdAt: { lt: cutoff24h } },
    select: { id: true, caption: true, createdAt: true, client: { select: { name: true } } },
  });
  if (stalePosts.length > 0) {
    const recipients = await prisma.user.findMany({ where: { agencyId, role: { in: ['OWNER', 'ACCOUNT_MANAGER'] }, isActive: true }, select: { email: true } });
    if (recipients.length > 0) {
      await sendPendingApprovalDigest({
        agencyId,
        recipientEmails: recipients.map(r => r.email),
        posts: stalePosts.map(p => ({ id: p.id, caption: p.caption, clientName: p.client.name, hoursAgo: Math.floor((Date.now() - p.createdAt.getTime()) / 3_600_000) })),
      });
      results.push(`Pending approval digest sent (${stalePosts.length} posts)`);
    }
  } else {
    results.push('No pending approvals >24h');
  }

  // 2. Overdue action items
  const overdueItems = await prisma.clientActionItem.findMany({
    where: { agencyId, status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: now } },
    select: { id: true, title: true, dueDate: true, clientId: true, client: { select: { name: true } } },
  });
  if (overdueItems.length > 0) {
    const recipients = await prisma.user.findMany({ where: { agencyId, role: { in: ['OWNER', 'ACCOUNT_MANAGER'] }, isActive: true }, select: { email: true } });
    if (recipients.length > 0) {
      await sendOverdueItemsDigest({
        agencyId,
        recipientEmails: recipients.map(r => r.email),
        items: overdueItems.map(i => ({ title: i.title, clientName: i.client.name, clientId: i.clientId, dueDate: i.dueDate! })),
      });
      results.push(`Overdue items digest sent (${overdueItems.length} items)`);
    }
  } else {
    results.push('No overdue action items');
  }

  // 3. Overdue invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: { agencyId, status: 'SENT', dueDate: { lt: now } },
    select: { id: true, invoiceNumber: true, total: true, currency: true, dueDate: true, client: { select: { name: true } } },
  });
  if (overdueInvoices.length > 0) {
    await prisma.invoice.updateMany({ where: { id: { in: overdueInvoices.map(i => i.id) } }, data: { status: 'OVERDUE' } });
    const owner = await prisma.user.findFirst({ where: { agencyId, role: 'OWNER', isActive: true }, select: { email: true } });
    if (owner?.email) {
      await sendInvoiceOverdueAlert({
        agencyId,
        ownerEmail: owner.email,
        invoices: overdueInvoices.map(i => ({ id: i.id, invoiceNumber: i.invoiceNumber, clientName: i.client.name, total: i.total, currency: i.currency, dueDate: i.dueDate! })),
      });
      results.push(`Invoice overdue alert sent (${overdueInvoices.length} invoices, marked OVERDUE)`);
    }
  } else {
    results.push('No overdue invoices');
  }

  res.json({ message: 'Alert run complete', results });
}));

export default router;
