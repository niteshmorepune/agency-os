import { Router } from 'express';
import { authenticate, requireOwner } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import * as ctrl from '../controllers/agency.controller';

const router = Router();
router.use(authenticate);

router.get('/',              asyncHandler(ctrl.getAgency));
router.put('/branding',      requireOwner, asyncHandler(ctrl.updateBranding));
router.put('/api-keys',      requireOwner, asyncHandler(ctrl.updateApiKeys));
router.put('/budget',        requireOwner, asyncHandler(ctrl.updateBudget));

export default router;
