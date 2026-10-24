import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { requirePermission } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import * as roles from './admin-roles.service.js';
import * as rules from './admin-roles.validation.js';

const router = Router();
const canView = requirePermission('roles.view');
const canManage = requirePermission('roles.manage');
const ok = (message, load) => asyncHandler(async (req, res) => success(res, { message, data: await load(req) }));

router.use(authenticateAdmin);
router.get('/', canView, ok('OK', (req) => roles.listRoles(req.admin)));
router.post('/', canManage, validate(rules.createRoleRequest), asyncHandler(async (req, res) =>
  success(res, { status: 201, message: 'role_created', data: { role: await roles.createRole({ body: req.body, actor: req.admin }) } })
));
router.post('/:id/update', canManage, validate(rules.updateRoleRequest), ok('role_updated', (req) => roles.updateRole({ id: req.params.id, body: req.body, actor: req.admin }).then((role) => ({ role }))));
router.post('/:id/status', canManage, validate(rules.roleStatusRequest), ok('role_status_updated', (req) => roles.updateRoleStatus({ id: req.params.id, status: req.body.status, actor: req.admin }).then((role) => ({ role }))));
router.post('/:id/delete', canManage, validate(rules.roleIdRequest), ok('role_deleted', (req) => roles.deleteRole({ id: req.params.id, actor: req.admin }).then(() => ({ id: req.params.id }))));

export default router;
