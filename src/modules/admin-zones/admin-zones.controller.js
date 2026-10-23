import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import * as adminZonesService from './admin-zones.service.js';

export const list = asyncHandler(async (req, res) => success(res, { message: 'OK', data: await adminZonesService.listZones() }));

export const show = asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: { zone: await adminZonesService.getZone(req.params.id) } })
);

export const create = asyncHandler(async (req, res) =>
  success(res, { status: 201, message: 'zone_created', data: await adminZonesService.createZone(req.body) })
);

export const update = asyncHandler(async (req, res) =>
  success(res, { message: 'zone_updated', data: await adminZonesService.updateZone({ id: req.params.id, body: req.body }) })
);

export const updateStatus = asyncHandler(async (req, res) => {
  const zone = await adminZonesService.updateZoneStatus({ id: req.params.id, status: req.body.status });
  return success(res, { message: 'zone_status_updated', data: { zone } });
});

export const setModule = asyncHandler(async (req, res) => {
  const zone = await adminZonesService.setZoneModule({ id: req.params.id, serviceId: req.params.serviceId, isEnabled: req.body.is_enabled });
  return success(res, { message: 'zone_module_updated', data: { zone } });
});

export const testPoint = asyncHandler(async (req, res) => {
  const data = await adminZonesService.testPoint({ lat: req.body.lat, lng: req.body.lng, moduleKey: req.body.module_key });
  return success(res, { message: data.is_serviceable ? 'service_available' : data.reason, data });
});
