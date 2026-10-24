import express from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { requirePermission } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { getAuditLog, listAuditLogs } from '../audit/audit.service.js';
import { auditLogIdRequest, listAuditLogsRequest } from './admin-audit.validation.js';

const router = express.Router();

// Read-only, for roles with audit.view (Super Admin by default). There is no API to edit or delete a log.
router.use(authenticateAdmin, requirePermission('audit.view'));

router.get('/', validate(listAuditLogsRequest), asyncHandler(async (req, res) => {
  const { page, limit, search, action, module, actor_type: actorType, status, date } = req.query;
  return success(res, { message: 'OK', data: await listAuditLogs({ page, limit, search, action, module, actorType, status, date }) });
}));

router.get('/:id', validate(auditLogIdRequest), asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: { log: await getAuditLog(req.params.id) } })
));

export default router;
