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

export function startScheduler(): void {
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

  logger.info({ msg: 'Scheduler started — daily 03:30 UTC, monthly 02:30 UTC on 1st' });
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
