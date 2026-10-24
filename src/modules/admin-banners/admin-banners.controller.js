import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { storedUploadPath } from '../../shared/utils/image-upload.js';
import * as adminBannersService from './admin-banners.service.js';

export const list = asyncHandler(async (req, res) => success(res, { message: 'OK', data: await adminBannersService.listBanners() }));

export const create = asyncHandler(async (req, res) => {
  const banner = await adminBannersService.createBanner({ type: req.body.type, image: storedUploadPath('banners', req.file) });
  return success(res, { status: 201, message: 'banner_created', data: { banner } });
});

export const update = asyncHandler(async (req, res) => {
  const banner = await adminBannersService.updateBanner({ id: req.params.id, type: req.body.type, image: storedUploadPath('banners', req.file) });
  return success(res, { message: 'banner_updated', data: { banner } });
});

export const reorder = asyncHandler(async (req, res) => {
  const banners = await adminBannersService.reorderBanners({ type: req.body.type, ids: req.body.ids });
  return success(res, { message: 'banners_reordered', data: { banners } });
});

export const destroy = asyncHandler(async (req, res) => {
  await adminBannersService.deleteBanner(req.params.id);
  return success(res, { message: 'banner_deleted', data: { id: req.params.id } });
});
