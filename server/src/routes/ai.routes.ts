import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware';
import { serviceKeyAuth } from '../middleware/service-key.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import * as ctrl from '../controllers/ai.controller';

const router = Router();

// GET /usage also accepts a service key from the NEDS CRM (server-to-server
// AI usage/cost reporting, folded into the CRM's own AI Usage Report).
// Registered before the blanket session-auth guard below so it isn't limited
// to logged-in Drishti users — every other AI route here stays session-only;
// broadening those to service-key would let anyone holding the shared key
// generate content as the agency OWNER, which is a materially bigger risk
// than exposing read-only usage totals.
const serviceKeyOrAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  if (req.headers['x-service-key']) {
    void serviceKeyAuth(req, res, next);
  } else {
    authenticate(req, res, next);
  }
};
router.get('/usage', serviceKeyOrAuthenticate, asyncHandler(ctrl.getAIUsage));

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
router.post('/performance-insights', asyncHandler(ctrl.performanceInsights));
router.post('/trend-ideas', asyncHandler(ctrl.trendIdeaGenerator));
router.post('/competitor-gap-ideas', asyncHandler(ctrl.competitorGapIdeaGenerator));

export default router;
