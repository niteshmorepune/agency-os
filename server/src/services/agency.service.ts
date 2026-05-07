import { prisma } from '../lib/prisma';
import { JwtPayload } from '@agencyos/shared';
import { encrypt } from '../lib/encryption';

const MASKED = '••••••••';

export async function getAgency(user: JwtPayload) {
  const a = await prisma.agency.findUnique({ where: { id: user.agencyId } });
  if (!a) throw Object.assign(new Error('Agency not found'), { statusCode: 404 });
  return {
    id: a.id,
    name: a.name,
    logoUrl: a.logoUrl,
    primaryColor: a.primaryColor,
    accentColor: a.accentColor,
    fontFamily: a.fontFamily,
    reportTagline: a.reportTagline,
    reportFooter: a.reportFooter,
    aiMonthlyBudgetUsd: a.aiMonthlyBudgetUsd,
    apiKeys: {
      anthropicKey: a.anthropicKey ? MASKED : '',
      psiApiKey:    a.psiApiKey    ? MASKED : '',
      ahrefsKey:    a.ahrefsKey    ? MASKED : '',
      dataforseKey: a.dataforseKey ? MASKED : '',
      smtpHost:     a.smtpHost    ?? '',
      smtpUser:     a.smtpUser    ?? '',
      smtpPass:     a.smtpPass    ? MASKED : '',
    },
  };
}

export async function updateBranding(user: JwtPayload, data: {
  name?: string; primaryColor?: string; accentColor?: string;
  fontFamily?: string; reportTagline?: string; reportFooter?: string;
}) {
  return prisma.agency.update({
    where: { id: user.agencyId },
    data,
    select: { id: true, name: true, primaryColor: true, accentColor: true, fontFamily: true, reportTagline: true, reportFooter: true },
  });
}

export async function updateApiKeys(user: JwtPayload, data: {
  anthropicKey?: string; psiApiKey?: string; ahrefsKey?: string;
  dataforseKey?: string; smtpHost?: string; smtpUser?: string; smtpPass?: string;
}) {
  const updates: Record<string, string> = {};
  const secretFields = ['anthropicKey', 'psiApiKey', 'ahrefsKey', 'dataforseKey', 'smtpPass'] as const;
  const plainFields  = ['smtpHost', 'smtpUser'] as const;

  for (const f of secretFields) {
    const v = data[f];
    if (v && v !== MASKED) updates[f] = encrypt(v);
  }
  for (const f of plainFields) {
    const v = data[f];
    if (v !== undefined) updates[f] = v;
  }

  if (Object.keys(updates).length === 0) return { message: 'No changes' };
  await prisma.agency.update({ where: { id: user.agencyId }, data: updates });
  return { message: 'API keys updated' };
}

export async function updateBudget(user: JwtPayload, aiMonthlyBudgetUsd: number) {
  return prisma.agency.update({
    where: { id: user.agencyId },
    data: { aiMonthlyBudgetUsd },
    select: { id: true, aiMonthlyBudgetUsd: true },
  });
}
