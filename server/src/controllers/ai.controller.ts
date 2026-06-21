import { Request, Response } from 'express';
import { z } from 'zod';
import { runAITool } from '../services/ai/client';
import { prisma } from '../lib/prisma';
import { getPostingSchedule } from '../services/postingTimes';
import { getBenchmark, calculateEngagementRate, getRating, getPercentile } from '../services/engagementBenchmarks';
import { getSearchVisibilityAudit } from '../services/ai/searchVisibility';
import { generatePerformanceInsights } from '../services/ai/performanceInsights';

const SYSTEM_BASE = `You are an expert digital marketing strategist for a premium agency. You have deep expertise in all major social platforms, SEO, paid ads, email marketing, and content strategy. Always output structured, actionable content. Never use filler phrases. Be specific and platform-aware.`;

async function getClientCtx(clientId: string | undefined, agencyId: string) {
  if (!clientId) return undefined;
  const c = await prisma.client.findFirst({ where: { id: clientId, agencyId } });
  if (!c) return undefined;
  return { brandName: c.brandName ?? c.name, industry: c.industry ?? undefined, targetAudience: c.targetAudience ?? undefined, competitors: c.competitors, notes: c.notes ?? undefined };
}

export async function captionGenerator(req: Request, res: Response): Promise<void> {
  const schema = z.object({ topic: z.string().min(1), platform: z.string(), tone: z.string().optional(), cta: z.string().optional(), clientId: z.string().optional(), forceRefresh: z.boolean().optional() });
  const { topic, platform, tone, cta, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);
  const { result, cached } = await runAITool({
    toolId: 'caption',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Generate 5 ${platform} caption variants for this topic: "${topic}"\nTone: ${tone ?? 'professional'}\nCTA goal: ${cta ?? 'engagement'}\n\nUse this exact plain-text format for all 5 variants — no markdown headers, no HTML:\n\n1.\n[caption text here]\nHashtags: #tag1 #tag2 #tag3 #tag4 #tag5\n\n2.\n[caption text here]\nHashtags: #tag1 #tag2 #tag3 #tag4 #tag5\n\n...and so on through 5.`,
    inputs: { topic, platform, tone: tone ?? '', cta: cta ?? '' },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });
  res.json({ data: result, cached });
}

export async function bioOptimizer(req: Request, res: Response): Promise<void> {
  const schema = z.object({ currentBio: z.string().min(1), platform: z.string(), targetAudience: z.string().optional(), keywords: z.string().optional(), clientId: z.string().optional(), forceRefresh: z.boolean().optional() });
  const { currentBio, platform, targetAudience, keywords, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);
  const { result, cached } = await runAITool({
    toolId: 'bio',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Optimize this ${platform} bio for discoverability and conversion.\n\nCurrent bio: "${currentBio}"\nTarget audience: ${targetAudience ?? 'general'}\nTop keywords: ${keywords ?? 'not specified'}\n\nProvide 3 optimized variants with keyword analysis for each. Note character count for each variant.`,
    inputs: { currentBio, platform, targetAudience: targetAudience ?? '', keywords: keywords ?? '' },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });
  res.json({ data: result, cached });
}

export async function contentRewriter(req: Request, res: Response): Promise<void> {
  const schema = z.object({ originalText: z.string().min(1), platform: z.string().optional(), tone: z.string().optional(), targetAudience: z.string().optional(), clientId: z.string().optional(), forceRefresh: z.boolean().optional() });
  const { originalText, platform, tone, targetAudience, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);
  const { result, cached } = await runAITool({
    toolId: 'rewrite',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Rewrite this content in 3 variants: professional, conversational, and bold.\n\nOriginal: "${originalText}"\nPlatform: ${platform ?? 'general'}\nTone preference: ${tone ?? 'balanced'}\nTarget audience: ${targetAudience ?? 'general'}\n\nFor each variant, explain the key changes made.`,
    inputs: { originalText, platform: platform ?? '', tone: tone ?? '' },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });
  res.json({ data: result, cached });
}

