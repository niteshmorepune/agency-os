import { prisma } from './prisma';

export async function logActivity(params: {
  agencyId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.activityLog.create({ data: { ...params, metadata: params.metadata ?? undefined } as never });
  } catch { /* best-effort — never fail the parent request */ }
}
