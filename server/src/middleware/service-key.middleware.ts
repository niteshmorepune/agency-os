import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@agencyos/shared';
import { logger } from '../lib/logger';

/**
 * Alternative auth for server-to-server calls (e.g. NEDS CRM provisioning a
 * client on deal won, or SMDost pushing approved content for scheduling).
 * Checks the X-Service-Key header against a caller-scoped secret, then
 * injects the agency OWNER's identity as req.user so downstream route
 * handlers work without any code changes.
 *
 * Scoped per CALLER, not just per route: SERVICE_API_KEY_CRM (the CRM's own
 * provisioning/metrics/usage calls) and SERVICE_API_KEY_SMDOST (SMDost's own
 * content-push call) are two distinct secrets, so a leak of one never grants
 * access to the other caller's routes. Each route passes the ONE scope it
 * actually expects — see the `serviceKeyOrAuthenticate` guard in each routes
 * file.
 *
 * The legacy unscoped SERVICE_API_KEY fallback (accepted here during the
 * 2026-09-18 rollout) has been retired — both callers are confirmed sending
 * their new scoped key, verified via a real live call, not just deployed
 * code. SERVICE_API_KEY itself can be unset from .env at any time now.
 *
 * Because this grants OWNER-level access, every route that accepts it must be
 * an explicit, narrow allowlist (see the `serviceKeyOrAuthenticate` guard in
 * each routes file) — never applied to a whole router via `router.use()`. A
 * leaked key otherwise becomes a full account-takeover backdoor, not just
 * access to the one integration it was meant for.
 */
export type ServiceKeyScope = 'crm' | 'smdost';

const SCOPE_ENV_VAR: Record<ServiceKeyScope, string> = {
  crm: 'SERVICE_API_KEY_CRM',
  smdost: 'SERVICE_API_KEY_SMDOST',
};

export function serviceKeyAuth(scope: ServiceKeyScope) {
  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    const key = req.headers['x-service-key'];

    if (typeof key !== 'string') {
      logger.warn({ path: req.originalUrl, method: req.method, ip: req.ip, scope }, 'service key auth failed');
      res.status(401).json({ error: 'Invalid or missing service key' });
      return;
    }

    const scoped = process.env[SCOPE_ENV_VAR[scope]];

    if (!scoped || !timingSafeEqual(key, scoped)) {
      logger.warn({ path: req.originalUrl, method: req.method, ip: req.ip, scope }, 'service key auth failed');
      res.status(401).json({ error: 'Invalid or missing service key' });
      return;
    }

    // Find the OWNER user to resolve agencyId — this app is single-tenant (one
    // agency), so the first OWNER is always the right context.
    const owner = await prisma.user.findFirst({
      where: { role: Role.OWNER },
      select: { id: true, agencyId: true, email: true },
    });

    if (!owner) {
      res.status(503).json({ error: 'No owner account configured in Drishti' });
      return;
    }

    logger.info({ path: req.originalUrl, method: req.method, ip: req.ip, scope }, 'service key auth succeeded');

    req.user = {
      userId: owner.id,
      agencyId: owner.agencyId,
      role: Role.OWNER,
      email: owner.email,
    };

    next();
  };
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  // Buffers of different length would throw in crypto.timingSafeEqual; hashing
  // both to a fixed length first keeps the comparison itself constant-time
  // without leaking the expected key's length via an early bail-out.
  const aHash = crypto.createHash('sha256').update(aBuf).digest();
  const bHash = crypto.createHash('sha256').update(bBuf).digest();
  return crypto.timingSafeEqual(aHash, bHash);
}
