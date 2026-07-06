import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { buildCacheKey, getCached, setCached } from './cache';
import { TOKEN_BUDGETS, CACHE_TTL, COST_PER_INPUT_TOKEN, COST_PER_OUTPUT_TOKEN } from './budgets';
import { JwtPayload } from '@agencyos/shared';

const defaultClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-5';

interface ClientContext {
  brandName?: string;
  industry?: string;
  targetAudience?: string;
  competitors?: string[];
  notes?: string;
}

const CONTEXT_FIELD_MAP: Record<string, (keyof ClientContext)[]> = {
  caption: ['brandName', 'industry', 'targetAudience'],
  ad: ['brandName', 'industry', 'targetAudience', 'competitors'],
  persona: ['industry', 'targetAudience', 'notes', 'competitors'],
  hashtag: ['industry', 'brandName'],
  bio: ['brandName', 'industry', 'targetAudience'],
  default: ['brandName', 'industry'],
};

function buildContextSnippet(toolId: string, ctx: ClientContext): string {
  const fields = CONTEXT_FIELD_MAP[toolId] ?? CONTEXT_FIELD_MAP.default;
  return fields
    .map(f => `${f}: ${Array.isArray(ctx[f]) ? (ctx[f] as string[]).join(', ') : ctx[f] ?? 'not specified'}`)
    .join('\n');
}

async function checkBudget(clientId: string | undefined, agencyId: string): Promise<void> {
  if (!clientId) return;
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [spent, client] = await Promise.all([
    prisma.aIUsageLog.aggregate({
      where: { clientId, createdAt: { gte: startOfMonth } },
      _sum: { costUsd: true },
    }),
    prisma.client.findUnique({
      where: { id: clientId },
      select: { aiMonthlyBudgetUsd: true, agency: { select: { aiMonthlyBudgetUsd: true } } },
    }),
  ]);
  const budget = client?.aiMonthlyBudgetUsd ?? client?.agency?.aiMonthlyBudgetUsd ?? 20;
  if ((spent._sum.costUsd ?? 0) >= budget) {
    throw Object.assign(new Error('BUDGET_EXCEEDED'), { statusCode: 429 });
  }
  void agencyId;
}

async function logUsage(params: {
  userId: string;
  clientId?: string;
  toolId: string;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
}): Promise<void> {
  const costUsd = params.inputTokens * COST_PER_INPUT_TOKEN + params.outputTokens * COST_PER_OUTPUT_TOKEN;
  await prisma.aIUsageLog.create({
    data: {
      userId: params.userId,
      clientId: params.clientId,
      toolId: params.toolId,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd,
      cached: params.cached,
    },
  });
}

export async function runAITool(params: {
  toolId: string;
  systemPrompt: string;
  userPrompt: string;
  inputs: Record<string, string>;
  user: JwtPayload;
  clientId?: string;
  clientContext?: ClientContext;
  forceRefresh?: boolean;
  enableWebSearch?: boolean;
}): Promise<{ result: string; cached: boolean }> {
  await checkBudget(params.clientId, params.user.agencyId);

  const cacheKey = buildCacheKey(params.toolId, params.inputs);
  if (!params.forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      await logUsage({ userId: params.user.userId, clientId: params.clientId, toolId: params.toolId, inputTokens: 0, outputTokens: 0, cached: true });
      return { result: cached, cached: true };
    }
  }

  const maxTokens = TOKEN_BUDGETS[params.toolId] ?? 800;
  const contextSnippet = params.clientContext ? buildContextSnippet(params.toolId, params.clientContext) : '';
  const fullSystem = `${params.systemPrompt}${contextSnippet ? `\n\nClient context:\n${contextSnippet}` : ''}`;

  const response = await defaultClient.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: fullSystem,
    messages: [{ role: 'user', content: params.userPrompt }],
    ...(params.enableWebSearch
      ? { tools: [{ type: 'web_search_20250305' as const, name: 'web_search' as const, max_uses: 4 }] }
      : {}),
  });

  // With web search enabled, content also contains server_tool_use /
  // web_search_tool_result blocks, and Claude may emit intermediate text
  // ("Let me search for...") before its final answer — take the LAST text
  // block, not index 0.
  let result = '';
  for (let i = response.content.length - 1; i >= 0; i--) {
    const block = response.content[i];
    if (block.type === 'text') {
      result = block.text;
      break;
    }
  }
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  const ttl = CACHE_TTL[params.toolId] ?? 86400;
  setCached(cacheKey, result, ttl);

  await logUsage({ userId: params.user.userId, clientId: params.clientId, toolId: params.toolId, inputTokens, outputTokens, cached: false });

  logger.info({ msg: 'AI tool executed', toolId: params.toolId, inputTokens, outputTokens });

  return { result, cached: false };
}
