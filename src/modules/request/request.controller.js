import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import * as recentSearchService from './recent-search.service.js';
import * as requestService from './request.service.js';
import { listAvailableCoupons } from '../coupon/coupon.service.js';
import * as bookingService from '../booking/booking.service.js';

// ETA-01 keeps enabled_dispatch_type beside data (app contract), so it builds the envelope itself.
export const eta = asyncHandler(async (req, res) => {
  const { message, enabledDispatchType, data } = await requestService.estimate({ body: req.body, user: req.user });
  return res.status(200).json({ success: true, message, enabled_dispatch_type: enabledDispatchType, data });
});

// BOOK-01
export const createBooking = asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: await bookingService.createBooking({ body: req.body, user: req.user }) })
);

// HOME-10
export const promocodeList = asyncHandler(async (req, res) => {
  const data = await listAvailableCoupons({ userId: req.auth.userId, moduleKey: req.query.module_key, zoneId: req.query.zone_id, appliedCode: req.query.promo_code });
  return success(res, { message: 'OK', data });
});

export const listRecentSearches = asyncHandler(async (req, res) => {
  const data = await recentSearchService.listRecentSearches({ userId: req.auth.userId, limit: req.query.limit, transportType: req.query.transport_type });
  return success(res, { message: 'OK', data });
});

export const saveRecentSearch = asyncHandler(async (req, res) => {
  const data = await recentSearchService.saveRecentSearch({ userId: req.auth.userId, body: req.body });
  return success(res, { message: 'recent_saved', data });
});
