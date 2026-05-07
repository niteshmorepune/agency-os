import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import * as ctrl from '../controllers/client.controller';
import { Role } from '@agencyos/shared';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(ctrl.listClients));
router.post('/', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(ctrl.createClient));
router.get('/:id', asyncHandler(ctrl.getClient));
router.put('/:id', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(ctrl.updateClient));
router.delete('/:id', requireRole(Role.OWNER), asyncHandler(ctrl.deleteClient));
router.post('/:id/assign', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(ctrl.assignTeamMember));
router.get('/:id/dashboard', asyncHandler(ctrl.getClientDashboard));

export default router;
