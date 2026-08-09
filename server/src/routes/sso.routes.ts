import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, hashToken, getRefreshExpiry } from '../lib/jwt';
import { Role, JwtPayload } from '@agencyos/shared';
import { logger } from '../lib/logger';

const router = Router();

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://nedsdrishti.in';

/**
 * A client arriving here came from a link in the NEDS CRM portal, not from
 * typing a URL — so any failure must land them on a page that explains what
 * happened and offers a way forward, never a bare JSON error body in the
 * browser. Redirects to the login page with a `sso_error` code the frontend
 * turns into a friendly message (see Login.tsx).
 */
function redirectWithError(res: Response, code: string): void {
  res.redirect(`${FRONTEND_URL}/login?sso_error=${code}`);
}

/**
 * GET /api/sso?token=...
 *
 * Accepts a short-lived HS256 JWT issued by the NEDS CRM portal for a
 * contact whose customer has a drishti_client_id. Verifies the token,
 * looks up the CLIENT user by email, issues Drishti auth cookies, and
 * redirects to FRONTEND_URL so the React app boots in a logged-in state.
 */
router.get('/', asyncHandler(async (req, res) => {
  const token = req.query.token as string | undefined;

  if (!token) {
    redirectWithError(res, 'missing_token');
    return;
  }

  const ssoSecret = process.env.PORTAL_SSO_SECRET;
  if (!ssoSecret) {
    logger.error({ msg: 'PORTAL_SSO_SECRET is not configured' });
    redirectWithError(res, 'not_configured');
    return;
  }

  let claims: { email: string; sub: string; drishti_client_id?: string | null };
  try {
    claims = jwt.verify(token, ssoSecret, { algorithms: ['HS256'] }) as typeof claims;
  } catch (err) {
    logger.warn({ msg: 'Invalid SSO token', err: (err as Error).message });
    redirectWithError(res, 'expired');
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: claims.email, role: Role.CLIENT, isActive: true },
  });

  if (!user) {
    logger.warn({ msg: 'SSO: no active CLIENT user for email', email: claims.email });
    redirectWithError(res, 'no_access');
    return;
  }

  const payload: JwtPayload = {
    userId: user.id,
    agencyId: user.agencyId,
    role: user.role as Role,
    email: user.email,
  };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: {
      userId:    user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshExpiry(),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data:  { lastLoginAt: new Date() },
  });

  logger.info({ msg: 'SSO login', userId: user.id, email: user.email });

  res.cookie('access_token',  accessToken,  { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth/refresh' });

  res.redirect(FRONTEND_URL);
}));

export default router;
