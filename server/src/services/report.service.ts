import puppeteer from 'puppeteer';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '@agencyos/shared';
import { AUDIT_MODULE_MAP } from '../lib/auditChecks';
import { PLATFORM_CHECKS } from '../lib/platformChecks';

function scoreColor(score: number | null): string {
  if (score === null) return '#94a3b8';
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#d97706';
  return '#dc2626';
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    PASS: 'background:#dcfce7;color:#166534',
    WARN: 'background:#fef9c3;color:#854d0e',
    FAIL: 'background:#fee2e2;color:#991b1b',
    PENDING: 'background:#f1f5f9;color:#475569',
    NA: 'background:#f1f5f9;color:#94a3b8',
  };
  return map[status] ?? map.PENDING;
}

function buildReportHtml(data: {
  agencyName: string;
  primaryColor: string;
  accentColor: string;
  reportTagline: string | null;
  reportFooter: string | null;
  clientName: string;
  clientDomain: string;
  auditName: string;
  overallScore: number | null;
  createdAt: Date;
  moduleProgress: {
    moduleId: string;
    name: string;
    icon: string;
    score: number | null;
    passed: number;
    warned: number;
    failed: number;
    pending: number;
    total: number;
  }[];
  checks: {
    id: string;
    moduleId: string;
    checkId: string;
    status: string;
    score: number | null;
    aiSuggestion: string | null;
    data: unknown;
    weight: number;
  }[];
}): string {
  const primary = data.primaryColor || '#1a472a';
  const accent = data.accentColor || '#c8522a';
  const date = new Date(data.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  const moduleSections = data.moduleProgress.map(mod => {
    const modChecks = data.checks.filter(c => c.moduleId === mod.moduleId);
    const modDef = AUDIT_MODULE_MAP[mod.moduleId];
    const checkRows = modChecks.map(c => {
      const checkDef = modDef?.checks.find(d => d.id === c.checkId);
      return `
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:10px 12px;font-size:13px;color:#374151;max-width:260px">
            <div style="font-weight:500">${checkDef?.name ?? c.checkId}</div>
            ${checkDef?.description ? `<div style="color:#6b7280;font-size:11px;margin-top:2px">${checkDef.description}</div>` : ''}
          </td>
          <td style="padding:10px 12px;text-align:center">
            <span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:12px;${statusBadge(c.status)}">${c.status}</span>
          </td>
          <td style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:500">${c.weight}×</td>
          <td style="padding:10px 12px;font-size:12px;color:#374151;max-width:260px">${c.aiSuggestion ?? '—'}</td>
        </tr>`;
    }).join('');

    const scoreDisplay = mod.score !== null ? `${mod.score}` : '—';
    const scoreCol = scoreColor(mod.score);

    return `
      <div style="margin-bottom:32px;break-inside:avoid">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:${primary}10;border-left:4px solid ${primary};border-radius:0 8px 8px 0;margin-bottom:4px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:20px">${mod.icon}</span>
            <div>
              <div style="font-weight:700;font-size:15px;color:#111827">${mod.name}</div>
              <div style="font-size:11px;color:#6b7280">${mod.passed} passed · ${mod.warned} warnings · ${mod.failed} failed · ${mod.pending} pending</div>
            </div>
          </div>
          <div style="text-align:center">
            <div style="font-size:26px;font-weight:800;color:${scoreCol}">${scoreDisplay}</div>
            <div style="font-size:10px;color:#9ca3af">/ 100</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:9px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Check</th>
              <th style="padding:9px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Status</th>
              <th style="padding:9px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Weight</th>
              <th style="padding:9px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em">AI Recommendation</th>
            </tr>
          </thead>
          <tbody>${checkRows}</tbody>
        </table>
      </div>`;
  }).join('');

  const overallDisplay = data.overallScore !== null ? `${data.overallScore}` : '—';
  const overallColorHex = scoreColor(data.overallScore);

  const totalChecks = data.checks.length;
  const passedTotal = data.checks.filter(c => c.status === 'PASS').length;
  const warnTotal = data.checks.filter(c => c.status === 'WARN').length;
  const failTotal = data.checks.filter(c => c.status === 'FAIL').length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0;padding:0;box-sizing:border-box }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#111827; background:#fff; font-size:13px; line-height:1.5 }
  @page { size: A4; margin: 16mm 14mm }
</style>
</head>
<body>

<!-- Cover / Header -->
<div style="background:linear-gradient(135deg,${primary} 0%,${accent} 100%);padding:40px 48px;border-radius:12px;margin-bottom:28px;color:#fff">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;opacity:.75;margin-bottom:6px">${data.agencyName}</div>
      <h1 style="font-size:28px;font-weight:800;line-height:1.2;margin-bottom:6px">Digital Marketing Audit</h1>
      <div style="font-size:16px;opacity:.9;font-weight:500">${data.clientName}</div>
      <div style="font-size:13px;opacity:.7;margin-top:4px">${data.clientDomain} · ${data.auditName}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:52px;font-weight:900;line-height:1;color:${overallColorHex}">${overallDisplay}</div>
      <div style="font-size:13px;opacity:.8">Overall Score</div>
      <div style="font-size:11px;opacity:.6;margin-top:4px">${date}</div>
    </div>
  </div>
  ${data.reportTagline ? `<div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,.25);font-size:13px;opacity:.8;font-style:italic">${data.reportTagline}</div>` : ''}
</div>

<!-- Summary Stats -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px">
  ${[
    { label: 'Total Checks', value: totalChecks, color: '#6b7280' },
    { label: 'Passed', value: passedTotal, color: '#16a34a' },
    { label: 'Warnings', value: warnTotal, color: '#d97706' },
    { label: 'Failed', value: failTotal, color: '#dc2626' },
  ].map(s => `
    <div style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;border:1px solid #e5e7eb">
      <div style="font-size:28px;font-weight:800;color:${s.color}">${s.value}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:.05em">${s.label}</div>
    </div>`).join('')}
</div>

<!-- Module Score Overview -->
<div style="margin-bottom:28px;background:#f8fafc;border-radius:12px;padding:20px;border:1px solid #e5e7eb">
  <h2 style="font-size:14px;font-weight:700;color:#374151;margin-bottom:14px;text-transform:uppercase;letter-spacing:.05em">Module Scores</h2>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
    ${data.moduleProgress.map(mod => `
      <div style="text-align:center;background:#fff;border-radius:8px;padding:12px 8px;border:1px solid #e5e7eb">
        <div style="font-size:18px;margin-bottom:4px">${mod.icon}</div>
        <div style="font-size:20px;font-weight:800;color:${scoreColor(mod.score)}">${mod.score ?? '—'}</div>
        <div style="font-size:10px;color:#6b7280;margin-top:2px;line-height:1.3">${mod.name}</div>
      </div>`).join('')}
  </div>
</div>

<!-- Detailed Module Sections -->
<h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid ${primary}20">Detailed Findings</h2>
${moduleSections}

<!-- Footer -->
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px">
  ${data.reportFooter ? `<p style="margin-bottom:4px">${data.reportFooter}</p>` : ''}
  <p>Prepared by ${data.agencyName} · ${date} · Confidential</p>
</div>

</body>
</html>`;
}

export async function generateAuditReport(clientId: string, auditId: string, user: JwtPayload): Promise<Buffer> {
  const [audit, agency, client] = await Promise.all([
    prisma.auditProject.findFirst({
      where: { id: auditId, client: { agencyId: user.agencyId } },
      include: { checks: true },
    }),
    prisma.agency.findUnique({ where: { id: user.agencyId } }),
    prisma.client.findFirst({ where: { id: clientId, agencyId: user.agencyId } }),
  ]);

  if (!audit || !agency || !client) {
    throw Object.assign(new Error('Audit not found'), { statusCode: 404 });
  }

  const moduleProgress = Object.entries(
    audit.checks.reduce<Record<string, typeof audit.checks>>((acc, c) => {
      (acc[c.moduleId] ??= []).push(c);
      return acc;
    }, {})
  ).map(([moduleId, modChecks]) => {
    const modDef = AUDIT_MODULE_MAP[moduleId];
    const scored = modChecks.filter(c => c.status !== 'PENDING' && c.status !== 'NA');
    const totalWeight = scored.reduce((s, c) => s + c.weight, 0);
    const earnedWeight = scored.reduce((s, c) => {
      if (c.status === 'PASS') return s + c.weight;
      if (c.status === 'WARN') return s + c.weight * 0.5;
      return s;
    }, 0);
    return {
      moduleId,
      name: modDef?.name ?? moduleId,
      icon: modDef?.icon ?? '📋',
      score: totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : null,
      passed: modChecks.filter(c => c.status === 'PASS').length,
      warned: modChecks.filter(c => c.status === 'WARN').length,
      failed: modChecks.filter(c => c.status === 'FAIL').length,
      pending: modChecks.filter(c => c.status === 'PENDING').length,
      total: modChecks.length,
    };
  });

  const html = buildReportHtml({
    agencyName: agency.name,
    primaryColor: agency.primaryColor,
    accentColor: agency.accentColor,
    reportTagline: agency.reportTagline,
    reportFooter: agency.reportFooter,
    clientName: client.name,
    clientDomain: client.domain,
    auditName: audit.name,
    overallScore: audit.overallScore,
    createdAt: audit.createdAt,
    moduleProgress,
    checks: audit.checks.map(c => ({
      id: c.id,
      moduleId: c.moduleId,
      checkId: c.checkId,
      status: c.status,
      score: c.score,
      aiSuggestion: c.aiSuggestion,
      data: c.data,
      weight: c.weight,
    })),
  });

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function renderToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

const PLATFORM_DISPLAY: Record<string, string> = {
  LINKEDIN: 'LinkedIn', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook',
  GBP: 'Google Biz', YOUTUBE: 'YouTube', TWITTER: 'X/Twitter',
  TIKTOK: 'TikTok', PINTEREST: 'Pinterest', GOOGLE_ADS: 'Google Ads',
  EMAIL: 'Email', WHATSAPP: 'WhatsApp',
};

const PLATFORM_ORDER = ['LINKEDIN','INSTAGRAM','FACEBOOK','GBP','YOUTUBE','TWITTER','TIKTOK','PINTEREST','GOOGLE_ADS','EMAIL','WHATSAPP'];

function scoreBarHtml(score: number, maxWidth = 120): string {
  const color = scoreColor(score);
  const w = Math.round((score / 100) * maxWidth);
  return `<div style="display:inline-flex;align-items:center;gap:6px">
    <div style="width:${maxWidth}px;background:#f1f5f9;border-radius:4px;height:7px;overflow:hidden;flex-shrink:0">
      <div style="background:${color};height:7px;width:${w}px;border-radius:4px"></div>
    </div>
    <span style="font-size:12px;font-weight:700;color:${color};min-width:24px">${score}</span>
  </div>`;
}

function basePageStyles(primary: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
  <style>
    * { margin:0;padding:0;box-sizing:border-box }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;background:#fff;font-size:13px;line-height:1.5 }
    @page { size:A4;margin:14mm 12mm }
    h2 { font-size:14px;font-weight:700;color:#374151;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid ${primary}25;text-transform:uppercase;letter-spacing:.04em }
    table { width:100%;border-collapse:collapse }
    th { padding:8px 10px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;background:#f8fafc }
    td { padding:9px 10px;font-size:12px;border-bottom:1px solid #f1f5f9;vertical-align:middle }
    .badge { display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px }
  </style></head><body>`;
}

