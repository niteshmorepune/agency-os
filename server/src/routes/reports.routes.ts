import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { generateMonthlyReport, generateClientReport } from '../services/report.service';
import { sendClientReport } from '../services/email.service';
import { prisma } from '../lib/prisma';
import { Role } from '@agencyos/shared';

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

// Email monthly report to a specific client's contact email
router.post('/email/:clientId', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.clientId, agencyId: req.user!.agencyId },
    select: { name: true, contactEmail: true, reportSchedule: true },
  });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
  if (!client.contactEmail) { res.status(400).json({ error: 'Client has no contact email. Add one in Client Settings.' }); return; }

  const now = new Date();
  const pdf = await generateClientReport(req.params.clientId, req.user!);
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const filename = `${client.name.replace(/\s+/g, '-')}-${monthLabel.replace(' ', '-')}-report.pdf`;

  await sendClientReport({
    agencyId: req.user!.agencyId,
    clientName: client.name,
    contactEmail: client.contactEmail,
    pdfBuffer: Buffer.from(pdf),
    filename,
    monthLabel,
  });

  await prisma.client.update({
    where: { id: req.params.clientId },
    data: { lastReportEmailedAt: now },
  });

  res.json({ message: `Report emailed to ${client.contactEmail}` });
}));

// Update report schedule for a client
router.patch('/schedule/:clientId', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(async (req, res) => {
  const { reportSchedule } = z.object({ reportSchedule: z.enum(['NONE', 'MONTHLY']) }).parse(req.body);
  const client = await prisma.client.findFirst({ where: { id: req.params.clientId, agencyId: req.user!.agencyId } });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
  const updated = await prisma.client.update({
    where: { id: req.params.clientId },
    data: { reportSchedule },
  });
  res.json({ data: updated });
}));

export default router;
