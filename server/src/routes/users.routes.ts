import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authenticate, requireOwner } from '../middleware/auth.middleware';
import { serviceKeyAuth } from '../middleware/service-key.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../services/auth.service';

const router = Router();
router.use(authenticate, requireOwner);

router.get('/', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { agencyId: req.user!.agencyId },
    select: { id: true, email: true, name: true, role: true, avatarUrl: true, isActive: true, lastLoginAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: users });
}));

// POST /api/users accepts either normal owner-session auth OR a service key so
// the CRM can create a CLIENT-role portal user when provisioning a new client.
router.post('/', asyncHandler(async (req, res, next) => {
  if (req.headers['x-service-key']) {
    return serviceKeyAuth(req, res, next);
  }
  if (req.user?.role !== 'OWNER') {
    res.status(403).json({ error: 'Owner access required' });
    return;
  }
  next();
}), asyncHandler(async (req, res) => {
  const schema = z.object({ email: z.string().email(), name: z.string().min(1), role: z.enum(['ACCOUNT_MANAGER', 'CONTENT_CREATOR', 'SEO_ANALYST', 'CLIENT']), password: z.string().min(8) });
  const { email, name, role, password } = schema.parse(req.body);
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name, role, passwordHash, agencyId: req.user!.agencyId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  res.status(201).json({ data: user });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  if (req.params.id === req.user!.userId) { res.status(400).json({ error: 'Cannot change your own role' }); return; }
  const schema = z.object({ name: z.string().min(1).optional(), role: z.enum(['OWNER', 'ACCOUNT_MANAGER', 'CONTENT_CREATOR', 'SEO_ANALYST', 'CLIENT']).optional(), isActive: z.boolean().optional() });
  const data = schema.parse(req.body);
  if (data.role !== undefined) {
    const target = await prisma.user.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId }, select: { role: true } });
    if (!target) { res.status(404).json({ error: 'User not found' }); return; }
    if (target.role === 'OWNER') { res.status(400).json({ error: 'Cannot change the role of another Owner' }); return; }
  }
  const user = await prisma.user.update({ where: { id: req.params.id, agencyId: req.user!.agencyId }, data, select: { id: true, email: true, name: true, role: true, isActive: true } });
  res.json({ data: user });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (req.params.id === req.user!.userId) { res.status(400).json({ error: 'Cannot delete yourself' }); return; }
  const target = await prisma.user.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!target) { res.status(404).json({ error: 'User not found' }); return; }
  if (target.role === 'OWNER') { res.status(400).json({ error: 'Cannot delete an Owner account' }); return; }
  try {
    await prisma.user.delete({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      res.status(409).json({ error: 'This user has existing content. Deactivate them instead of deleting.' });
      return;
    }
    throw err;
  }
}));

export default router;
