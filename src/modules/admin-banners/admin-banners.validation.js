import { validationError } from '../../middleware/validate.js';

export const BANNER_TYPES = ['user', 'driver'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const bannerType = (source, { required }) => {
  source.type = text(source.type);
  if (!source.type && !required) return;
  if (!BANNER_TYPES.includes(source.type)) validationError('type', 'type must be user or driver');
};

export const bannerIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

export const createBannerRequest = (req) => {
  bannerType(req.body, { required: true });
  if (!req.file) validationError('image', 'image is required');
};

// Change the type, the image, or both.
export const updateBannerRequest = (req) => {
  bannerIdRequest(req);
  bannerType(req.body, { required: false });
};

export const reorderBannersRequest = (req) => {
  bannerType(req.body, { required: true });
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length || !ids.every((id) => Number.isInteger(id) && id > 0)) validationError('ids', 'ids must be a non-empty array of banner ids');
  if (new Set(ids).size !== ids.length) validationError('ids', 'ids must not contain duplicates');
};

// GET /common/banners
export const publicBannersRequest = (req) => {
  const { query } = req;
  const limit = query.limit === undefined || query.limit === '' ? 10 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) validationError('limit', 'limit must be a whole number between 1 and 20');
  query.limit = limit;
  query.type = text(query.type) || 'user';
  if (!BANNER_TYPES.includes(query.type)) validationError('type', 'type must be user or driver');
};
