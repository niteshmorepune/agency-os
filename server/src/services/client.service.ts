import { prisma } from '../lib/prisma';
import { JwtPayload, Role } from '@agencyos/shared';

function clientWhereForUser(user: JwtPayload) {
  if (user.role === Role.CLIENT) {
    return { agencyId: user.agencyId, assignments: { some: { userId: user.userId } } };
  }
  if ([Role.ACCOUNT_MANAGER, Role.CONTENT_CREATOR, Role.SEO_ANALYST].includes(user.role as Role)) {
    return { agencyId: user.agencyId, assignments: { some: { userId: user.userId } } };
  }
  return { agencyId: user.agencyId };
}

function computeHealth(status: string, avgScore: number | null): 'green' | 'yellow' | 'red' {
  if (status !== 'ACTIVE') return 'red';
  if (avgScore === null) return 'yellow';
  if (avgScore >= 70) return 'green';
  if (avgScore >= 40) return 'yellow';
  return 'red';
}

export async function listClients(user: JwtPayload, page = 1, limit = 20) {
  const where = clientWhereForUser(user);
  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, domain: true, brandName: true, industry: true, status: true, monthlyRetainer: true, contactEmail: true, createdAt: true },
    }),
    prisma.client.count({ where }),
  ]);

  const clientIds = clients.map(c => c.id);
  const platformGroups = await prisma.platformOptimization.groupBy({
    by: ['clientId'],
    where: { clientId: { in: clientIds } },
    _avg: { score: true },
  });
  const scoreMap: Record<string, number> = {};
  for (const g of platformGroups) {
    if (g._avg.score !== null) scoreMap[g.clientId] = Math.round(g._avg.score);
  }

  const enriched = clients.map(c => {
    const avgScore = scoreMap[c.id] ?? null;
    return { ...c, avgScore, health: computeHealth(c.status, avgScore) };
  });

  return { clients: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getClient(id: string, user: JwtPayload) {
  const client = await prisma.client.findFirst({
    where: { id, ...clientWhereForUser(user) },
    include: { assignments: { include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } } } },
  });
  if (!client) throw Object.assign(new Error('Client not found'), { statusCode: 404 });
  return client;
}

export async function createClient(data: {
  name: string; domain: string; brandName?: string; industry?: string;
  targetAudience?: string; competitors?: string[]; monthlyRetainer?: number;
  contactName?: string; contactEmail?: string; notes?: string;
}, user: JwtPayload) {
  return prisma.client.create({
    data: { ...data, agencyId: user.agencyId, competitors: data.competitors ?? [] },
  });
}

export async function updateClient(id: string, data: Record<string, unknown>, user: JwtPayload) {
  await getClient(id, user);
  return prisma.client.update({ where: { id }, data });
}

export async function deleteClient(id: string, user: JwtPayload) {
  await getClient(id, user);
  await prisma.client.delete({ where: { id } });
}

export async function assignTeamMember(clientId: string, userId: string, requestingUser: JwtPayload) {
  await getClient(clientId, requestingUser);
  return prisma.clientAssignment.upsert({
    where: { clientId_userId: { clientId, userId } },
    create: { clientId, userId },
    update: {},
  });
}

export async function removeTeamMember(clientId: string, userId: string, requestingUser: JwtPayload) {
  await getClient(clientId, requestingUser);
  await prisma.clientAssignment.deleteMany({ where: { clientId, userId } });
}

export async function getClientDashboard(clientId: string, user: JwtPayload) {
  const client = await getClient(clientId, user);
  const [platformScores, postCount, ideaCount] = await Promise.all([
    prisma.platformOptimization.findMany({ where: { clientId }, select: { platform: true, score: true } }),
    prisma.postDraft.count({ where: { clientId, status: { in: ['SCHEDULED', 'PUBLISHED'] } } }),
    prisma.contentIdea.count({ where: { clientId, status: 'SAVED' } }),
  ]);

  const overallScore = platformScores.length
    ? Math.round(platformScores.reduce((s: number, p: { score: number }) => s + p.score, 0) / platformScores.length)
    : 0;

  return { client, overallScore, platformScores, contentSummary: { scheduled: postCount, published: 0, ideas: ideaCount } };
}
