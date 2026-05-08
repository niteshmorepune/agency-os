import { AuditCheckStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '@agencyos/shared';
import { runAITool } from './ai/client';
import { AUDIT_MODULES, AUDIT_MODULE_MAP, getAllCheckDefs } from '../lib/auditChecks';

function auditWhereForUser(clientId: string, user: JwtPayload) {
  return { clientId, client: { agencyId: user.agencyId } };
}

export async function listAudits(clientId: string, user: JwtPayload) {
  return prisma.auditProject.findMany({
    where: auditWhereForUser(clientId, user),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, status: true, overallScore: true, createdAt: true, updatedAt: true,
      _count: { select: { checks: true } },
    },
  });
}

export async function createAudit(clientId: string, name: string, user: JwtPayload) {
  const client = await prisma.client.findFirst({ where: { id: clientId, agencyId: user.agencyId } });
  if (!client) throw Object.assign(new Error('Client not found'), { statusCode: 404 });

  const allChecks = getAllCheckDefs();
  return prisma.auditProject.create({
    data: {
      clientId,
      name,
      checks: {
        create: allChecks.map(({ moduleId, check }) => ({
          moduleId,
          checkId: check.id,
          weight: check.weight,
        })),
      },
    },
    include: { _count: { select: { checks: true } } },
  });
}

