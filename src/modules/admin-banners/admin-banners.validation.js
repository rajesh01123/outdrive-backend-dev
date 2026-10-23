import { validationError } from '../../middleware/validate.js';
import { parseIstDatetime } from '../../shared/utils/ist-datetime.js';

export const LINK_TYPES = ['none', 'module', 'url'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const bannerFields = (body, { creating }) => {
  if (creating || body.title !== undefined) {
    body.title = text(body.title).replace(/\s+/g, ' ');
    if (body.title.length < 2 || body.title.length > 80) validationError('title', 'title must be between 2 and 80 characters');
  }
  if (body.subtitle !== undefined) {
    body.subtitle = text(body.subtitle).replace(/\s+/g, ' ');
    if (body.subtitle.length > 120) validationError('subtitle', 'subtitle must not exceed 120 characters');
  }
  if (body.module_key !== undefined) body.module_key = text(body.module_key);
  if (creating || body.link_type !== undefined) {
    body.link_type = text(body.link_type) || 'none';
    if (!LINK_TYPES.includes(body.link_type)) validationError('link_type', 'link_type must be none, module or url');
    body.link_value = text(body.link_value);
    if (body.link_type === 'none') body.link_value = '';
    if (body.link_type === 'module' && !body.link_value) validationError('link_value', 'choose the module this banner opens');
    if (body.link_type === 'url' && (!/^https?:\/\/\S+$/i.test(body.link_value) || body.link_value.length > 500)) validationError('link_value', 'link_value must be a full http(s) URL (max 500 characters)');
  }
  if (creating || body.status !== undefined) {
    body.status = text(body.status) || 'active';
    if (!['active', 'inactive'].includes(body.status)) validationError('status', 'status must be active or inactive');
  }
  for (const key of ['starts_at', 'ends_at']) {
    if (body[key] === undefined) continue;
    const date = parseIstDatetime(body[key]);
    if (date === undefined) validationError(key, `${key} must be a date and time like 2026-10-23 10:30`);
    body[key] = date;
  }
  if (body.starts_at && body.ends_at && body.ends_at <= body.starts_at) validationError('ends_at', 'ends_at must be after starts_at');
};

export const bannerIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

export const createBannerRequest = (req) => {
  bannerFields(req.body, { creating: true });
  if (!req.file) validationError('image', 'image is required');
};

export const updateBannerRequest = (req) => {
  bannerIdRequest(req);
  bannerFields(req.body, { creating: false });
};

export const updateBannerStatusRequest = (req) => {
  bannerIdRequest(req);
  req.body.status = text(req.body.status);
  if (!['active', 'inactive'].includes(req.body.status)) validationError('status', 'status must be active or inactive');
};

export const reorderBannersRequest = (req) => {
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
  query.module_key = text(query.module_key);
};
