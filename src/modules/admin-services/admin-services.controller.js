import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { storedUploadPath } from '../../shared/utils/image-upload.js';
import * as adminServicesService from './admin-services.service.js';

export const list = asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: await adminServicesService.listServices() })
);

export const update = asyncHandler(async (req, res) => {
  const service = await adminServicesService.updateService({ id: req.params.id, body: req.body, image: storedUploadPath('services', req.file) });
  return success(res, { message: 'service_updated', data: { service } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const service = await adminServicesService.updateServiceStatus({ id: req.params.id, status: req.body.status });
  return success(res, { message: 'service_status_updated', data: { service } });
});

export const reorder = asyncHandler(async (req, res) => {
  const services = await adminServicesService.reorderServices(req.body.ids);
  return success(res, { message: 'services_reordered', data: { services } });
});
