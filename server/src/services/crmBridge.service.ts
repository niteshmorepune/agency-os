import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Sends an approved AI trend idea to the CRM, which turns it into an SMDost
 * content brief. The CRM is the only place that already knows both a
 * client's drishti_client_id and smdost_client_id (see NEDS CRM's
 * integrations notes), so Drishti doesn't need its own copy of SMDost client
 * ids -- it just asks the CRM to bridge the call.
 *
 * Reuses the same signed-webhook scheme (HMAC-SHA256 over
 * `${timestamp}.${body}`) and the same secret already configured for the
 * "NEDS CRM" outbound webhook row (see webhook.service.ts) -- this is a
 * synchronous, response-awaiting call rather than that fire-and-forget
 * event delivery, since the caller needs to know whether the brief was
 * actually created.
 */
export type TrendIdeaBriefResult =
  | { outcome: 'ok'; briefId: string }
  | { outcome: 'already_sent' }
  | { outcome: 'not_linked_to_smdost' }
  | { outcome: 'no_customer_match' }
  | { outcome: 'not_configured' }
  | { outcome: 'crm_unreachable' };

export async function sendTrendIdeaToSmdost(payload: {
  contentIdeaId: string;
  drishtiClientId: string;
  title: string;
  platform: string;
  hook?: string | null;
  outline?: string | null;
  trendRationale?: string | null;
  sourceRefs?: string[];
}): Promise<TrendIdeaBriefResult> {
  const webhook = await prisma.webhook.findFirst({ where: { name: 'NEDS CRM' } });
  if (!webhook) {
    logger.warn({ msg: 'sendTrendIdeaToSmdost: no "NEDS CRM" webhook row configured' });
    return { outcome: 'not_configured' };
  }

  let crmBaseUrl: string;
  try {
    crmBaseUrl = new URL(webhook.url).origin;
  } catch {
    logger.warn({ msg: 'sendTrendIdeaToSmdost: NEDS CRM webhook has an invalid url', url: webhook.url });
    return { outcome: 'not_configured' };
  }

  const body = JSON.stringify({
    drishti_client_id: payload.drishtiClientId,
    content_idea_id: payload.contentIdeaId,
    title: payload.title,
    platform: payload.platform,
    hook: payload.hook ?? undefined,
    outline: payload.outline ?? undefined,
    trend_rationale: payload.trendRationale ?? undefined,
    source_refs: payload.sourceRefs ?? [],
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', webhook.secret).update(`${timestamp}.${body}`).digest('hex');

  try {
    const res = await fetch(`${crmBaseUrl}/api/webhooks/drishti/trend-idea-brief`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agency-Signature': `sha256=${signature}`,
        'X-Agency-Timestamp': String(timestamp),
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    const json = (await res.json().catch(() => ({}))) as { status?: string; brief_id?: string };

    if (json.status === 'ok' && json.brief_id) {
      return { outcome: 'ok', briefId: json.brief_id };
    }
    if (json.status === 'already_sent') {
      return { outcome: 'already_sent' };
    }
    if (json.status === 'not_linked_to_smdost') {
      return { outcome: 'not_linked_to_smdost' };
    }
    if (json.status === 'no_customer_match') {
      return { outcome: 'no_customer_match' };
    }

    logger.warn({ msg: 'sendTrendIdeaToSmdost: unexpected CRM response', status: res.status, json });
    return { outcome: 'crm_unreachable' };
  } catch (err) {
    logger.warn({ msg: 'sendTrendIdeaToSmdost: request to CRM failed', err: String(err) });
    return { outcome: 'crm_unreachable' };
  }
}
