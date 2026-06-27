import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@agencyos/shared';

/**
 * Alternative auth for server-to-server calls (e.g. NEDS CRM provisioning a
 * client on deal won). Checks the X-Service-Key header against SERVICE_API_KEY
 * in the environment, then injects the agency OWNER's identity as req.user so
 * downstream route handlers work without any code changes.
 *
 * The key must be a long random secret shared between the CRM and this server;
 * set SERVICE_API_KEY in .env on both sides.
 */
export async function serviceKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const key = req.headers['x-service-key'];
  const expected = process.env.SERVICE_API_KEY;

  if (!expected || !key || key !== expected) {
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

  req.user = {
    userId: owner.id,
    agencyId: owner.agencyId,
    role: Role.OWNER,
    email: owner.email,
  };

  next();
}
