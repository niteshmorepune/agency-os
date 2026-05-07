import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload } from '@agencyos/shared';

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(payload: Pick<JwtPayload, 'userId'>): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'userId'> {
  return jwt.verify(token, REFRESH_SECRET) as Pick<JwtPayload, 'userId'>;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRefreshExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}
