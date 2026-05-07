import { CheckStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { JwtPayload, Platform } from '@agencyos/shared';
import { runAITool } from './ai/client';
import { PLATFORM_CHECKS } from '../lib/platformChecks';

export async function getOptimization(clientId: string, platform: Platform, user: JwtPayload) {
  let opt = await prisma.platformOptimization.findUnique({
    where: { clientId_platform: { clientId, platform } },
    include: { checks: true, scoreHistory: { orderBy: { recordedAt: 'asc' }, take: 30 } },
  });

  if (!opt) {
    const checks = PLATFORM_CHECKS[platform] ?? [];
    opt = await prisma.platformOptimization.create({
      data: {
        clientId,
        platform,
        checks: { create: checks.map(c => ({ checkId: c.id })) },
      },
      include: { checks: true, scoreHistory: true },
    });
  }

  void user;

  // Merge check definitions (name, description, benchmark, category, weight) into each check row
  const defs = PLATFORM_CHECKS[platform] ?? [];
  const enrichedChecks = opt.checks.map(c => {
    const def = defs.find(d => d.id === c.checkId);
    return { ...c, name: def?.name ?? c.checkId, description: def?.description, benchmark: def?.benchmark, category: def?.category ?? 'general', defWeight: def?.weight ?? c.score ?? 1, aiRewriteEnabled: def?.aiRewriteEnabled ?? false };
  });

  return { ...opt, checks: enrichedChecks };
}

export async function getAllOptimizations(clientId: string) {
  return prisma.platformOptimization.findMany({
    where: { clientId },
    select: { platform: true, score: true, updatedAt: true, _count: { select: { checks: true } } },
  });
}

export async function updateCheck(
  clientId: string,
  platform: Platform,
  checkId: string,
  data: { status?: CheckStatus; score?: number; notes?: string; manualInput?: string },
  user: JwtPayload
) {
  const opt = await prisma.platformOptimization.findUnique({ where: { clientId_platform: { clientId, platform } } });
  if (!opt) throw Object.assign(new Error('Optimization not found'), { statusCode: 404 });

  const check = await prisma.platformCheck.upsert({
    where: { optimizationId_checkId: { optimizationId: opt.id, checkId } },
    create: { optimizationId: opt.id, checkId, ...data },
    update: data,
  });

  await recalculateScore(opt.id, clientId, platform);
  void user;
  return check;
}

async function recalculateScore(optimizationId: string, clientId: string, platform: Platform) {
  const checks = await prisma.platformCheck.findMany({ where: { optimizationId } });
  const defs = PLATFORM_CHECKS[platform] ?? [];

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const check of checks) {
    const def = defs.find(d => d.id === check.checkId);
    const weight = def?.weight ?? 1;
    totalWeight += weight;
    if (check.status === 'PASS') earnedWeight += weight;
    else if (check.status === 'WARN') earnedWeight += weight * 0.5;
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  await prisma.platformOptimization.update({ where: { id: optimizationId }, data: { score } });
  await prisma.platformScoreHistory.create({ data: { optimizationId, score } });
  void clientId;
}

export async function getAISuggestion(clientId: string, platform: Platform, checkId: string, user: JwtPayload) {
  const client = await prisma.client.findFirst({ where: { id: clientId, agencyId: user.agencyId } });
  if (!client) throw Object.assign(new Error('Client not found'), { statusCode: 404 });

  const defs = PLATFORM_CHECKS[platform] ?? [];
  const checkDef = defs.find(d => d.id === checkId);
  if (!checkDef) throw Object.assign(new Error('Check not found'), { statusCode: 404 });

  const { result } = await runAITool({
    toolId: 'audit_suggest',
    systemPrompt: `You are an expert digital marketing strategist. Provide a specific, actionable improvement suggestion for this ${platform} optimization check. Be concise (3-5 sentences max). Include specific examples or metrics where possible.`,
    userPrompt: `Platform: ${platform}\nCheck: ${checkDef.name}\nDescription: ${checkDef.description ?? ''}\n\nProvide a specific, actionable recommendation.`,
    inputs: { platform, checkId, checkName: checkDef.name },
    user,
    clientId,
    clientContext: { brandName: client.brandName ?? client.name, industry: client.industry ?? undefined, targetAudience: client.targetAudience ?? undefined },
  });

  const opt = await prisma.platformOptimization.findUnique({ where: { clientId_platform: { clientId, platform } } });
  if (opt) {
    await prisma.platformCheck.updateMany({
      where: { optimizationId: opt.id, checkId },
      data: { aiSuggestion: result },
    });
  }

  return result;
}

export async function getActionItems(clientId: string, user: JwtPayload, limit = 20) {
  const client = await prisma.client.findFirst({ where: { id: clientId, agencyId: user.agencyId } });
  if (!client) throw Object.assign(new Error('Client not found'), { statusCode: 404 });

  const checks = await prisma.platformCheck.findMany({
    where: {
      status: { in: ['FAIL', 'WARN'] },
      optimization: { clientId },
    },
    include: { optimization: { select: { platform: true, score: true } } },
    orderBy: [{ status: 'asc' }],
    take: 100,
  });

  // Enrich with definition metadata and sort by weight desc
  const enriched = checks.map(c => {
    const defs = PLATFORM_CHECKS[c.optimization.platform] ?? [];
    const def = defs.find(d => d.id === c.checkId);
    return {
      id: c.id,
      checkId: c.checkId,
      platform: c.optimization.platform,
      platformScore: c.optimization.score,
      status: c.status,
      name: def?.name ?? c.checkId,
      description: def?.description,
      benchmark: def?.benchmark,
      category: def?.category ?? 'general',
      weight: def?.weight ?? 1,
      aiSuggestion: c.aiSuggestion,
    };
  }).sort((a, b) => b.weight - a.weight);

  return enriched.slice(0, limit);
}

export async function bulkAISuggestions(clientId: string, platform: Platform, user: JwtPayload) {
  const client = await prisma.client.findFirst({ where: { id: clientId, agencyId: user.agencyId } });
  if (!client) throw Object.assign(new Error('Client not found'), { statusCode: 404 });

  const opt = await prisma.platformOptimization.findUnique({ where: { clientId_platform: { clientId, platform } } });
  if (!opt) throw Object.assign(new Error('Platform not initialised — open it first'), { statusCode: 404 });

  const defs = PLATFORM_CHECKS[platform] ?? [];
  const checks = await prisma.platformCheck.findMany({
    where: { optimizationId: opt.id, status: { in: ['FAIL', 'WARN', 'PENDING'] }, aiSuggestion: null },
  });

  let processed = 0;
  for (const check of checks) {
    const def = defs.find(d => d.id === check.checkId);
    if (!def) continue;
    try {
      const { result } = await runAITool({
        toolId: 'audit_suggest',
        systemPrompt: `You are an expert digital marketing strategist. Give a specific, actionable improvement recommendation for this ${platform} check in 3–5 sentences. Include concrete examples or metrics.`,
        userPrompt: `Platform: ${platform}\nCheck: ${def.name}\nDescription: ${def.description ?? ''}\nBenchmark: ${def.benchmark ?? 'N/A'}\nStatus: ${check.status}\n\nProvide a targeted, actionable recommendation.`,
        inputs: { platform, checkId: check.checkId, status: check.status },
        user,
        clientId,
        clientContext: { brandName: client.brandName ?? client.name, industry: client.industry ?? undefined, targetAudience: client.targetAudience ?? undefined },
      });
      await prisma.platformCheck.update({ where: { id: check.id }, data: { aiSuggestion: result } });
      processed++;
    } catch {
      // skip on budget exceeded or other errors — continue processing remaining
    }
  }

  return { processed, total: checks.length };
}
