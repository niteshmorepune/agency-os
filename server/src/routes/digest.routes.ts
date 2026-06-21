import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { generateDigest } from '../services/ai/digest';
import { sendDigestEmail, sendClientDigestEmail } from '../services/email.service';
import { runAITool } from '../services/ai/client';
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

// Send per-client weekly digest to all clients with a contactEmail
router.post('/email-clients', requireRole(Role.OWNER), asyncHandler(async (req, res) => {
  const agencyId = req.user!.agencyId;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekLabel = `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const clients = await prisma.client.findMany({
    where: { agencyId, status: 'ACTIVE', contactEmail: { not: null } },
    select: { id: true, name: true, contactEmail: true },
  });

  let sent = 0;
  const errors: string[] = [];

  for (const client of clients) {
    if (!client.contactEmail) continue;
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
        user: req.user!,
        clientId: client.id,
        forceRefresh: true,
      });

      const clean = result.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const { highlights, nextSteps } = JSON.parse(clean) as { highlights: string; nextSteps: string };

      await sendClientDigestEmail({
        agencyId,
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
    } catch (err) {
      errors.push(`${client.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  res.json({ message: `Sent ${sent}/${clients.length} client digests`, errors });
}));

export default router;
