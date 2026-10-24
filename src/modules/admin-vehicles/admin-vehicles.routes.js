import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { requirePermission } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import { createImageUpload, removeStoredUpload, storedUploadPath } from '../../shared/utils/image-upload.js';
import * as controller from './admin-vehicles.controller.js';
import {
  createVehicleRequest,
  reorderVehiclesRequest,
  saveMappingRequest,
  updateVehicleRequest,
  updateVehicleStatusRequest
} from './admin-vehicles.validation.js';

const router = Router();
const canView = requirePermission('vehicles.view');
const canManage = requirePermission('vehicles.manage');
const iconUpload = createImageUpload({ folder: 'vehicles', field: 'icon', maxSizeMb: 2 }).single('icon');

// Vehicle types are never deleted — fares and bookings reference them — so "remove" means inactive.
router.use(authenticateAdmin);
router.get('/', canView, controller.list);
router.get('/mapping', canView, controller.mapping);
router.post('/mapping', canManage, validate(saveMappingRequest), controller.saveMapping);
router.post('/reorder', canManage, validate(reorderVehiclesRequest), controller.reorder);
router.post('/', canManage, iconUpload, validate(createVehicleRequest), controller.create);
router.post('/:id/update', canManage, iconUpload, validate(updateVehicleRequest), controller.update);
router.post('/:id/status', canManage, validate(updateVehicleStatusRequest), controller.updateStatus);

router.use((error, req, res, next) => {
  if (req.file) removeStoredUpload(storedUploadPath('vehicles', req.file));
  next(error);
});

export default router;
