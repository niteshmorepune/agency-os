import cron from 'node-cron';
import { prisma } from './prisma';
import { logger } from './logger';
import {
  sendPendingApprovalDigest,
  sendOverdueItemsDigest,
  sendInvoiceOverdueAlert,
  sendClientReport,
} from '../services/email.service';
import { generateClientReport } from '../services/report.service';
import {
  publishToFacebook,
  publishToInstagram,
  publishToLinkedIn,
} from '../services/publisher.service';
import { sendClientDigestEmail } from '../services/email.service';
import { runAITool } from '../services/ai/client';
import { generateAndSaveTrendIdeas } from '../services/ai/trendIdeas';

export function startScheduler(): void {
  // Auto-publish scheduled posts — every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    runAutoPublish().catch(err => logger.error({ msg: 'Auto-publish run failed', err }));
  });

  // Daily alerts at 9:00 AM IST = 03:30 UTC
  cron.schedule('30 3 * * *', () => {
    logger.info({ msg: 'Scheduler: running daily smart alerts' });
    runDailyAlerts().catch(err => logger.error({ msg: 'Daily alerts failed', err }));
  });

  // Monthly reports on the 1st of each month at 8:00 AM IST = 02:30 UTC
  cron.schedule('30 2 1 * *', () => {
    logger.info({ msg: 'Scheduler: running monthly report emails' });
    runMonthlyReports().catch(err => logger.error({ msg: 'Monthly reports failed', err }));
  });

  // Weekly per-client digest — every Sunday at 8:00 PM IST = 14:30 UTC
  cron.schedule('30 14 * * 0', () => {
    logger.info({ msg: 'Scheduler: running weekly client digests' });
    runWeeklyClientDigests().catch(err => logger.error({ msg: 'Weekly client digests failed', err }));
  });

  // Weekly AI trend ideas — every Monday at 9:00 AM IST = 03:30 UTC
  cron.schedule('30 3 * * 1', () => {
    logger.info({ msg: 'Scheduler: running weekly trend ideas' });
    runWeeklyTrendIdeas().catch(err => logger.error({ msg: 'Weekly trend ideas failed', err }));
  });

  logger.info({ msg: 'Scheduler started — auto-publish every 5min, daily 03:30 UTC, weekly Sunday 14:30 UTC, weekly trend ideas Monday 03:30 UTC, monthly 02:30 UTC on 1st' });
}

// ─── Auto-publish ─────────────────────────────────────────────────────────────

async function runAutoPublish(): Promise<void> {
  const now = new Date();

  // Find SCHEDULED posts that are APPROVED, due now, and not yet published
  const duePosts = await prisma.postDraft.findMany({
    where: {
      status: 'SCHEDULED',
      approvalStatus: 'APPROVED',
      scheduledAt: { lte: now },
      publishedAt: null,
    },
    select: {
      id: true,
      clientId: true,
      caption: true,
      hashtags: true,
      mediaUrls: true,
      platforms: true,
      platformOverrides: true,
      client: { select: { agencyId: true } },
    },
  });

  if (duePosts.length === 0) return;

  logger.info({ msg: `Auto-publish: found ${duePosts.length} post(s) due` });

  for (const post of duePosts) {
    const agencyId = post.client.agencyId;

    // Fetch active social accounts for this client
    const socialAccounts = await prisma.socialAccount.findMany({
      where: {
        agencyId,
        clientId: post.clientId,
        isActive: true,
        platform: { in: post.platforms as never[] },
      },
    });

    if (socialAccounts.length === 0) {
      logger.warn({ msg: 'Auto-publish: no connected accounts for post', postId: post.id });
      continue;
    }

    let anySuccess = false;

    for (const account of socialAccounts) {
      // Build payload — use platform override caption if defined
      const overrides = (post.platformOverrides as Record<string, { caption?: string; hashtags?: string[] }> | null) ?? {};
      const override = overrides[account.platform as string] ?? {};
      const payload = {
        caption: override.caption ?? post.caption,
        hashtags: override.hashtags ?? (post.hashtags as string[]),
        mediaUrls: post.mediaUrls as string[],
      };

      let result;
      if (account.platform === 'FACEBOOK') {
        result = await publishToFacebook(payload, account.accountId, account.accessToken);
      } else if (account.platform === 'INSTAGRAM') {
        result = await publishToInstagram(payload, account.accountId, account.accessToken);
      } else if (account.platform === 'LINKEDIN') {
        result = await publishToLinkedIn(payload, account.accountId, account.accessToken);
      } else {
        logger.warn({ msg: `Auto-publish: no publisher for ${account.platform}`, postId: post.id });
        continue;
      }

      await prisma.postPublishLog.create({
        data: {
          postId: post.id,
          agencyId,
          platform: account.platform as never,
          status: result.success ? 'SUCCESS' : 'FAILED',
          publishedUrl: result.publishedUrl ?? null,
          platformPostId: result.platformPostId ?? null,
          errorMessage: result.error ?? null,
        },
      });

      if (result.success) {
        anySuccess = true;
        logger.info({ msg: `Auto-publish: SUCCESS`, postId: post.id, platform: account.platform, url: result.publishedUrl });
      } else {
        logger.error({ msg: `Auto-publish: FAILED`, postId: post.id, platform: account.platform, error: result.error });
      }
    }

    // Mark as PUBLISHED if at least one platform succeeded
    if (anySuccess) {
      await prisma.postDraft.update({
        where: { id: post.id },
        data: { status: 'PUBLISHED', publishedAt: now },
      });
    }
  }
}

