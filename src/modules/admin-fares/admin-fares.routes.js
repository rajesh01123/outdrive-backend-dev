import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { authorizeAdmin } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './admin-fares.controller.js';
import {
  copyFaresRequest,
  fareIdStatusRequest,
  historyRequest,
  listFaresRequest,
  previewFareRequest,
  saveFareRequest
} from './admin-fares.validation.js';

const router = Router();
const canView = authorizeAdmin('super_admin', 'operations', 'support');
// Fare changes hit every customer's price, so only a super admin may make them.
const canEditFares = authorizeAdmin('super_admin');

router.use(authenticateAdmin);
router.get('/', canView, validate(listFaresRequest), controller.list);
router.get('/history', canView, validate(historyRequest), controller.history);
router.post('/preview', canView, validate(previewFareRequest), controller.preview);
router.post('/save', canEditFares, validate(saveFareRequest), controller.save);
router.post('/copy', canEditFares, validate(copyFaresRequest), controller.copy);
router.post('/:id/status', canEditFares, validate(fareIdStatusRequest), controller.updateStatus);

export default router;