export async function getAudit(clientId: string, auditId: string, user: JwtPayload) {
  const audit = await prisma.auditProject.findFirst({
    where: { id: auditId, ...auditWhereForUser(clientId, user) },
    include: {
      checks: {
        orderBy: { moduleId: 'asc' },
      },
      notes: {
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!audit) throw Object.assign(new Error('Audit not found'), { statusCode: 404 });

  const moduleProgress = AUDIT_MODULES.map(mod => {
    const modChecks = audit.checks.filter(c => c.moduleId === mod.id);
    const passed = modChecks.filter(c => c.status === 'PASS').length;
    const warned = modChecks.filter(c => c.status === 'WARN').length;
    const failed = modChecks.filter(c => c.status === 'FAIL').length;
    const pending = modChecks.filter(c => c.status === 'PENDING').length;
    const scored = modChecks.filter(c => c.status !== 'PENDING' && c.status !== 'NA');
    const totalWeight = scored.reduce((s, c) => s + c.weight, 0);
    const earnedWeight = scored.reduce((s, c) => {
      if (c.status === 'PASS') return s + c.weight;
      if (c.status === 'WARN') return s + c.weight * 0.5;
      return s;
    }, 0);
    const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : null;
    return { moduleId: mod.id, name: mod.name, icon: mod.icon, score, passed, warned, failed, pending, total: modChecks.length };
  });

  return { ...audit, moduleProgress };
}

export async function updateCheck(
  clientId: string,
  auditId: string,
  checkDbId: string,
  data: { status?: AuditCheckStatus; score?: number; data?: Record<string, unknown> | null; aiSuggestion?: string },
  user: JwtPayload
) {
  const audit = await prisma.auditProject.findFirst({
    where: { id: auditId, ...auditWhereForUser(clientId, user) },
  });
  if (!audit) throw Object.assign(new Error('Audit not found'), { statusCode: 404 });

  const check = await prisma.auditCheck.update({
    where: { id: checkDbId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { ...data, data: data.data as any, lastCheckedAt: new Date() },
  });

  await recalculateScore(auditId);
  return check;
}

async function recalculateScore(auditId: string) {
  const checks = await prisma.auditCheck.findMany({ where: { auditId } });
  const scored = checks.filter(c => c.status !== 'PENDING' && c.status !== 'NA');
  const totalWeight = scored.reduce((s, c) => s + c.weight, 0);
  const earnedWeight = scored.reduce((s, c) => {
    if (c.status === 'PASS') return s + c.weight;
    if (c.status === 'WARN') return s + c.weight * 0.5;
    return s;
  }, 0);
  const overallScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : null;
  await prisma.auditProject.update({ where: { id: auditId }, data: { overallScore } });
}

export async function completeAudit(clientId: string, auditId: string, user: JwtPayload) {
  const audit = await prisma.auditProject.findFirst({
    where: { id: auditId, ...auditWhereForUser(clientId, user) },
  });
  if (!audit) throw Object.assign(new Error('Audit not found'), { statusCode: 404 });
  await recalculateScore(auditId);
  const completed = await prisma.auditProject.update({ where: { id: auditId }, data: { status: 'COMPLETED' } });

  const { createNotification } = await import('../lib/notify');
  const assignments = await prisma.clientAssignment.findMany({
    where: { clientId },
    select: { userId: true },
  });
  await Promise.all(
    assignments
      .filter(a => a.userId !== user.userId)
      .map(a => createNotification({
        agencyId: user.agencyId,
        userId: a.userId,
        type: 'AUDIT_COMPLETED',
        title: 'Audit completed',
        body: `"${audit.name}" is complete with a score of ${completed.overallScore ?? 0}.`,
        link: `/audit/${clientId}/${auditId}`,
      }))
  );

  return completed;
}

export async function getAISuggestion(
  clientId: string,
  auditId: string,
  checkDbId: string,
  user: JwtPayload
) {
  const [client, auditCheck] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, agencyId: user.agencyId } }),
    prisma.auditCheck.findUnique({ where: { id: checkDbId } }),
  ]);
  if (!client) throw Object.assign(new Error('Client not found'), { statusCode: 404 });
  if (!auditCheck) throw Object.assign(new Error('Check not found'), { statusCode: 404 });

  const modDef = AUDIT_MODULE_MAP[auditCheck.moduleId];
  const checkDef = modDef?.checks.find(c => c.id === auditCheck.checkId);
  if (!checkDef) throw Object.assign(new Error('Check definition not found'), { statusCode: 404 });

  const { result } = await runAITool({
    toolId: 'audit_suggest',
    systemPrompt: `You are a senior digital marketing auditor. Provide a specific, actionable improvement recommendation for this audit check. Be concise (4-6 sentences). Include concrete steps, tools to use, or metrics to target.`,
    userPrompt: `Module: ${modDef.name}\nCheck: ${checkDef.name}\nDescription: ${checkDef.description ?? ''}\nBenchmark: ${checkDef.benchmark ?? 'N/A'}\nCurrent status: ${auditCheck.status}\n\nProvide a specific, prioritised recommendation for improving this.`,
    inputs: { moduleId: auditCheck.moduleId, checkId: auditCheck.checkId, status: auditCheck.status },
    user,
    clientId,
    clientContext: {
      brandName: client.brandName ?? client.name,
      industry: client.industry ?? undefined,
      targetAudience: client.targetAudience ?? undefined,
    },
  });

  await prisma.auditCheck.update({ where: { id: checkDbId }, data: { aiSuggestion: result } });
  return result;
}

export async function addNote(
  clientId: string,
  auditId: string,
  content: string,
  checkDbId: string | undefined,
  isInternal: boolean,
  user: JwtPayload
) {
  const audit = await prisma.auditProject.findFirst({
    where: { id: auditId, ...auditWhereForUser(clientId, user) },
  });
  if (!audit) throw Object.assign(new Error('Audit not found'), { statusCode: 404 });
  return prisma.auditNote.create({
    data: {
      auditId,
      checkId: checkDbId,
      authorId: user.userId,
      content,
      isInternal,
      mentions: [],
    },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

export async function deleteAudit(clientId: string, auditId: string, user: JwtPayload) {
  const audit = await prisma.auditProject.findFirst({
    where: { id: auditId, ...auditWhereForUser(clientId, user) },
  });
  if (!audit) throw Object.assign(new Error('Audit not found'), { statusCode: 404 });
  await prisma.auditProject.delete({ where: { id: auditId } });
}
