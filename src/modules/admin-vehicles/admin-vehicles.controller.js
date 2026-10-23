import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { storedUploadPath } from '../../shared/utils/image-upload.js';
import * as adminVehiclesService from './admin-vehicles.service.js';

export const list = asyncHandler(async (req, res) => success(res, { message: 'OK', data: await adminVehiclesService.listVehicleTypes() }));

export const create = asyncHandler(async (req, res) => {
  const vehicle = await adminVehiclesService.createVehicleType({ body: req.body, icon: storedUploadPath('vehicles', req.file) });
  return success(res, { status: 201, message: 'vehicle_type_created', data: { vehicle } });
});

export const update = asyncHandler(async (req, res) => {
  const vehicle = await adminVehiclesService.updateVehicleType({ id: req.params.id, body: req.body, icon: storedUploadPath('vehicles', req.file) });
  return success(res, { message: 'vehicle_type_updated', data: { vehicle } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const vehicle = await adminVehiclesService.updateVehicleStatus({ id: req.params.id, status: req.body.status });
  return success(res, { message: 'vehicle_type_status_updated', data: { vehicle } });
});

export const reorder = asyncHandler(async (req, res) => {
  const vehicles = await adminVehiclesService.reorderVehicleTypes(req.body.ids);
  return success(res, { message: 'vehicle_types_reordered', data: { vehicles } });
});

export const mapping = asyncHandler(async (req, res) => success(res, { message: 'OK', data: await adminVehiclesService.getMapping() }));

export const saveMapping = asyncHandler(async (req, res) =>
  success(res, { message: 'vehicle_mapping_saved', data: await adminVehiclesService.saveMapping(req.body.mapping) })
);