export async function emailCopyWriter(req: Request, res: Response): Promise<void> {
  const schema = z.object({ campaignGoal: z.string().min(1), audienceSegment: z.string().optional(), offerDetails: z.string().optional(), tone: z.string().optional(), clientId: z.string().optional(), forceRefresh: z.boolean().optional() });
  const { campaignGoal, audienceSegment, offerDetails, tone, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);
  const { result, cached } = await runAITool({
    toolId: 'email_body',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Write a complete email campaign.\n\nCampaign goal: ${campaignGoal}\nAudience segment: ${audienceSegment ?? 'general subscribers'}\nOffer: ${offerDetails ?? 'not specified'}\nTone: ${tone ?? 'professional'}\n\nOutput:\n1. Subject line (5 variants)\n2. Preview text (2 variants)\n3. Email body (with hook, value, CTA)\n4. CTA button text options`,
    inputs: { campaignGoal, audienceSegment: audienceSegment ?? '', offerDetails: offerDetails ?? '', tone: tone ?? '' },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });
  res.json({ data: result, cached });
}

export async function adCopyGenerator(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    product: z.string().min(1),
    usp: z.string().optional(),
    targetAudience: z.string().optional(),
    platform: z.enum(['GOOGLE', 'META', 'BOTH']).optional(),
    keywords: z.string().optional(),
    location: z.string().optional(),
    sitelinks: z.string().optional(),
    clientId: z.string().optional(),
    forceRefresh: z.boolean().optional(),
  });
  const { product, usp, targetAudience, platform, keywords, location, sitelinks, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);

  const platformLabel = platform === 'BOTH' ? 'Google Ads AND Meta Ads' : platform === 'META' ? 'Meta Ads' : 'Google Ads';
  const googleSection = (platform === 'GOOGLE' || platform === 'BOTH' || !platform)
    ? `\n\n## GOOGLE ADS\n- 15 headline variants (30 chars max each)\n- 4 description variants (90 chars max each)\n- 5 responsive search ad combos${sitelinks ? `\n- 6 sitelink extensions for pages: ${sitelinks} (25 char headline + 35 char description each)` : ''}`
    : '';
  const metaSection = (platform === 'META' || platform === 'BOTH')
    ? `\n\n## META ADS\n- 5 primary text variants (125 chars max)\n- 5 headline variants (40 chars max)\n- 3 link description variants (30 chars max)\n- 3 CTA button options`
    : '';

  const { result, cached } = await runAITool({
    toolId: 'ad_headlines',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Generate ${platformLabel} copy for: "${product}"\nUSP: ${usp ?? 'not specified'}\nTarget audience: ${targetAudience ?? 'general'}\nTarget keywords: ${keywords ?? 'not specified'}\nTarget location: ${location ?? 'not specified'}${googleSection}${metaSection}\n\nFor every headline and description, naturally weave in the target keywords where relevant. All copy must be conversion-focused and location-aware where applicable.`,
    inputs: { product, usp: usp ?? '', targetAudience: targetAudience ?? '', platform: platform ?? 'GOOGLE', keywords: keywords ?? '', location: location ?? '', sitelinks: sitelinks ?? '' },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });
  res.json({ data: result, cached });
}

export async function threadWriter(req: Request, res: Response): Promise<void> {
  const schema = z.object({ topic: z.string().min(1), keyInsight: z.string().optional(), targetAudience: z.string().optional(), format: z.enum(['twitter', 'linkedin_carousel']).optional(), clientId: z.string().optional(), forceRefresh: z.boolean().optional() });
  const { topic, keyInsight, targetAudience, format, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);
  const isCarousel = format === 'linkedin_carousel';
  const { result, cached } = await runAITool({
    toolId: 'thread',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Write a ${isCarousel ? 'LinkedIn carousel (10 slides)' : 'Twitter/X thread (10 tweets)'} on: "${topic}"\nKey insight: ${keyInsight ?? 'not specified'}\nTarget audience: ${targetAudience ?? 'professionals'}\n\n${isCarousel ? 'For each slide: headline + 2-3 bullet points + visual suggestion' : 'For each tweet: number it, max 280 chars, hook tweet first, CTA last'}`,
    inputs: { topic, keyInsight: keyInsight ?? '', targetAudience: targetAudience ?? '', format: format ?? 'twitter' },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });
  res.json({ data: result, cached });
}

export async function hashtagResearcher(req: Request, res: Response): Promise<void> {
  const schema = z.object({ topic: z.string().min(1), platform: z.string(), niche: z.string().optional(), clientId: z.string().optional(), forceRefresh: z.boolean().optional() });
  const { topic, platform, niche, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);
  const { result, cached } = await runAITool({
    toolId: 'hashtag',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Generate a strategic hashtag set for ${platform} on topic: "${topic}"\nNiche: ${niche ?? 'general'}\n\nProvide exactly 30 hashtags in 3 tiers:\n- 10 NICHE (10k–100k posts) — high engagement\n- 10 MID (100k–1M posts) — balanced\n- 10 BROAD (1M+ posts) — high reach\n\nFormat as a table with: hashtag | estimated tier | recommendation.`,
    inputs: { topic, platform, niche: niche ?? '' },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });

  if (clientId) {
    await prisma.hashtagSet.create({ data: { clientId, platform: platform as never, topic, niche, hashtags: { result } } }).catch(() => null);
  }

  res.json({ data: result, cached });
}

export async function personaBuilder(req: Request, res: Response): Promise<void> {
  const schema = z.object({ industry: z.string().min(1), product: z.string().optional(), customerDescription: z.string().optional(), platform: z.string().optional(), clientId: z.string().optional(), forceRefresh: z.boolean().optional() });
  const { industry, product, customerDescription, platform, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);
  const { result, cached } = await runAITool({
    toolId: 'persona',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Build a detailed audience persona.\n\nIndustry: ${industry}\nProduct/service: ${product ?? 'not specified'}\nExisting customer description: ${customerDescription ?? 'not specified'}\nPrimary platform: ${platform ?? 'multi-platform'}\n\nInclude:\n- Name + avatar description\n- Demographics (age, gender, location, income, education, job)\n- Psychographics (values, interests, lifestyle, personality)\n- Digital behavior (platforms, content formats, best times, device, purchase behavior)\n- Pain points (5)\n- Goals (5)\n- Objections (3)\n- Content triggers (5)\n- Messaging guide (tone, keywords, words to avoid, example CTA)`,
    inputs: { industry, product: product ?? '', customerDescription: customerDescription ?? '', platform: platform ?? '' },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });
  res.json({ data: result, cached });
}

export async function competitorAnalyzer(req: Request, res: Response): Promise<void> {
  const schema = z.object({ competitorHandles: z.string().min(1), clientNiche: z.string().optional(), currentThemes: z.string().optional(), clientId: z.string().optional(), forceRefresh: z.boolean().optional() });
  const { competitorHandles, clientNiche, currentThemes, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);
  const { result, cached } = await runAITool({
    toolId: 'competitor',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Analyze competitor strategy and suggest differentiation.\n\nCompetitors: ${competitorHandles}\nClient niche: ${clientNiche ?? 'not specified'}\nCurrent content themes to avoid: ${currentThemes ?? 'none specified'}\n\nProvide:\n1. Content gaps (what competitors miss)\n2. Positioning opportunities\n3. 10 specific content ideas competitors aren't doing\n4. Differentiation strategy (tone, angle, format)\n5. Action items ranked by impact`,
    inputs: { competitorHandles, clientNiche: clientNiche ?? '', currentThemes: currentThemes ?? '' },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });
  res.json({ data: result, cached });
}

export async function contentRepurposer(req: Request, res: Response): Promise<void> {
  const schema = z.object({ sourceContent: z.string().min(1), sourceType: z.enum(['blog', 'video', 'podcast']).optional(), targetPlatforms: z.array(z.string()).optional(), clientId: z.string().optional(), forceRefresh: z.boolean().optional() });
  const { sourceContent, sourceType, targetPlatforms, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);
  const platforms = targetPlatforms?.join(', ') ?? 'LinkedIn, Twitter, Instagram, YouTube, Email, Pinterest, TikTok, GBP, WhatsApp, Blog';
  const { result, cached } = await runAITool({
    toolId: 'repurpose',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Repurpose this ${sourceType ?? 'content'} into 10 platform-specific formats.\n\nSource: "${sourceContent.substring(0, 500)}"\nTarget platforms: ${platforms}\n\nFor each platform: format name, adapted content/hook, recommended length, key message to emphasize.`,
    inputs: { sourceContent: sourceContent.substring(0, 300), sourceType: sourceType ?? 'blog', targetPlatforms: platforms },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });
  res.json({ data: result, cached });
}

export async function reviewResponseGenerator(req: Request, res: Response): Promise<void> {
  const schema = z.object({ reviewText: z.string().min(1), starRating: z.number().min(1).max(5), businessType: z.string().optional(), clientId: z.string().optional(), forceRefresh: z.boolean().optional() });
  const { reviewText, starRating, businessType, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);
  const { result, cached } = await runAITool({
    toolId: 'review_reply',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Write 3 response variants to this ${starRating}-star review.\n\nReview: "${reviewText}"\nBusiness type: ${businessType ?? 'general business'}\n\nVariants: professional, warm/personal, detailed (includes keywords for SEO).\nKeep each under 150 words. Thank the reviewer, address specifics, include subtle keyword naturally.`,
    inputs: { reviewText, starRating: String(starRating), businessType: businessType ?? '' },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });
  res.json({ data: result, cached });
}

export async function postIdeasGenerator(req: Request, res: Response): Promise<void> {
  const schema = z.object({ platform: z.string(), niche: z.string(), goal: z.string().optional(), themesToAvoid: z.string().optional(), clientId: z.string().optional(), forceRefresh: z.boolean().optional() });
  const { platform, niche, goal, themesToAvoid, clientId, forceRefresh } = schema.parse(req.body);
  const ctx = await getClientCtx(clientId, req.user!.agencyId);
  const { result, cached } = await runAITool({
    toolId: 'post_ideas',
    systemPrompt: SYSTEM_BASE,
    userPrompt: `Generate 30 content ideas for ${platform} in the ${niche} niche.\nGoal: ${goal ?? 'engagement and growth'}\nThemes to avoid: ${themesToAvoid ?? 'none'}\n\nFor each idea: title | format (reel/carousel/post/story/thread) | hook (first line) | brief outline (2-3 points)`,
    inputs: { platform, niche, goal: goal ?? '', themesToAvoid: themesToAvoid ?? '' },
    user: req.user!,
    clientId,
    clientContext: ctx,
    forceRefresh,
  });
  res.json({ data: result, cached });
}

export async function postingTimeOptimizer(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    platforms: z.array(z.string()).min(1),
    location: z.enum(['IN', 'GLOBAL', 'UK', 'US', 'UAE', 'AU']).default('IN'),
    postsPerWeek: z.number().min(1).max(14).default(3),
    workingHours: z.enum(['9-6', '8-8', 'flexible']).default('9-6'),
    customAdvice: z.boolean().optional(),
    industry: z.string().optional(),
    clientId: z.string().optional(),
  });
  const { platforms, location, postsPerWeek, customAdvice, industry, clientId } = schema.parse(req.body);

  const schedule = getPostingSchedule({ platforms, location, postsPerWeek });

  if (customAdvice && industry) {
    const ctx = await getClientCtx(clientId, req.user!.agencyId);
    const { result, cached } = await runAITool({
      toolId: 'posting_time',
      systemPrompt: SYSTEM_BASE,
      userPrompt: `Provide custom posting time advice for a ${industry} brand targeting ${location} audience.\nPlatforms: ${platforms.join(', ')}\nPosts per week: ${postsPerWeek}\n\nGive 3 specific, industry-aware tips for each platform about timing, frequency, and content rhythm.`,
      inputs: { platforms: platforms.join(','), location, postsPerWeek: String(postsPerWeek), industry: industry ?? '' },
      user: req.user!,
      clientId,
      clientContext: ctx,
    });
    res.json({ data: { schedule, customAdvice: result, cached } });
    return;
  }

  res.json({ data: { schedule, cached: false } });
}

