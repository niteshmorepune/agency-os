import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { generateHelpGuidePDF } from '../services/helpGuide.service';

const router = Router();
router.use(authenticate);

router.get('/guide.pdf', asyncHandler(async (_req, res) => {
  const pdf = await generateHelpGuidePDF();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="NEDS-Drishti-Platform-Guide.pdf"');
  res.send(pdf);
}));

export default router;
