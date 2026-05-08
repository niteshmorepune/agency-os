import { prisma } from '../../lib/prisma';
import { runAITool } from './client';
import { JwtPayload } from '@agencyos/shared';

export async function generateDigest(user: JwtPayload): Promise<{ content: string; weekLabel: string; id: string }> {
  const now = new Date();
  const weekLabel = now.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [agency, clients, postsThisMonth, pendingPosts, audits, invoices, topPlatform] = await Promise.all([
    prisma.agency.findUnique({ where: { id: user.agencyId }, select: { name: true } }),
    prisma.client.findMany({
      where: { agencyId: user.agencyId },
      select: { name: true, status: true },
    }),
    prisma.postDraft.count({
      where: { client: { agencyId: user.agencyId }, createdAt: { gte: startOfMonth } },
    }),
    prisma.postDraft.count({
      where: { client: { agencyId: user.agencyId }, approvalStatus: 'PENDING', status: 'DRAFT' },
    }),
    prisma.auditProject.findMany({
      where: { client: { agencyId: user.agencyId } },
      select: { status: true, overallScore: true },
    }),
    prisma.invoice.findMany({
      where: { agencyId: user.agencyId },
      select: { status: true, total: true, currency: true },
    }),
    prisma.platformOptimization.groupBy({
      by: ['platform'],
      where: { client: { agencyId: user.agencyId } },
      _avg: { score: true },
      orderBy: { _avg: { score: 'desc' } },
      take: 1,
    }),
  ]);

  const activeClients = clients.filter(c => c.status === 'ACTIVE').length;
  const completedAudits = audits.filter(a => a.status === 'COMPLETED').length;
  const inProgressAudits = audits.filter(a => a.status === 'IN_PROGRESS').length;
  const avgAuditScore = completedAudits > 0
    ? Math.round(audits.filter(a => a.overallScore !== null).reduce((s, a) => s + (a.overallScore ?? 0), 0) / completedAudits)
    : null;
  const outstandingInvoices = invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE');
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length;
  const outstandingTotal = outstandingInvoices.reduce((s, i) => s + i.total, 0);
  const topPlatformName = topPlatform[0]?.platform ?? null;
  const topPlatformScore = topPlatform[0]?._avg?.score ?? null;

  const dataStr = [
    `Agency: ${agency?.name ?? 'Agency'}`,
    `Date: ${weekLabel}`,
    ``,
    `CLIENTS`,
    `- Total: ${clients.length} (${activeClients} active)`,
    ``,
    `CONTENT`,
    `- Posts created this month: ${postsThisMonth}`,
    `- Posts awaiting approval: ${pendingPosts}`,
    ``,
    `AUDITS`,
    `- In progress: ${inProgressAudits}`,
    `- Completed: ${completedAudits}`,
    avgAuditScore !== null ? `- Average audit score: ${avgAuditScore}/100` : '',
    ``,
    `PLATFORM OPTIMIZATION`,
    topPlatformName ? `- Best performing platform: ${topPlatformName} (avg score: ${Math.round(topPlatformScore ?? 0)}%)` : '- No platform data yet',
    ``,
    `INVOICES`,
    `- Outstanding: ${outstandingInvoices.length} (₹${Math.round(outstandingTotal).toLocaleString()})`,
    overdueCount > 0 ? `- Overdue: ${overdueCount} invoice${overdueCount !== 1 ? 's' : ''} — needs follow-up` : '- No overdue invoices',
  ].filter(Boolean).join('\n');

  const systemPrompt = `You are a sharp agency performance analyst writing a Monday morning digest for a digital marketing agency owner.
Write a concise 4-paragraph digest (no headers, no bullet points) that:
1. Opens with a punchy one-line performance headline
2. Celebrates wins: well-optimized platforms, completed audits, collected payments
3. Flags the 2-3 most important action items that need attention this week
4. Closes with one specific, actionable recommendation to grow the agency this week

Tone: professional but energetic — like a trusted analyst who knows the business. Be specific with the numbers provided. Keep each paragraph to 2-3 sentences max.`;

  const { result } = await runAITool({
    toolId: 'digest',
    systemPrompt,
    userPrompt: dataStr,
    inputs: { agencyId: user.agencyId, weekLabel },
    user,
    forceRefresh: true,
  });

  const digest = await prisma.agencyDigest.create({
    data: { agencyId: user.agencyId, weekLabel, content: result },
  });

  return { content: result, weekLabel, id: digest.id };
}