export async function engagementAnalyzer(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    platform: z.string().min(1),
    followers: z.number().min(1),
    avgLikes: z.number().min(0),
    avgComments: z.number().min(0),
    avgShares: z.number().min(0),
    avgReach: z.number().optional(),
    industry: z.string().optional(),
    clientId: z.string().optional(),
    forceRefresh: z.boolean().optional(),
  });
  const { platform, followers, avgLikes, avgComments, avgShares, avgReach, industry, clientId, forceRefresh } = schema.parse(req.body);

  const engRate = calculateEngagementRate({ followers, avgLikes, avgComments, avgShares, avgReach });
  const benchmark = getBenchmark(platform, followers);
  const rating = getRating(engRate, benchmark);
  const percentile = getPercentile(engRate, platform, followers);

  const result: Record<string, unknown> = {
    engagementRate: Math.round(engRate * 100) / 100,
    benchmark,
    rating,
    percentile,
    formula: avgReach ? '(likes + comments + shares) / reach × 100' : '(likes + comments + shares) / followers × 100',
  };

  if (rating !== 'good' && rating !== 'excellent') {
    try {
      const ctx = await getClientCtx(clientId, req.user!.agencyId);
      const ratingLabel = rating.replace('_', ' ');
      const { result: aiResult, cached } = await runAITool({
        toolId: 'engagement',
        systemPrompt: SYSTEM_BASE,
        userPrompt: `Client: ${ctx?.brandName ?? 'Agency client'}, Platform: ${platform}\nFollowers: ${followers}, Engagement rate: ${engRate.toFixed(2)}%\nBenchmark for this tier: ${benchmark.good}% = good, ${benchmark.avg}% = average\nIndustry: ${industry ?? ctx?.industry ?? 'general'}\n\nThey are ${ratingLabel}. Give 5 specific, actionable recommendations to improve engagement rate on ${platform}.\nBe platform-specific. No generic advice. Max 80 words per recommendation.\nReturn ONLY a raw JSON array, no markdown: [{"recommendation": "...", "impact": "high/med/low", "effort": "high/med/low"}]`,
        inputs: { platform, followers: String(followers), engRate: String(engRate.toFixed(2)), rating, industry: industry ?? '' },
        user: req.user!,
        clientId,
        clientContext: ctx,
        forceRefresh,
      });
      // Strip markdown code fences if Claude wrapped the JSON
      const cleaned = aiResult.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      result.recommendations = cleaned;
      result.cached = cached;
    } catch {
      // AI recommendations failed — still return the metrics
    }
  }

  res.json({ data: result });
}

