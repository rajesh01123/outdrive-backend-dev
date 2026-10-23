import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import * as adminBookingsService from './admin-bookings.service.js';

export const stats = asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: { stats: await adminBookingsService.getStats({ section: req.query.section }) } })
);

export const list = asyncHandler(async (req, res) => success(res, { message: 'OK', data: await adminBookingsService.listBookings(req.query) }));

export const show = asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: { booking: await adminBookingsService.getBooking(req.params.id) } })
);

export const cancel = asyncHandler(async (req, res) => {
  const booking = await adminBookingsService.cancelBooking({ id: req.params.id, reason: req.body.reason });
  return success(res, { message: 'booking_cancelled', data: { booking } });
});
