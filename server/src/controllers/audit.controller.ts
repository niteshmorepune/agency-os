import { Request, Response } from 'express';
import { z } from 'zod';
import * as auditService from '../services/audit.service';
import { generateAuditReport } from '../services/report.service';

export async function listAudits(req: Request, res: Response): Promise<void> {
  const audits = await auditService.listAudits(req.params.clientId, req.user!);
  res.json({ data: audits });
}

export async function createAudit(req: Request, res: Response): Promise<void> {
  const { name } = z.object({ name: z.string().min(1).max(200) }).parse(req.body);
  const audit = await auditService.createAudit(req.params.clientId, name, req.user!);
  res.status(201).json({ data: audit });
}

export async function getAudit(req: Request, res: Response): Promise<void> {
  const audit = await auditService.getAudit(req.params.clientId, req.params.auditId, req.user!);
  res.json({ data: audit });
}

export async function updateCheck(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    status: z.enum(['PENDING', 'PASS', 'WARN', 'FAIL', 'NA']).optional(),
    score: z.number().min(0).max(100).optional(),
    data: z.record(z.unknown()).optional(),
  });
  const parsed = schema.parse(req.body);
  const check = await auditService.updateCheck(
    req.params.clientId,
    req.params.auditId,
    req.params.checkId,
    parsed,
    req.user!
  );
  res.json({ data: check });
}

export async function getAISuggestion(req: Request, res: Response): Promise<void> {
  const result = await auditService.getAISuggestion(
    req.params.clientId,
    req.params.auditId,
    req.params.checkId,
    req.user!
  );
  res.json({ data: result });
}

export async function addNote(req: Request, res: Response): Promise<void> {
  const { content, checkId, isInternal } = z.object({
    content: z.string().min(1).max(3000),
    checkId: z.string().optional(),
    isInternal: z.boolean().default(true),
  }).parse(req.body);
  const note = await auditService.addNote(
    req.params.clientId,
    req.params.auditId,
    content,
    checkId,
    isInternal,
    req.user!
  );
  res.status(201).json({ data: note });
}

export async function completeAudit(req: Request, res: Response): Promise<void> {
  const audit = await auditService.completeAudit(req.params.clientId, req.params.auditId, req.user!);
  res.json({ data: audit });
}

export async function deleteAudit(req: Request, res: Response): Promise<void> {
  await auditService.deleteAudit(req.params.clientId, req.params.auditId, req.user!);
  res.json({ message: 'Audit deleted' });
}

export async function downloadReport(req: Request, res: Response): Promise<void> {
  const pdfBuffer = await generateAuditReport(req.params.clientId, req.params.auditId, req.user!);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="audit-report-${req.params.auditId}.pdf"`);
  res.send(pdfBuffer);
}