export async function searchVisibilityAudit(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    brandName: z.string().min(1),
    website: z.string().min(1),
    industry: z.string().min(1),
    location: z.string().min(1),
    keyServices: z.string().min(1),
    targetKeywords: z.string().min(1),
    clientId: z.string().optional(),
    forceRefresh: z.boolean().optional(),
  });
  const { brandName, website, industry, location, keyServices, targetKeywords, clientId, forceRefresh } = schema.parse(req.body);

  const result = await getSearchVisibilityAudit({
    brandName,
    website,
    industry,
    location,
    keyServices,
    targetKeywords,
    user: req.user!,
    clientId,
    forceRefresh,
  });

  const cleaned = result.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  res.json({ data: JSON.parse(cleaned) });
}

export async function performanceInsights(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    clientId: z.string(),
    posts: z.array(z.object({
      caption: z.string(),
      platforms: z.array(z.string()),
      scheduledAt: z.string().nullable().optional(),
      reach: z.number().min(1),
      likes: z.number().min(0),
      comments: z.number().min(0),
      saves: z.number().min(0),
      shares: z.number().min(0),
      engagementRate: z.number(),
    })).min(1, 'At least one post with performance data is required'),
  });
  const { clientId, posts } = schema.parse(req.body);

  const client = await prisma.client.findFirst({ where: { id: clientId, agencyId: req.user!.agencyId }, select: { name: true } });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }

  const result = await generatePerformanceInsights({ clientName: client.name, clientId, posts, user: req.user! });
  res.json({ data: result });
}

export async function getAIUsage(req: Request, res: Response): Promise<void> {
  const schema = z.object({ clientId: z.string().optional(), from: z.string().optional(), to: z.string().optional() });
  const { clientId, from, to } = schema.parse(req.query);

  const where: Record<string, unknown> = { user: { agencyId: req.user!.agencyId } };
  if (clientId) where.clientId = clientId;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
  }

  const [logs, totals] = await Promise.all([
    prisma.aIUsageLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { name: true } } } }),
    prisma.aIUsageLog.aggregate({ where, _sum: { inputTokens: true, outputTokens: true, costUsd: true }, _count: true }),
  ]);

  res.json({ data: { logs, totals } });
}
