import rateLimit from 'express-rate-limit';

/**
 * Shared rate limit for the narrow set of routes that accept X-Service-Key
 * (server-to-server calls from the CRM/SMDost). A leaked key still can't be
 * used to hammer these endpoints — same reasoning as ai.routes.ts's own
 * per-route limiter, applied here since service-key auth bypasses normal
 * session/browser-level throttling entirely.
 */
export const serviceKeyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});
