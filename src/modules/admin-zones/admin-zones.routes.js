import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { requirePermission } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './admin-zones.controller.js';
import {
  createZoneRequest,
  setZoneModuleRequest,
  testPointRequest,
  updateZoneRequest,
  updateZoneStatusRequest,
  zoneIdRequest
} from './admin-zones.validation.js';

const router = Router();
const canView = requirePermission('zones.view');
const canManage = requirePermission('zones.manage');

// Zones are never deleted — bookings reference them — so "remove" means status inactive.
router.use(authenticateAdmin);
router.get('/', canView, controller.list);
router.post('/test-point', canView, validate(testPointRequest), controller.testPoint);
router.get('/:id', canView, validate(zoneIdRequest), controller.show);
router.post('/', canManage, validate(createZoneRequest), controller.create);
router.post('/:id/update', canManage, validate(updateZoneRequest), controller.update);
router.post('/:id/status', canManage, validate(updateZoneStatusRequest), controller.updateStatus);
router.post('/:id/modules/:serviceId', canManage, validate(setZoneModuleRequest), controller.setModule);

export default router;
