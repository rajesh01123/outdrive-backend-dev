import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { authorizeAdmin } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import { createImageUpload, removeStoredUpload, storedUploadPath } from '../../shared/utils/image-upload.js';
import * as controller from './admin-services.controller.js';
import { reorderServicesRequest, updateServiceRequest, updateServiceStatusRequest } from './admin-services.validation.js';

const router = Router();
const canView = authorizeAdmin('super_admin', 'operations', 'support');
const canManage = authorizeAdmin('super_admin', 'operations');
const serviceImageUpload = createImageUpload({ folder: 'services', field: 'image', maxSizeMb: 2 }).single('image');

// The 7 ride modules are a fixed app contract (HOME-01), so there is no create or delete.
router.use(authenticateAdmin);
router.get('/', canView, controller.list);
router.post('/reorder', canManage, validate(reorderServicesRequest), controller.reorder);
router.post('/:id/update', canManage, serviceImageUpload, validate(updateServiceRequest), controller.update);
router.post('/:id/status', canManage, validate(updateServiceStatusRequest), controller.updateStatus);

// A request that fails after the upload must not leave an orphaned image on disk.
router.use((error, req, res, next) => {
  if (req.file) removeStoredUpload(storedUploadPath('services', req.file));
  next(error);
});

export default router;
