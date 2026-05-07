import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginHandler, refreshHandler, logoutHandler, meHandler } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

router.post('/login', loginLimiter, asyncHandler(loginHandler));
router.post('/refresh', asyncHandler(refreshHandler));
router.post('/logout', asyncHandler(logoutHandler));
router.get('/me', authenticate, asyncHandler(meHandler));

export default router;
