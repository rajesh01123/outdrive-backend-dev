import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { storedUploadPath } from '../../shared/utils/image-upload.js';
import * as adminBannersService from './admin-banners.service.js';

export const list = asyncHandler(async (req, res) => success(res, { message: 'OK', data: await adminBannersService.listBanners() }));

export const create = asyncHandler(async (req, res) => {
  const banner = await adminBannersService.createBanner({ body: req.body, image: storedUploadPath('banners', req.file) });
  return success(res, { status: 201, message: 'banner_created', data: { banner } });
});

export const update = asyncHandler(async (req, res) => {
  const banner = await adminBannersService.updateBanner({ id: req.params.id, body: req.body, image: storedUploadPath('banners', req.file) });
  return success(res, { message: 'banner_updated', data: { banner } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const banner = await adminBannersService.updateBannerStatus({ id: req.params.id, status: req.body.status });
  return success(res, { message: 'banner_status_updated', data: { banner } });
});

export const reorder = asyncHandler(async (req, res) => {
  const banners = await adminBannersService.reorderBanners(req.body.ids);
  return success(res, { message: 'banners_reordered', data: { banners } });
});

export const destroy = asyncHandler(async (req, res) => {
  await adminBannersService.deleteBanner(req.params.id);
  return success(res, { message: 'banner_deleted', data: { id: req.params.id } });
});
