import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export const WEBHOOK_EVENTS = [
  'post.approved',
  'post.rejected',
  'post.published',
  'invoice.sent',
  'invoice.paid',
  'audit.completed',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export async function deliverWebhook(params: {
  agencyId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
}): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: { agencyId: params.agencyId, isActive: true, events: { has: params.event } },
  });

  for (const webhook of webhooks) {
    void sendRequest(webhook.id, webhook.url, webhook.secret, params.event, params.payload);
  }
}

async function sendRequest(
  webhookId: string,
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ event, timestamp, data: payload });
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

  let status = 0;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agency-Event': event,
        'X-Agency-Signature': `sha256=${signature}`,
        'X-Agency-Timestamp': String(timestamp),
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    status = res.status;
    logger.info({ msg: 'Webhook delivered', webhookId, event, status });
  } catch (err) {
    logger.warn({ msg: 'Webhook delivery failed', webhookId, event, err: String(err) });
  }

  await prisma.webhook.update({
    where: { id: webhookId },
    data: { lastDeliveryAt: new Date(), lastStatus: status },
  }).catch(() => { /* best-effort */ });
}
