import { runAITool } from './client';
import { JwtPayload } from '@agencyos/shared';

interface PostPerformanceEntry {
  caption: string;
  platforms: string[];
  scheduledAt?: string | null;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  engagementRate: number;
}

export interface PerformanceInsightsResult {
  summary: string;
  topContentTypes: { type: string; insight: string; avgEngagement: number }[];
  bestPlatform: { platform: string; avgEngagement: number; reason: string } | null;
  worstPlatform: { platform: string; avgEngagement: number; reason: string } | null;
  recommendations: { action: string; reason: string; impact: 'high' | 'med' | 'low' }[];
  cached: boolean;
}

export async function generatePerformanceInsights(params: {
  clientName: string;
  clientId: string;
  posts: PostPerformanceEntry[];
  user: JwtPayload;
}): Promise<PerformanceInsightsResult> {
  const { clientName, clientId, posts, user } = params;

  const postSummary = posts.map((p, i) =>
    `Post ${i + 1}: [${p.platforms.join(', ')}] "${p.caption.slice(0, 120)}…" | ` +
    `Reach: ${p.reach} | Likes: ${p.likes} | Comments: ${p.comments} | Saves: ${p.saves} | Shares: ${p.shares} | ER: ${p.engagementRate.toFixed(2)}%` +
    (p.scheduledAt ? ` | Posted: ${new Date(p.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}` : '')
  ).join('\n');

  const systemPrompt = `You are a social media performance analyst. Analyse the content performance data and return ONLY a JSON object with no markdown fences. Schema:
{
  "summary": "2-3 sentence overall assessment",
  "topContentTypes": [{ "type": "string", "insight": "string", "avgEngagement": number }],
  "bestPlatform": { "platform": "string", "avgEngagement": number, "reason": "string" } or null,
  "worstPlatform": { "platform": "string", "avgEngagement": number, "reason": "string" } or null,
  "recommendations": [{ "action": "string", "reason": "string", "impact": "high|med|low" }]
}
Rules:
- topContentTypes: identify 2-3 content patterns (e.g. "Questions", "Carousels", "Behind-the-scenes") based on caption themes. Include average ER per type.
- bestPlatform / worstPlatform: compare average ER across platforms. Set to null if only one platform.
- recommendations: exactly 3, ordered by impact. Be specific and actionable.
- All engagement rates as numbers (not strings). No extra fields.`;

  const userPrompt = `Client: ${clientName}
Total posts analysed: ${posts.length}
Overall average ER: ${(posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length).toFixed(2)}%

Performance data:
${postSummary}

Analyse this data and return the JSON insights object.`;

  const { result, cached } = await runAITool({
    toolId: 'performance_insights',
    systemPrompt,
    userPrompt,
    inputs: { clientId, postCount: String(posts.length), avgER: (posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length).toFixed(2) },
    user,
    clientId,
    forceRefresh: true, // always fresh since data changes
  });

  const clean = result.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(clean) as Omit<PerformanceInsightsResult, 'cached'>;

  return { ...parsed, cached };
}