// ─── Daily alert checks ───────────────────────────────────────────────────────

async function runDailyAlerts(): Promise<void> {
  await Promise.allSettled([
    alertPendingApprovals(),
    alertOverdueActionItems(),
    alertOverdueInvoices(),
  ]);
}

async function alertPendingApprovals(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find all agencies that have posts stuck in pending approval >24h
  const stalePosts = await prisma.postDraft.findMany({
    where: {
      approvalStatus: 'PENDING',
      status: { notIn: ['ARCHIVED', 'PUBLISHED'] },
      createdAt: { lt: cutoff },
    },
    select: {
      id: true, caption: true, createdAt: true,
      client: { select: { agencyId: true, name: true } },
    },
  });

  if (stalePosts.length === 0) return;

  // Group by agency
  const byAgency = new Map<string, typeof stalePosts>();
  for (const post of stalePosts) {
    const agencyId = post.client.agencyId;
    if (!byAgency.has(agencyId)) byAgency.set(agencyId, []);
    byAgency.get(agencyId)!.push(post);
  }

  for (const [agencyId, posts] of byAgency) {
    // Find OWNER and ACCOUNT_MANAGER recipients
    const recipients = await prisma.user.findMany({
      where: { agencyId, role: { in: ['OWNER', 'ACCOUNT_MANAGER'] }, isActive: true },
      select: { email: true },
    });
    if (recipients.length === 0) continue;

    const now = Date.now();
    await sendPendingApprovalDigest({
      agencyId,
      recipientEmails: recipients.map(r => r.email),
      posts: posts.map(p => ({
        id: p.id,
        caption: p.caption,
        clientName: p.client.name,
        hoursAgo: Math.floor((now - p.createdAt.getTime()) / 3_600_000),
      })),
    });

    logger.info({ msg: `Pending approval digest sent`, agencyId, count: posts.length });
  }
}

async function alertOverdueActionItems(): Promise<void> {
  const now = new Date();
  // Items that are overdue (dueDate in the past) and not yet resolved
  const overdueItems = await prisma.clientActionItem.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      dueDate: { lt: now },
    },
    select: {
      id: true, title: true, dueDate: true, agencyId: true, clientId: true,
      client: { select: { name: true } },
    },
  });

  if (overdueItems.length === 0) return;

  // Group by agency
  const byAgency = new Map<string, typeof overdueItems>();
  for (const item of overdueItems) {
    if (!byAgency.has(item.agencyId)) byAgency.set(item.agencyId, []);
    byAgency.get(item.agencyId)!.push(item);
  }

  for (const [agencyId, items] of byAgency) {
    const recipients = await prisma.user.findMany({
      where: { agencyId, role: { in: ['OWNER', 'ACCOUNT_MANAGER'] }, isActive: true },
      select: { email: true },
    });
    if (recipients.length === 0) continue;

    await sendOverdueItemsDigest({
      agencyId,
      recipientEmails: recipients.map(r => r.email),
      items: items.map(i => ({
        title: i.title,
        clientName: i.client.name,
        clientId: i.clientId,
        dueDate: i.dueDate!,
      })),
    });

    logger.info({ msg: `Overdue items digest sent`, agencyId, count: items.length });
  }
}

