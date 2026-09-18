import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@agencyos/shared';
import { logger } from '../lib/logger';

/**
 * Alternative auth for server-to-server calls (e.g. NEDS CRM provisioning a
 * client on deal won). Checks the X-Service-Key header against SERVICE_API_KEY
 * in the environment, then injects the agency OWNER's identity as req.user so
 * downstream route handlers work without any code changes.
 *
 * The key must be a long random secret shared between the CRM and this server;
 * set SERVICE_API_KEY in .env on both sides.
 *
 * Because this grants OWNER-level access, every route that accepts it must be
 * an explicit, narrow allowlist (see the `serviceKeyOrAuthenticate` guard in
 * each routes file) — never applied to a whole router via `router.use()`. A
 * leaked key otherwise becomes a full account-takeover backdoor, not just
 * access to the one integration it was meant for.
 */
export async function serviceKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const key = req.headers['x-service-key'];
  const expected = process.env.SERVICE_API_KEY;

  if (!expected || typeof key !== 'string' || !timingSafeEqual(key, expected)) {
    logger.warn({ path: req.originalUrl, method: req.method, ip: req.ip }, 'service key auth failed');
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

  logger.info({ path: req.originalUrl, method: req.method, ip: req.ip }, 'service key auth succeeded');

  req.user = {
    userId: owner.id,
    agencyId: owner.agencyId,
    role: Role.OWNER,
    email: owner.email,
  };

  next();
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
