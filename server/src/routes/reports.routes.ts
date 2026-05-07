import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { generateMonthlyReport, generateClientReport } from '../services/report.service';

const router = Router();
router.use(authenticate);

router.get('/monthly', asyncHandler(async (req, res) => {
  const schema = z.object({
    year: z.string().regex(/^\d{4}$/).optional(),
    month: z.string().regex(/^[1-9]|1[0-2]$/).optional(),
  });
  const { year, month } = schema.parse(req.query);
  const now = new Date();
  const y = year ? parseInt(year) : now.getFullYear();
  const m = month ? parseInt(month) : now.getMonth() + 1;

  const pdf = await generateMonthlyReport(req.user!, y, m);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '-');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="agency-report-${monthLabel}.pdf"`);
  res.send(pdf);
}));

router.get('/client/:clientId', asyncHandler(async (req, res) => {
  const pdf = await generateClientReport(req.params.clientId, req.user!);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="client-report-${req.params.clientId}.pdf"`);
  res.send(pdf);
}));

export default router;