async function alertOverdueInvoices(): Promise<void> {
  const now = new Date();

  // Find SENT invoices with a past due date that haven't been marked OVERDUE yet
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'SENT',
      dueDate: { lt: now },
    },
    select: {
      id: true, agencyId: true, invoiceNumber: true, total: true, currency: true, dueDate: true,
      client: { select: { name: true } },
    },
  });

  if (overdueInvoices.length === 0) return;

  // Mark them all as OVERDUE in one batch
  const overdueIds = overdueInvoices.map(i => i.id);
  await prisma.invoice.updateMany({
    where: { id: { in: overdueIds } },
    data: { status: 'OVERDUE' },
  });

  // Group by agency and send one email per agency to the Owner
  const byAgency = new Map<string, typeof overdueInvoices>();
  for (const inv of overdueInvoices) {
    if (!byAgency.has(inv.agencyId)) byAgency.set(inv.agencyId, []);
    byAgency.get(inv.agencyId)!.push(inv);
  }

  for (const [agencyId, invoices] of byAgency) {
    const owner = await prisma.user.findFirst({
      where: { agencyId, role: 'OWNER', isActive: true },
      select: { email: true },
    });
    if (!owner?.email) continue;

    await sendInvoiceOverdueAlert({
      agencyId,
      ownerEmail: owner.email,
      invoices: invoices.map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        clientName: i.client.name,
        total: i.total,
        currency: i.currency,
        dueDate: i.dueDate!,
      })),
    });

    logger.info({ msg: `Invoice overdue alert sent`, agencyId, count: invoices.length });
  }
}

// ─── Weekly per-client digest ─────────────────────────────────────────────────

