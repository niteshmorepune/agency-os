import puppeteer from 'puppeteer';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '@agencyos/shared';
import { AUDIT_MODULE_MAP } from '../lib/auditChecks';

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
