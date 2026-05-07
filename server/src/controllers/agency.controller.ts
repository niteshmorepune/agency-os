import { Request, Response } from 'express';
import { z } from 'zod';
import * as svc from '../services/agency.service';

export async function getAgency(req: Request, res: Response) {
  const data = await svc.getAgency(req.user!);
  res.json({ data });
}

export async function updateBranding(req: Request, res: Response) {
  const schema = z.object({
    name:          z.string().min(1).max(100).optional(),
    primaryColor:  z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    accentColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    fontFamily:    z.enum(['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans']).optional(),
    reportTagline: z.string().max(200).optional(),
    reportFooter:  z.string().max(500).optional(),
  });
  const data = schema.parse(req.body);
  const result = await svc.updateBranding(req.user!, data);
  res.json({ data: result });
}

export async function updateApiKeys(req: Request, res: Response) {
  const schema = z.object({
    anthropicKey: z.string().optional(),
    psiApiKey:    z.string().optional(),
    ahrefsKey:    z.string().optional(),
    dataforseKey: z.string().optional(),
    smtpHost:     z.string().optional(),
    smtpUser:     z.string().optional(),
    smtpPass:     z.string().optional(),
  });
  const data = schema.parse(req.body);
  const result = await svc.updateApiKeys(req.user!, data);
  res.json(result);
}

export async function updateBudget(req: Request, res: Response) {
  const { aiMonthlyBudgetUsd } = z.object({ aiMonthlyBudgetUsd: z.number().min(0).max(1000) }).parse(req.body);
  const result = await svc.updateBudget(req.user!, aiMonthlyBudgetUsd);
  res.json({ data: result });
}
