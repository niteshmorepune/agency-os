import { runAITool } from './client';
import { JwtPayload } from '@agencyos/shared';

/**
 * Client-facing "what happened this month and why" paragraph for the
 * per-client PDF report (server/src/services/report.service.ts). The report
 * already computes every figure this narrates (platform scores, action
 * items, post count, audit score) — this is a synthesis pass over numbers
 * already on screen, not a new data source, same "one figures object feeds
 * both the display AND the AI prompt" discipline used elsewhere so the
 * narrative can never drift from what the report actually shows.
 *
 * This report is emailed directly to the client (weekly digest cron), so
 * the prompt is strict about never inventing a number, a trend, or a
 * comparison to a prior period that isn't in the given data.
 */

export interface ClientReportNarrativeInput {
  clientName: string;
  avgScore: number | null;
  activePlatformCount: number;
  postsThisMonth: number;
  topActions: { name: string; platform: string; status: string }[];
  lastAudit: { name: string; overallScore: number | null } | null;
}

export async function generateClientReportNarrative(
  input: ClientReportNarrativeInput,
  user: JwtPayload,
  clientId: string,
): Promise<string | null> {
  const systemPrompt = `You write a short summary paragraph opening a client's monthly performance report. Rules:
1. Use ONLY the figures given below — never invent a number, a percentage change, a comparison to a previous month, or a trend that isn't explicitly stated in the data.
2. 2-4 sentences, plain text only, no markdown, no headings, no bullet points.
3. Professional, direct, and encouraging in tone — even when scores are low or action items are pending, frame it as "here's what we're focused on" rather than alarming language.
4. Do not use the client's name more than once. Do not sign off or add a greeting — this is inserted directly into a report, not a standalone message.`;

  const actionsText = input.topActions.length > 0
    ? input.topActions.map(a => `- ${a.name} (${a.platform}, ${a.status})`).join('\n')
    : 'None — no outstanding priority action items.';

  const userPrompt = `Client: ${input.clientName}
Average platform score: ${input.avgScore ?? 'not yet available'}
Active platforms tracked: ${input.activePlatformCount}
Posts published this month: ${input.postsThisMonth}
Top priority action items:
${actionsText}
Most recent audit: ${input.lastAudit ? `"${input.lastAudit.name}", score ${input.lastAudit.overallScore ?? 'not yet scored'}` : 'no completed audit yet'}

Write the summary paragraph using only the above.`;

  const { result } = await runAITool({
    toolId: 'client_report_narrative',
    systemPrompt,
    userPrompt,
    inputs: {
      clientId,
      avgScore: String(input.avgScore ?? 'null'),
      postsThisMonth: String(input.postsThisMonth),
      actionCount: String(input.topActions.length),
    },
    user,
    clientId,
    forceRefresh: true, // report data changes every generation
  });

  return result.trim();
}
