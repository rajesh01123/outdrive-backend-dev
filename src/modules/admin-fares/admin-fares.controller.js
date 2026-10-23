import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import * as adminFaresService from './admin-fares.service.js';

export const list = asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: await adminFaresService.listFares({ zoneId: req.query.zone_id }) })
);

export const save = asyncHandler(async (req, res) => {
  const fare = await adminFaresService.saveFare({ body: req.body, adminId: req.admin.id });
  return success(res, { message: 'fare_saved', data: { fare } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const fare = await adminFaresService.updateFareStatus({ id: req.params.id, status: req.body.status, adminId: req.admin.id });
  return success(res, { message: 'fare_status_updated', data: { fare } });
});

export const copy = asyncHandler(async (req, res) => {
  const result = await adminFaresService.copyFares({
    fromZoneId: req.body.from_zone_id,
    toZoneId: req.body.to_zone_id,
    overwrite: req.body.overwrite,
    adminId: req.admin.id
  });
  return success(res, { message: 'fares_copied', data: result });
});

export const preview = asyncHandler(async (req, res) => {
  const data = await adminFaresService.previewFares({
    zoneId: req.body.zone_id,
    fareCategory: req.body.fare_category,
    distanceKm: req.body.distance_km,
    minutes: req.body.minutes,
    seats: req.body.seats,
    roundTrip: req.body.round_trip
  });
  return success(res, { message: 'OK', data });
});

export const history = asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: await adminFaresService.listHistory({ zoneId: req.query.zone_id, page: req.query.page }) })
);
