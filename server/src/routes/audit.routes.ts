import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import * as ctrl from '../controllers/audit.controller';
import { Role } from '@agencyos/shared';

const router = Router();
router.use(authenticate);

router.get('/:clientId', asyncHandler(ctrl.listAudits));
router.post('/:clientId', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER, Role.SEO_ANALYST, Role.AUDITOR), asyncHandler(ctrl.createAudit));
router.get('/:clientId/:auditId', asyncHandler(ctrl.getAudit));
router.put('/:clientId/:auditId/check/:checkId', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER, Role.SEO_ANALYST, Role.AUDITOR), asyncHandler(ctrl.updateCheck));
router.post('/:clientId/:auditId/check/:checkId/ai-suggest', asyncHandler(ctrl.getAISuggestion));
router.post('/:clientId/:auditId/note', asyncHandler(ctrl.addNote));
router.put('/:clientId/:auditId/complete', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER, Role.SEO_ANALYST, Role.AUDITOR), asyncHandler(ctrl.completeAudit));
router.delete('/:clientId/:auditId', requireRole(Role.OWNER, Role.ACCOUNT_MANAGER), asyncHandler(ctrl.deleteAudit));
router.get('/:clientId/:auditId/report', asyncHandler(ctrl.downloadReport));

export default router;
