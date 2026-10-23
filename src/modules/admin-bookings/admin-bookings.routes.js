import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { authorizeAdmin } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './admin-bookings.controller.js';
import { bookingIdRequest, cancelBookingRequest, listBookingsRequest, statsRequest } from './admin-bookings.validation.js';

const router = Router();
const canView = authorizeAdmin('super_admin', 'operations', 'support');
const canCancel = authorizeAdmin('super_admin', 'operations');

router.use(authenticateAdmin);
router.get('/stats', canView, validate(statsRequest), controller.stats);
router.get('/', canView, validate(listBookingsRequest), controller.list);
router.get('/:id', canView, validate(bookingIdRequest), controller.show);
router.post('/:id/cancel', canCancel, validate(cancelBookingRequest), controller.cancel);

export default router;