async function runWeeklyClientDigests(): Promise<void> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekLabel = `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const clients = await prisma.client.findMany({
    where: { status: 'ACTIVE', contactEmail: { not: null } },
    select: { id: true, name: true, agencyId: true, contactEmail: true },
  });

  if (clients.length === 0) return;

  // Build owner context per agency (needed for AI tool call)
  const agencyOwners = new Map<string, { userId: string; agencyId: string; role: string; name: string; email: string }>();
  for (const client of clients) {
    if (!agencyOwners.has(client.agencyId)) {
      const owner = await prisma.user.findFirst({
        where: { agencyId: client.agencyId, role: 'OWNER', isActive: true },
        select: { id: true, name: true, email: true },
      });
      if (owner) {
        agencyOwners.set(client.agencyId, {
          userId: owner.id,
          agencyId: client.agencyId,
          role: 'OWNER',
          name: owner.name,
          email: owner.email,
        });
      }
    }
  }

  let sent = 0;
  for (const client of clients) {
    if (!client.contactEmail) continue;
    const ownerCtx = agencyOwners.get(client.agencyId);
    if (!ownerCtx) continue;

    try {
      const [postsPublished, auditsCompleted, actionItemsDone] = await Promise.all([
        prisma.postDraft.count({ where: { clientId: client.id, status: 'PUBLISHED', updatedAt: { gte: weekStart } } }),
        prisma.auditProject.count({ where: { clientId: client.id, status: 'COMPLETED', updatedAt: { gte: weekStart } } }),
        prisma.clientActionItem.count({ where: { clientId: client.id, status: 'COMPLETED', updatedAt: { gte: weekStart } } }),
      ]);

      const recentPosts = await prisma.postDraft.findMany({
        where: { clientId: client.id, approvalStatus: 'APPROVED', createdAt: { gte: weekStart } },
        select: { caption: true, platforms: true },
        take: 5,
      });

      const postSummary = recentPosts.map(p => `- [${(p.platforms as string[]).join('+')}] "${p.caption.slice(0, 80)}"`).join('\n') || 'No posts this week.';

      const { result } = await runAITool({
        toolId: 'client_digest',
        systemPrompt: `You are a digital marketing agency writing a friendly weekly update for a client. Return ONLY a JSON object: {"highlights": "2-3 sentences on what was achieved this week, specific and positive", "nextSteps": "2-3 sentences on what's coming up next week"}. No markdown, no extra text.`,
        userPrompt: `Client: ${client.name}\nWeek: ${weekLabel}\nPosts published: ${postsPublished}\nAudits completed: ${auditsCompleted}\nAction items done: ${actionItemsDone}\nRecent content:\n${postSummary}`,
        inputs: { clientId: client.id, weekLabel },
        user: ownerCtx as never,
        clientId: client.id,
        forceRefresh: true,
      });

      const clean = result.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const { highlights, nextSteps } = JSON.parse(clean) as { highlights: string; nextSteps: string };

      await sendClientDigestEmail({
        agencyId: client.agencyId,
        clientName: client.name,
        contactEmail: client.contactEmail,
        weekLabel,
        postsPublished,
        auditsCompleted,
        actionItemsDone,
        highlights,
        nextSteps,
      });

      sent++;
      logger.info({ msg: `Weekly client digest sent`, clientId: client.id, clientName: client.name });
    } catch (err) {
      logger.error({ msg: `Weekly client digest failed for client`, clientId: client.id, err });
    }
  }

  logger.info({ msg: `Weekly client digests complete`, sent, total: clients.length });
}

// ─── Weekly AI trend ideas ─────────────────────────────────────────────────────

async function runWeeklyTrendIdeas(): Promise<void> {
  const clients = await prisma.client.findMany({ where: { status: 'ACTIVE' } });

  if (clients.length === 0) return;

  // Build owner context per agency (needed as the `user` for the AI tool call)
  const agencyOwners = new Map<string, { userId: string; agencyId: string; role: string; name: string; email: string }>();
  for (const client of clients) {
    if (!agencyOwners.has(client.agencyId)) {
      const owner = await prisma.user.findFirst({
        where: { agencyId: client.agencyId, role: 'OWNER', isActive: true },
        select: { id: true, name: true, email: true },
      });
      if (owner) {
        agencyOwners.set(client.agencyId, {
          userId: owner.id,
          agencyId: client.agencyId,
          role: 'OWNER',
          name: owner.name,
          email: owner.email,
        });
      }
    }
  }

  let created = 0;
  for (const client of clients) {
    const ownerCtx = agencyOwners.get(client.agencyId);
    if (!ownerCtx) continue;

    try {
      const ideas = await generateAndSaveTrendIdeas(client, ownerCtx as never);
      created += ideas.length;
    } catch (err) {
      logger.error({ msg: 'Weekly trend ideas failed for client', clientId: client.id, err });
    }
  }

  logger.info({ msg: 'Weekly trend ideas complete', created, clients: clients.length });
}

// ─── Monthly report auto-send ─────────────────────────────────────────────────

async function runMonthlyReports(): Promise<void> {
  const clients = await prisma.client.findMany({
    where: { reportSchedule: 'MONTHLY', contactEmail: { not: null } },
    select: {
      id: true, name: true, agencyId: true, contactEmail: true,
      agency: { select: { name: true } },
    },
  });

  if (clients.length === 0) return;

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Build a mock user context per agency for report generation
  const agencyUsers = new Map<string, { userId: string; agencyId: string; role: string; name: string; email: string }>();
  for (const client of clients) {
    if (!agencyUsers.has(client.agencyId)) {
      const owner = await prisma.user.findFirst({
        where: { agencyId: client.agencyId, role: 'OWNER', isActive: true },
        select: { id: true, name: true, email: true },
      });
      if (owner) {
        agencyUsers.set(client.agencyId, {
          userId: owner.id,
          agencyId: client.agencyId,
          role: 'OWNER',
          name: owner.name,
          email: owner.email,
        });
      }
    }
  }

  for (const client of clients) {
    const userCtx = agencyUsers.get(client.agencyId);
    if (!userCtx || !client.contactEmail) continue;

    try {
      const pdf = await generateClientReport(client.id, userCtx as never);
      const filename = `${client.name.replace(/\s+/g, '-')}-${monthLabel.replace(' ', '-')}-report.pdf`;

      await sendClientReport({
        agencyId: client.agencyId,
        clientName: client.name,
        contactEmail: client.contactEmail,
        pdfBuffer: Buffer.from(pdf),
        filename,
        monthLabel,
      });

      await prisma.client.update({
        where: { id: client.id },
        data: { lastReportEmailedAt: now },
      });

      logger.info({ msg: `Monthly report sent`, clientId: client.id, clientName: client.name });
    } catch (err) {
      logger.error({ msg: `Monthly report failed for client`, clientId: client.id, err });
    }
  }
}
