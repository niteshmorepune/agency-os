import { runAITool } from './client';
import { prisma } from '../../lib/prisma';
import { createNotification } from '../../lib/notify';
import { logger } from '../../lib/logger';
import type { JwtPayload } from '@agencyos/shared';
import type { Client, ContentIdea } from '@prisma/client';

/**
 * Competitor content-gap finder — extends the trend-ideas engine
 * (trendIdeas.ts) with a different question: not "what's trending right
 * now" but "what are this client's named competitors covering that this
 * client isn't." Same shape, same storage (ContentIdea), same on-demand
 * trigger pattern — deliberately NOT given an automatic weekly cron, since
 * the trend-ideas cron was removed 2026-07-21 for spending web-search cost
 * on clients nobody was actively planning content for; no reason to
 * reintroduce that same problem for a second tool.
 */

export interface CompetitorGapIdea {
  platform: string;
  title: string;
  format: string;
  hook: string;
  outline: string;
  trendRationale: string; // reused as "gap rationale" — why this is worth covering
  sourceRefs: string[];
}

function isCompetitorGapIdea(value: unknown): value is CompetitorGapIdea {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.platform === 'string' &&
    typeof v.title === 'string' &&
    typeof v.format === 'string' &&
    typeof v.hook === 'string' &&
    typeof v.outline === 'string' &&
    typeof v.trendRationale === 'string'
  );
}

export async function generateCompetitorGapIdeas(client: Client, user: JwtPayload): Promise<CompetitorGapIdea[]> {
  // Skip entirely (no AI call, zero cost) when there's nothing to compare
  // against — same "skip rather than pad with filler" rule used elsewhere
  // in this codebase (e.g. onboarding task suggestions in the CRM).
  if (!client.competitors || client.competitors.length === 0) {
    logger.info({ msg: 'Competitor gap ideas skipped — no competitors on file', clientId: client.id });
    return [];
  }

  const prompt = `Client: ${client.brandName ?? client.name}\nIndustry: ${client.industry ?? 'not specified'}\nTarget audience: ${client.targetAudience ?? 'not specified'}\nPrimary location: ${client.primaryLocation ?? 'not specified'}\nNamed competitors: ${client.competitors.join(', ')}\n\nUse web search to find out what content topics, formats, or angles these named competitors are actually publishing or ranking for RIGHT NOW that this client doesn't appear to be covering. Look at their recent social posts, blog content, or search presence. Every gap idea must be grounded in something a specific competitor is genuinely doing, cited with a source — never a generic "competitors probably do X" guess.\n\nReturn ONLY a strict JSON array of 3-5 ideas, no markdown fences, no preamble. Each item:\n{"platform": "one of instagram/linkedin/facebook/gbp/youtube/twitter/tiktok/pinterest", "title": "short idea title", "format": "reel/carousel/post/story/thread/video/article", "hook": "first line / opening hook", "outline": "2-3 point outline", "trendRationale": "1-2 plain-language sentences on which competitor is doing this and why it's a real gap worth filling, written for a client with no marketing background", "sourceRefs": ["url or domain cited"]}`;

  const { result } = await runAITool({
    toolId: 'competitor_gap_ideas',
    systemPrompt: 'You are a competitive content strategist for a digital marketing agency. You use web search to ground every gap in something a named competitor is actually doing — never invent a competitor activity from training data alone. Always return valid JSON only.',
    userPrompt: prompt,
    inputs: { clientId: client.id, day: new Date().toISOString().slice(0, 10) },
    user,
    clientId: client.id,
    clientContext: {
      brandName: client.brandName ?? client.name,
      industry: client.industry ?? undefined,
      targetAudience: client.targetAudience ?? undefined,
      competitors: client.competitors,
      notes: client.notes ?? undefined,
    },
    enableWebSearch: true,
    forceRefresh: true,
  });

  // Same web-search citation-stripping gotcha as trendIdeas.ts — Claude's
  // web_search tool embeds <cite> tags in response text.
  const clean = result
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .replace(/<cite[^>]*>/gi, '')
    .replace(/<\/cite>/gi, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    logger.warn({ msg: 'competitor_gap_ideas: failed to parse AI response as JSON', clientId: client.id, resultLength: result.length, resultPreview: result.slice(0, 500) });
    return [];
  }

  if (!Array.isArray(parsed)) {
    logger.warn({ msg: 'competitor_gap_ideas: AI response was not a JSON array', clientId: client.id, resultPreview: result.slice(0, 500) });
    return [];
  }

  return parsed.filter(isCompetitorGapIdea).map(idea => ({
    ...idea,
    sourceRefs: Array.isArray(idea.sourceRefs) ? idea.sourceRefs.filter((r): r is string => typeof r === 'string') : [],
  }));
}

/**
 * Generates competitor gap ideas for a client, persists them as staff-only
 * ContentIdea rows (source: AI_COMPETITOR_GAP), and notifies the client's
 * assigned team members. On-demand only — see file header.
 */
export async function generateAndSaveCompetitorGapIdeas(client: Client, user: JwtPayload): Promise<ContentIdea[]> {
  const ideas = await generateCompetitorGapIdeas(client, user);
  if (ideas.length === 0) return [];

  const created: ContentIdea[] = [];
  for (const idea of ideas) {
    created.push(await prisma.contentIdea.create({
      data: {
        clientId: client.id,
        platform: idea.platform.toUpperCase() as never,
        title: idea.title,
        format: idea.format,
        hook: idea.hook,
        outline: idea.outline,
        source: 'AI_COMPETITOR_GAP',
        trendRationale: idea.trendRationale,
        sourceRefs: idea.sourceRefs,
      },
    }));
  }

  const assignments = await prisma.clientAssignment.findMany({
    where: { clientId: client.id },
    select: { userId: true },
  });
  await Promise.all(
    assignments.map(a => createNotification({
      agencyId: client.agencyId,
      userId: a.userId,
      type: 'GENERAL',
      title: 'New competitor content-gap ideas ready',
      body: `${created.length} new AI-researched competitor gap idea(s) for ${client.name} are ready to review.`,
      link: `/content-ideas?clientId=${client.id}`,
    }))
  );

  logger.info({ msg: 'Competitor gap ideas created', clientId: client.id, clientName: client.name, count: created.length });

  return created;
}
