import { Request, Response } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import * as clientService from '../services/client.service';

const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().min(1).max(200),
  brandName: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  targetAudience: z.string().max(500).optional(),
  competitors: z.array(z.string()).max(10).optional(),
  monthlyRetainer: z.number().positive().optional(),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional(),
  notes: z.string().max(2000).optional(),
});

function sanitizeClientInput(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === 'string') {
      result[key] = DOMPurify.sanitize(val, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    } else {
      result[key] = val;
    }
  }
  return result;
}

export async function listClients(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const result = await clientService.listClients(req.user!, page, limit);
  res.json({ data: result.clients, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
}

export async function getClient(req: Request, res: Response): Promise<void> {
  const client = await clientService.getClient(req.params.id, req.user!);
  res.json({ data: client });
}

export async function createClient(req: Request, res: Response): Promise<void> {
  const parsed = createClientSchema.parse(req.body);
  const sanitized = sanitizeClientInput(parsed as Record<string, unknown>);
  const client = await clientService.createClient(sanitized as Parameters<typeof clientService.createClient>[0], req.user!);
  res.status(201).json({ data: client });
}

export async function updateClient(req: Request, res: Response): Promise<void> {
  const parsed = createClientSchema.partial().parse(req.body);
  const sanitized = sanitizeClientInput(parsed as Record<string, unknown>);
  const client = await clientService.updateClient(req.params.id, sanitized, req.user!);
  res.json({ data: client });
}

export async function deleteClient(req: Request, res: Response): Promise<void> {
  await clientService.deleteClient(req.params.id, req.user!);
  res.json({ message: 'Client deleted' });
}

export async function assignTeamMember(req: Request, res: Response): Promise<void> {
  const { userId } = z.object({ userId: z.string() }).parse(req.body);
  await clientService.assignTeamMember(req.params.id, userId, req.user!);
  res.json({ message: 'Team member assigned' });
}

export async function removeTeamMember(req: Request, res: Response): Promise<void> {
  const { userId } = z.object({ userId: z.string() }).parse(req.body);
  await clientService.removeTeamMember(req.params.id, userId, req.user!);
  res.json({ message: 'Team member removed' });
}

export async function getClientDashboard(req: Request, res: Response): Promise<void> {
  const dashboard = await clientService.getClientDashboard(req.params.id, req.user!);
  res.json({ data: dashboard });
}
