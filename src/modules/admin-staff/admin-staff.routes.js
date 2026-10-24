import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { requirePermission } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { removeStoredUpload } from '../../shared/utils/image-upload.js';
import { profileUpload, storedProfilePath } from '../../shared/utils/profile-upload.js';
import * as staff from './admin-staff.service.js';
import * as rules from './admin-staff.validation.js';

const router = Router();
const canView = requirePermission('staff.view');
const canManage = requirePermission('staff.manage');
const photoUpload = profileUpload.single('profile_picture');
const photo = (req) => storedProfilePath(req.file);
const ok = (message, load) => asyncHandler(async (req, res) => success(res, { message, data: await load(req) }));

router.use(authenticateAdmin);
router.get('/', canView, validate(rules.listStaffRequest), ok('OK', (req) => staff.listStaff({ ...req.query, actor: req.admin })));
router.get('/roles', canView, ok('OK', (req) => staff.roleOptions(req.admin).then((roles) => ({ roles }))));
router.get('/:id', canView, validate(rules.staffIdRequest), ok('OK', (req) => staff.getStaff({ id: req.params.id, actor: req.admin })));
router.post('/', canManage, photoUpload, validate(rules.createStaffRequest), asyncHandler(async (req, res) =>
  success(res, { status: 201, message: 'staff_created', data: { staff: await staff.createStaff({ body: req.body, photo: photo(req), actor: req.admin }) } })
));
router.post('/:id/update', canManage, photoUpload, validate(rules.updateStaffRequest), ok('staff_updated', (req) => staff.updateStaff({ id: req.params.id, body: req.body, photo: photo(req), actor: req.admin }).then((item) => ({ staff: item }))));
router.post('/:id/status', canManage, validate(rules.staffStatusRequest), ok('staff_status_updated', (req) => staff.updateStaffStatus({ id: req.params.id, status: req.body.status, actor: req.admin }).then((item) => ({ staff: item }))));
router.post('/:id/reset-password', canManage, validate(rules.resetStaffPasswordRequest), ok('staff_password_reset', (req) => staff.resetStaffPassword({ id: req.params.id, newPassword: req.body.new_password, actor: req.admin }).then((item) => ({ staff: item }))));
router.post('/:id/delete', canManage, validate(rules.staffIdRequest), ok('staff_deleted', (req) => staff.deleteStaff({ id: req.params.id, actor: req.admin }).then(() => ({ id: req.params.id }))));

// A request that fails after the upload must not leave an orphaned photo on disk.
router.use((error, req, res, next) => {
  if (req.file) removeStoredUpload(photo(req));
  next(error);
});

export default router;
