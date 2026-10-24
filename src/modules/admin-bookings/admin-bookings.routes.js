import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { requirePermission } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './admin-bookings.controller.js';
import { bookingIdRequest, cancelBookingRequest, listBookingsRequest, statsRequest } from './admin-bookings.validation.js';

const router = Router();
const canView = requirePermission('bookings.view');
const canCancel = requirePermission('bookings.manage');

router.use(authenticateAdmin);
router.get('/stats', canView, validate(statsRequest), controller.stats);
router.get('/', canView, validate(listBookingsRequest), controller.list);
router.get('/:id', canView, validate(bookingIdRequest), controller.show);
router.post('/:id/cancel', canCancel, validate(cancelBookingRequest), controller.cancel);

export default router;