// ─── Monthly Agency Report ────────────────────────────────────────────────────

export async function generateMonthlyReport(user: JwtPayload, year: number, month: number): Promise<Buffer> {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  const monthLabel = startOfMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const generatedDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const [agency, clients, optimizations, postGroups, thisMonthPosts, audits, aiUsage] = await Promise.all([
    prisma.agency.findUnique({ where: { id: user.agencyId } }),
    prisma.client.findMany({ where: { agencyId: user.agencyId }, select: { id: true, name: true, domain: true, industry: true, status: true } }),
    prisma.platformOptimization.findMany({
      where: { client: { agencyId: user.agencyId } },
      select: { platform: true, score: true, clientId: true, client: { select: { name: true } } },
    }),
    prisma.postDraft.groupBy({
      by: ['status'],
      where: { client: { agencyId: user.agencyId } },
      _count: true,
    }),
    prisma.postDraft.count({
      where: { client: { agencyId: user.agencyId }, createdAt: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.auditProject.findMany({
      where: { client: { agencyId: user.agencyId }, status: 'COMPLETED' },
      select: { overallScore: true, name: true, client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.aIUsageLog.aggregate({
      where: { user: { agencyId: user.agencyId }, createdAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { costUsd: true },
      _count: true,
    }),
  ]);

  if (!agency) throw Object.assign(new Error('Agency not found'), { statusCode: 404 });

  const primary = agency.primaryColor || '#1a472a';
  const accent = agency.accentColor || '#c8522a';
  const activeClients = clients.filter(c => c.status === 'ACTIVE');

  // Platform avg scores
  const byPlatform: Record<string, { total: number; count: number }> = {};
  for (const opt of optimizations) {
    if (opt.score === 0) continue;
    byPlatform[opt.platform] ??= { total: 0, count: 0 };
    byPlatform[opt.platform].total += opt.score;
    byPlatform[opt.platform].count += 1;
  }
  const platformScores = PLATFORM_ORDER
    .filter(p => byPlatform[p])
    .map(p => ({ platform: p, avgScore: Math.round(byPlatform[p].total / byPlatform[p].count), clients: byPlatform[p].count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const overallAvg = platformScores.length > 0
    ? Math.round(platformScores.reduce((s, p) => s + p.avgScore, 0) / platformScores.length)
    : 0;

  // Per-client avg scores
  const byClient: Record<string, { name: string; total: number; count: number }> = {};
  for (const opt of optimizations) {
    if (opt.score === 0) continue;
    byClient[opt.clientId] ??= { name: opt.client.name, total: 0, count: 0 };
    byClient[opt.clientId].total += opt.score;
    byClient[opt.clientId].count += 1;
  }
  const clientScores = Object.entries(byClient)
    .map(([, { name, total, count }]) => ({ name, avgScore: Math.round(total / count), platforms: count }))
    .sort((a, b) => a.avgScore - b.avgScore);

  // Post status counts
  const postsByStatus: Record<string, number> = {};
  for (const row of postGroups) postsByStatus[row.status] = row._count;

  // AI usage
  const aiCost = aiUsage._sum.costUsd ?? 0;
  const aiCalls = aiUsage._count;

  // Top action items across all clients
  const topChecks = await prisma.platformCheck.findMany({
    where: { status: { in: ['FAIL', 'WARN'] }, optimization: { client: { agencyId: user.agencyId } } },
    include: { optimization: { select: { platform: true, client: { select: { name: true } } } } },
    take: 200,
  });
  const enrichedChecks = topChecks
    .map(c => {
      const defs = PLATFORM_CHECKS[c.optimization.platform] ?? [];
      const def = defs.find(d => d.id === c.checkId);
      return { name: def?.name ?? c.checkId, platform: c.optimization.platform, client: c.optimization.client.name, status: c.status, weight: def?.weight ?? 1 };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);

  const platformScoreRows = platformScores.map(p => `
    <tr>
      <td style="font-weight:500">${PLATFORM_DISPLAY[p.platform] ?? p.platform}</td>
      <td>${scoreBarHtml(p.avgScore)}</td>
      <td style="text-align:center;color:#6b7280">${p.clients} client${p.clients !== 1 ? 's' : ''}</td>
      <td><span class="badge" style="background:${scoreColor(p.avgScore)}20;color:${scoreColor(p.avgScore)}">${p.avgScore >= 80 ? 'Good' : p.avgScore >= 60 ? 'Fair' : 'Needs Work'}</span></td>
    </tr>`).join('');

  const clientRows = clientScores.map((c, i) => `
    <tr>
      <td style="color:#6b7280;font-weight:500">${i + 1}</td>
      <td style="font-weight:600;color:#111827">${c.name}</td>
      <td style="text-align:center">${c.platforms}</td>
      <td>${scoreBarHtml(c.avgScore)}</td>
    </tr>`).join('');

  const actionRows = enrichedChecks.map(c => `
    <tr>
      <td style="font-weight:500;color:#111827">${c.name}</td>
      <td><span class="badge" style="background:${c.status === 'FAIL' ? '#fee2e2' : '#fef9c3'};color:${c.status === 'FAIL' ? '#991b1b' : '#854d0e'}">${c.status}</span></td>
      <td style="color:#6b7280">${PLATFORM_DISPLAY[c.platform] ?? c.platform}</td>
      <td style="color:#6b7280">${c.client}</td>
      <td style="text-align:center;color:#6b7280">${c.weight}×</td>
    </tr>`).join('');

  const auditRows = audits.slice(0, 6).map(a => `
    <tr>
      <td style="font-weight:500">${a.client.name}</td>
      <td>${a.name}</td>
      <td>${a.overallScore !== null ? scoreBarHtml(a.overallScore, 80) : '<span style="color:#94a3b8">—</span>'}</td>
    </tr>`).join('');

  const html = `${basePageStyles(primary)}

<!-- Cover -->
<div style="background:linear-gradient(135deg,${primary} 0%,${accent} 100%);padding:44px 48px;border-radius:12px;margin-bottom:28px;color:#fff">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;opacity:.7;margin-bottom:8px">${agency.name}</div>
      <h1 style="font-size:30px;font-weight:800;line-height:1.15;margin-bottom:8px">Monthly Performance Report</h1>
      <div style="font-size:18px;font-weight:600;opacity:.9">${monthLabel}</div>
      <div style="margin-top:16px;display:flex;gap:20px">
        <div style="opacity:.85;font-size:13px">${activeClients.length} active client${activeClients.length !== 1 ? 's' : ''}</div>
        <div style="opacity:.85;font-size:13px">${platformScores.length} platform${platformScores.length !== 1 ? 's' : ''} tracked</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:60px;font-weight:900;line-height:1;color:${overallAvg >= 80 ? '#86efac' : overallAvg >= 60 ? '#fde68a' : '#fca5a5'}">${overallAvg || '—'}</div>
      <div style="font-size:13px;opacity:.8">Overall Avg Score</div>
      <div style="font-size:11px;opacity:.6;margin-top:4px">Generated ${generatedDate}</div>
    </div>
  </div>
  ${agency.reportTagline ? `<div style="margin-top:18px;padding-top:18px;border-top:1px solid rgba(255,255,255,.25);font-size:12px;opacity:.75;font-style:italic">${agency.reportTagline}</div>` : ''}
</div>

<!-- Summary Cards -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:28px">
${[
    { label: 'Active Clients', value: String(activeClients.length), color: '#2563eb' },
    { label: 'Posts This Month', value: String(thisMonthPosts), color: '#7c3aed' },
    { label: 'Avg Platform Score', value: overallAvg ? String(overallAvg) : '—', color: primary },
    { label: `AI Cost (${monthLabel.split(' ')[0]})`, value: `$${aiCost.toFixed(4)}`, color: '#d97706' },
  ].map(s => `
  <div style="background:#f8fafc;border-radius:10px;padding:14px;text-align:center;border:1px solid #e5e7eb">
    <div style="font-size:24px;font-weight:800;color:${s.color}">${s.value}</div>
    <div style="font-size:10px;color:#6b7280;margin-top:3px;text-transform:uppercase;letter-spacing:.05em">${s.label}</div>
  </div>`).join('')}
</div>

${platformScores.length > 0 ? `
<!-- Platform Performance -->
<div style="margin-bottom:28px">
  <h2>Platform Performance</h2>
  <table>
    <thead><tr><th>Platform</th><th>Avg Score</th><th>Coverage</th><th>Status</th></tr></thead>
    <tbody>${platformScoreRows}</tbody>
  </table>
</div>` : ''}

${clientScores.length > 0 ? `
<!-- Client Overview -->
<div style="margin-bottom:28px">
  <h2>Client Overview</h2>
  <table>
    <thead><tr><th>#</th><th>Client</th><th style="text-align:center">Platforms</th><th>Avg Score</th></tr></thead>
    <tbody>${clientRows}</tbody>
  </table>
</div>` : ''}

<!-- Content Activity -->
<div style="margin-bottom:28px">
  <h2>Content Activity — ${monthLabel}</h2>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
  ${['DRAFT','SCHEDULED','PUBLISHED','FAILED','ARCHIVED'].map(s => `
    <div style="background:#f8fafc;border-radius:8px;padding:12px;text-align:center;border:1px solid #e5e7eb">
      <div style="font-size:22px;font-weight:800;color:${s === 'PUBLISHED' ? '#16a34a' : s === 'SCHEDULED' ? '#2563eb' : s === 'FAILED' ? '#dc2626' : '#6b7280'}">${postsByStatus[s] ?? 0}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:.04em">${s.charAt(0) + s.slice(1).toLowerCase()}</div>
    </div>`).join('')}
  </div>
</div>

<!-- AI Usage -->
<div style="margin-bottom:28px">
  <h2>AI Studio Usage — ${monthLabel}</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
  ${[
    { label: 'Total Calls', value: String(aiCalls), color: '#111827' },
    { label: 'Total Cost', value: `$${aiCost.toFixed(4)}`, color: '#d97706' },
    { label: 'Cost (INR)', value: `₹${(aiCost * 84).toFixed(2)}`, color: '#7c3aed' },
  ].map(s => `
    <div style="background:#f8fafc;border-radius:8px;padding:14px;text-align:center;border:1px solid #e5e7eb">
      <div style="font-size:22px;font-weight:800;color:${s.color}">${s.value}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:.04em">${s.label}</div>
    </div>`).join('')}
  </div>
</div>

${audits.length > 0 ? `
<!-- Recent Audits -->
<div style="margin-bottom:28px">
  <h2>Completed Audits</h2>
  <table>
    <thead><tr><th>Client</th><th>Audit Name</th><th>Score</th></tr></thead>
    <tbody>${auditRows}</tbody>
  </table>
</div>` : ''}

${enrichedChecks.length > 0 ? `
<!-- Priority Action Items -->
<div style="margin-bottom:28px">
  <h2>Priority Action Items</h2>
  <table>
    <thead><tr><th>Check</th><th>Status</th><th>Platform</th><th>Client</th><th style="text-align:center">Weight</th></tr></thead>
    <tbody>${actionRows}</tbody>
  </table>
</div>` : ''}

<!-- Footer -->
<div style="margin-top:28px;padding-top:14px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px">
  ${agency.reportFooter ? `<p style="margin-bottom:4px">${agency.reportFooter}</p>` : ''}
  <p>Prepared by ${agency.name} · ${generatedDate} · Confidential</p>
</div>

</body></html>`;

  return renderToPdf(html);
}

// ─── Per-Client Report ────────────────────────────────────────────────────────

export async function generateClientReport(clientId: string, user: JwtPayload): Promise<Buffer> {
  const generatedDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [agency, client, optimizations, recentPosts, lastAudit] = await Promise.all([
    prisma.agency.findUnique({ where: { id: user.agencyId } }),
    prisma.client.findFirst({ where: { id: clientId, agencyId: user.agencyId } }),
    prisma.platformOptimization.findMany({
      where: { clientId, client: { agencyId: user.agencyId } },
      select: { platform: true, score: true, updatedAt: true, _count: { select: { checks: true } } },
    }),
    prisma.postDraft.findMany({
      where: { clientId, client: { agencyId: user.agencyId }, status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { caption: true, platforms: true, status: true, createdAt: true, scheduledAt: true },
    }),
    prisma.auditProject.findFirst({
      where: { clientId, client: { agencyId: user.agencyId }, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { name: true, overallScore: true, createdAt: true },
    }),
  ]);

  if (!agency || !client) throw Object.assign(new Error('Not found'), { statusCode: 404 });

  const primary = agency.primaryColor || '#1a472a';
  const accent = agency.accentColor || '#c8522a';

  // Platform score map
  const optMap: Record<string, { score: number; checks: number; updatedAt: Date }> = {};
  for (const opt of optimizations) {
    optMap[opt.platform] = { score: opt.score, checks: opt._count.checks, updatedAt: opt.updatedAt };
  }

  const activePlatforms = optimizations.filter(o => o.score > 0);
  const avgScore = activePlatforms.length > 0
    ? Math.round(activePlatforms.reduce((s, o) => s + o.score, 0) / activePlatforms.length)
    : 0;

  // Top action items for this client
  const failChecks = await prisma.platformCheck.findMany({
    where: { status: { in: ['FAIL', 'WARN'] }, optimization: { clientId } },
    include: { optimization: { select: { platform: true } } },
    take: 150,
  });
  const topActions = failChecks
    .map(c => {
      const defs = PLATFORM_CHECKS[c.optimization.platform] ?? [];
      const def = defs.find(d => d.id === c.checkId);
      return { name: def?.name ?? c.checkId, platform: c.optimization.platform, status: c.status, weight: def?.weight ?? 1, aiSuggestion: c.aiSuggestion };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 12);

  // Posts this month
  const postsThisMonth = recentPosts.filter(p => new Date(p.createdAt) >= startOfMonth).length;

  const platformRows = PLATFORM_ORDER.map(p => {
    const data = optMap[p];
    const score = data?.score ?? null;
    const bar = score !== null && score > 0 ? scoreBarHtml(score, 100) : '<span style="color:#94a3b8;font-size:11px">Not started</span>';
    const lastUpdated = data?.updatedAt ? new Date(data.updatedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—';
    return `<tr>
      <td style="font-weight:500">${PLATFORM_DISPLAY[p] ?? p}</td>
      <td>${bar}</td>
      <td style="text-align:center;color:#6b7280">${data?.checks ?? '—'}</td>
      <td style="color:#6b7280;font-size:11px">${lastUpdated}</td>
    </tr>`;
  }).join('');

  const actionRows = topActions.map(a => `<tr>
    <td style="font-weight:500;color:#111827;max-width:200px">${a.name}</td>
    <td><span class="badge" style="background:${a.status === 'FAIL' ? '#fee2e2' : '#fef9c3'};color:${a.status === 'FAIL' ? '#991b1b' : '#854d0e'}">${a.status}</span></td>
    <td style="color:#6b7280">${PLATFORM_DISPLAY[a.platform] ?? a.platform}</td>
    <td style="text-align:center;color:#6b7280;font-size:11px">${a.weight}×</td>
    <td style="color:#374151;font-size:11px;max-width:220px">${a.aiSuggestion ?? '—'}</td>
  </tr>`).join('');

  const postRows = recentPosts.map(p => {
    const platforms = (p.platforms as string[]).slice(0, 3).map(pl => PLATFORM_DISPLAY[pl] ?? pl).join(', ');
    const statusColor = p.status === 'PUBLISHED' ? '#16a34a' : p.status === 'SCHEDULED' ? '#2563eb' : '#6b7280';
    return `<tr>
      <td style="max-width:240px;color:#374151">${(p.caption as string).slice(0, 80)}${(p.caption as string).length > 80 ? '…' : ''}</td>
      <td style="color:#6b7280;font-size:11px">${platforms}</td>
      <td><span class="badge" style="background:${statusColor}18;color:${statusColor}">${p.status.charAt(0) + p.status.slice(1).toLowerCase()}</span></td>
      <td style="color:#9ca3af;font-size:11px">${new Date(p.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</td>
    </tr>`;
  }).join('');

  const html = `${basePageStyles(primary)}

<!-- Cover -->
<div style="background:linear-gradient(135deg,${primary} 0%,${accent} 100%);padding:40px 48px;border-radius:12px;margin-bottom:28px;color:#fff">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;opacity:.7;margin-bottom:6px">${agency.name}</div>
      <h1 style="font-size:26px;font-weight:800;line-height:1.2;margin-bottom:6px">Client Performance Report</h1>
      <div style="font-size:19px;font-weight:700;opacity:.95">${client.name}</div>
      <div style="font-size:13px;opacity:.75;margin-top:4px">${client.domain}${client.industry ? ` · ${client.industry}` : ''}</div>
      <div style="margin-top:12px;font-size:12px;opacity:.7">${activePlatforms.length} platform${activePlatforms.length !== 1 ? 's' : ''} active · ${postsThisMonth} post${postsThisMonth !== 1 ? 's' : ''} this month</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:58px;font-weight:900;line-height:1;color:${avgScore >= 80 ? '#86efac' : avgScore >= 60 ? '#fde68a' : '#fca5a5'}">${avgScore || '—'}</div>
      <div style="font-size:13px;opacity:.8">Avg Platform Score</div>
      <div style="font-size:11px;opacity:.6;margin-top:4px">${generatedDate}</div>
    </div>
  </div>
  ${agency.reportTagline ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.25);font-size:12px;opacity:.75;font-style:italic">${agency.reportTagline}</div>` : ''}
</div>

${lastAudit ? `
<!-- Last Audit -->
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between">
  <div>
    <div style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Latest Completed Audit</div>
    <div style="font-weight:600;color:#111827">${lastAudit.name}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px">${new Date(lastAudit.createdAt).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:36px;font-weight:800;color:${scoreColor(lastAudit.overallScore)}">${lastAudit.overallScore ?? '—'}</div>
    <div style="font-size:11px;color:#6b7280">Audit Score</div>
  </div>
</div>` : ''}

<!-- Platform Scores -->
<div style="margin-bottom:28px">
  <h2>Platform Scores</h2>
  <table>
    <thead><tr><th>Platform</th><th>Score</th><th style="text-align:center">Checks</th><th>Last Updated</th></tr></thead>
    <tbody>${platformRows}</tbody>
  </table>
</div>

${topActions.length > 0 ? `
<!-- Action Items -->
<div style="margin-bottom:28px">
  <h2>Priority Action Items</h2>
  <table>
    <thead><tr><th>Check</th><th>Status</th><th>Platform</th><th style="text-align:center">Weight</th><th>AI Recommendation</th></tr></thead>
    <tbody>${actionRows}</tbody>
  </table>
</div>` : ''}

${recentPosts.length > 0 ? `
<!-- Recent Posts -->
<div style="margin-bottom:28px">
  <h2>Recent Content Activity</h2>
  <table>
    <thead><tr><th>Caption</th><th>Platforms</th><th>Status</th><th>Date</th></tr></thead>
    <tbody>${postRows}</tbody>
  </table>
</div>` : ''}

<!-- Footer -->
<div style="margin-top:28px;padding-top:14px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px">
  ${agency.reportFooter ? `<p style="margin-bottom:4px">${agency.reportFooter}</p>` : ''}
  <p>Prepared by ${agency.name} for ${client.name} · ${generatedDate} · Confidential</p>
</div>

</body></html>`;

  return renderToPdf(html);
}
