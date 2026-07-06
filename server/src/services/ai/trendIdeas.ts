import { runAITool } from './client';
import { prisma } from '../../lib/prisma';
import { createNotification } from '../../lib/notify';
import { logger } from '../../lib/logger';
import type { JwtPayload } from '@agencyos/shared';
import type { Client, ContentIdea } from '@prisma/client';

export interface TrendIdea {
  platform: string;
  title: string;
  format: string;
  hook: string;
  outline: string;
  trendRationale: string;
  sourceRefs: string[];
}

function buildClientContext(client: Client) {
  return {
    brandName: client.brandName ?? client.name,
    industry: client.industry ?? undefined,
    targetAudience: client.targetAudience ?? undefined,
    competitors: client.competitors,
    notes: client.notes ?? undefined,
  };
}

function isTrendIdea(value: unknown): value is TrendIdea {
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

export async function generateTrendIdeas(client: Client, user: JwtPayload): Promise<TrendIdea[]> {
  const prompt = `Client: ${client.brandName ?? client.name}\nIndustry: ${client.industry ?? 'not specified'}\nTarget audience: ${client.targetAudience ?? 'not specified'}\nPrimary location: ${client.primaryLocation ?? 'not specified'}\n\nUse web search to find genuinely CURRENT (this week or this month) trending content angles, formats, or challenges relevant to this client's industry, platform mix, and audience. Reject generic evergreen advice — every idea must connect to something actually happening right now, and must cite where that trend was found.\n\nReturn ONLY a strict JSON array of 3-5 ideas, no markdown fences, no preamble. Each item:\n{"platform": "one of instagram/linkedin/facebook/gbp/youtube/twitter/tiktok/pinterest", "title": "short idea title", "format": "reel/carousel/post/story/thread/video/article", "hook": "first line / opening hook", "outline": "2-3 point outline", "trendRationale": "1-2 plain-language sentences on why this matters right now, written for a client with no marketing background", "sourceRefs": ["url or domain cited"]}`;

  const { result } = await runAITool({
    toolId: 'trend_ideas',
    systemPrompt: 'You are a social media trend researcher for a digital marketing agency. You use web search to ground every suggestion in something real and current — never invent a trend from training data alone. Always return valid JSON only.',
    userPrompt: prompt,
    inputs: { clientId: client.id, day: new Date().toISOString().slice(0, 10) },
    user,
    clientId: client.id,
    clientContext: buildClientContext(client),
    enableWebSearch: true,
    forceRefresh: true,
  });

  // Strip citation annotations (e.g. <cite index="11-19,11-20">...</cite>)
  // that Claude's web search tool embeds in response text — keep the cited
  // text itself, since this copy is reused verbatim as a client-facing
  // action item description on promotion and must read as plain prose.
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
    logger.warn({ msg: 'trend_ideas: failed to parse AI response as JSON', clientId: client.id, resultLength: result.length, resultPreview: result.slice(0, 500) });
    return [];
  }

  if (!Array.isArray(parsed)) {
    logger.warn({ msg: 'trend_ideas: AI response was not a JSON array', clientId: client.id, resultPreview: result.slice(0, 500) });
    return [];
  }

  return parsed.filter(isTrendIdea).map(idea => ({
    ...idea,
    sourceRefs: Array.isArray(idea.sourceRefs) ? idea.sourceRefs.filter((r): r is string => typeof r === 'string') : [],
  }));
}

/**
 * Generates trend ideas for a client, persists them as staff-only ContentIdea
 * rows (source: AI_TREND), and notifies the client's assigned team members.
 * Shared by the weekly cron job and the on-demand trigger route.
 */
export async function generateAndSaveTrendIdeas(client: Client, user: JwtPayload): Promise<ContentIdea[]> {
  const ideas = await generateTrendIdeas(client, user);
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
        source: 'AI_TREND',
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
      title: 'New trend-based content ideas ready',
      body: `${created.length} new AI-researched idea(s) for ${client.name} are ready to review.`,
      link: `/content-ideas?clientId=${client.id}`,
    }))
  );

  logger.info({ msg: 'Trend ideas created', clientId: client.id, clientName: client.name, count: created.length });

  return created;
}
