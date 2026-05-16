import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import * as ctrl from '../controllers/ai.controller';

const router = Router();
router.use(authenticate);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many AI requests. Max 20/minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(aiLimiter);

router.post('/caption', asyncHandler(ctrl.captionGenerator));
router.post('/bio', asyncHandler(ctrl.bioOptimizer));
router.post('/rewrite', asyncHandler(ctrl.contentRewriter));
router.post('/email', asyncHandler(ctrl.emailCopyWriter));
router.post('/ad-copy', asyncHandler(ctrl.adCopyGenerator));
router.post('/thread', asyncHandler(ctrl.threadWriter));
router.post('/hashtags', asyncHandler(ctrl.hashtagResearcher));
router.post('/persona', asyncHandler(ctrl.personaBuilder));
router.post('/competitor-analysis', asyncHandler(ctrl.competitorAnalyzer));
router.post('/repurpose', asyncHandler(ctrl.contentRepurposer));
router.post('/review-response', asyncHandler(ctrl.reviewResponseGenerator));
router.post('/post-ideas', asyncHandler(ctrl.postIdeasGenerator));
router.post('/posting-times', asyncHandler(ctrl.postingTimeOptimizer));
router.post('/engagement-analyze', asyncHandler(ctrl.engagementAnalyzer));
router.post('/search-visibility', asyncHandler(ctrl.searchVisibilityAudit));
router.get('/usage', asyncHandler(ctrl.getAIUsage));

export default router;
