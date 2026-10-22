import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { authorizeAdmin } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './admin-users.controller.js';
import { deleteUserRequest, listUsersRequest, updateStatusRequest, updateUserRequest, userIdRequest } from './admin-users.validation.js';

const router = Router();
const canView = authorizeAdmin('super_admin', 'operations', 'support');
const canManage = authorizeAdmin('super_admin', 'operations');
const canDelete = authorizeAdmin('super_admin');

router.use(authenticateAdmin);
router.get('/stats', canView, controller.stats);
router.get('/', canView, validate(listUsersRequest), controller.list);
router.get('/:id', canView, validate(userIdRequest), controller.show);
router.post('/:id/update', canManage, validate(updateUserRequest), controller.update);
router.post('/:id/status', canManage, validate(updateStatusRequest), controller.updateStatus);
router.post('/:id/delete', canDelete, validate(deleteUserRequest), controller.destroy);

export default router;
