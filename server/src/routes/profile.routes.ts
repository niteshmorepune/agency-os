import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../services/auth.service';

const router = Router();
router.use(authenticate);

router.put('/', asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(1, 'Name required'),
    email: z.string().email('Valid email required'),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, 'Min 8 characters').optional(),
  }).refine(d => !d.newPassword || !!d.currentPassword, {
    message: 'Current password required to set a new password',
    path: ['currentPassword'],
  });

  const { name, email, currentPassword, newPassword } = schema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  if (newPassword) {
    const valid = await verifyPassword(currentPassword!, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }
  }

  if (email !== user.email) {
    const taken = await prisma.user.findFirst({ where: { email, NOT: { id: user.id } } });
    if (taken) { res.status(400).json({ error: 'Email already in use' }); return; }
  }

  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      name,
      email,
      ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {}),
    },
    select: { id: true, email: true, name: true, role: true },
  });

  res.json({ data: updated });
}));

export default router;
