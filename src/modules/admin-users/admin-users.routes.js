import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { requirePermission } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './admin-users.controller.js';
import { deleteUserRequest, listUsersRequest, updateStatusRequest, updateUserRequest, userIdRequest } from './admin-users.validation.js';

const router = Router();
const canView = requirePermission('users.view');
// "manage" covers edit, block and delete.
const canManage = requirePermission('users.manage');

router.use(authenticateAdmin);
router.get('/stats', canView, controller.stats);
router.get('/', canView, validate(listUsersRequest), controller.list);
router.get('/:id', canView, validate(userIdRequest), controller.show);
router.post('/:id/update', canManage, validate(updateUserRequest), controller.update);
router.post('/:id/status', canManage, validate(updateStatusRequest), controller.updateStatus);
router.post('/:id/delete', canManage, validate(deleteUserRequest), controller.destroy);

export default router;
