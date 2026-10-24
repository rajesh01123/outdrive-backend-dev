import express from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { authorizeAdmin } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { getAuditLog, listAuditLogs } from '../audit/audit.service.js';
import { auditLogIdRequest, listAuditLogsRequest } from './admin-audit.validation.js';

const router = express.Router();

// Read-only, and only super admins can see who did what. There is no API to edit or delete a log.
router.use(authenticateAdmin, authorizeAdmin('super_admin'));

router.get('/', validate(listAuditLogsRequest), asyncHandler(async (req, res) => {
  const { page, limit, search, action, module, actor_type: actorType, status, date } = req.query;
  return success(res, { message: 'OK', data: await listAuditLogs({ page, limit, search, action, module, actorType, status, date }) });
}));

router.get('/:id', validate(auditLogIdRequest), asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: { log: await getAuditLog(req.params.id) } })
));

export default router;
