import { validationError } from '../../middleware/validate.js';
import { parseIstDatetime } from '../../shared/utils/ist-datetime.js';

export const DISCOUNT_TYPES = ['flat', 'percent'];
const CODE = /^[A-Z0-9]{3,20}$/;

const text = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

const number = (body, key, { min, max, integer = false, nullable = false }) => {
  if (body[key] === undefined) return;
  if (nullable && (body[key] === null || body[key] === '')) { body[key] = null; return; }
  const value = typeof body[key] === 'string' && body[key].trim() !== '' ? Number(body[key]) : body[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    validationError(key, `${key} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}`);
  }
  body[key] = integer ? value : Math.round(value * 100) / 100;
};

const couponFields = (body, { creating }) => {
  if (creating || body.code !== undefined) {
    body.code = text(body.code).toUpperCase();
    if (!CODE.test(body.code)) validationError('code', 'code must be 3 to 20 letters or digits (A–Z, 0–9)');
  }
  if (creating || body.title !== undefined) {
    body.title = text(body.title);
    if (body.title.length < 2 || body.title.length > 80) validationError('title', 'title must be between 2 and 80 characters');
  }
  if (body.description !== undefined) {
    body.description = text(body.description);
    if (body.description.length > 200) validationError('description', 'description must not exceed 200 characters');
  }
  if (creating || body.discount_type !== undefined) {
    body.discount_type = text(body.discount_type);
    if (!DISCOUNT_TYPES.includes(body.discount_type)) validationError('discount_type', 'discount_type must be flat or percent');
  }
  if (creating && body.discount_value === undefined) validationError('discount_value', 'discount_value is required');
  number(body, 'discount_value', { min: 1, max: 100000 });
  if (body.discount_type === 'percent' && body.discount_value > 100) validationError('discount_value', 'a percent discount must be between 1 and 100');
  number(body, 'min_trip_amount', { min: 0, max: 1000000 });
  number(body, 'max_discount_amount', { min: 1, max: 100000, nullable: true });
  number(body, 'uses_per_user', { min: 1, max: 100, integer: true });
  number(body, 'total_uses_limit', { min: 0, max: 1000000, integer: true });
  if (body.module_keys !== undefined) {
    if (!Array.isArray(body.module_keys) || !body.module_keys.every((key) => typeof key === 'string' && key.trim())) validationError('module_keys', 'module_keys must be a list of module keys (empty = all)');
    body.module_keys = [...new Set(body.module_keys.map((key) => key.trim()))];
  }
  if (body.zone_ids !== undefined) {
    if (!Array.isArray(body.zone_ids) || !body.zone_ids.every((id) => Number.isInteger(id) && id > 0)) validationError('zone_ids', 'zone_ids must be a list of zone ids (empty = all)');
    body.zone_ids = [...new Set(body.zone_ids)];
  }
  for (const key of ['starts_at', 'ends_at']) {
    if (body[key] === undefined) continue;
    const date = parseIstDatetime(body[key]);
    if (date === undefined) validationError(key, `${key} must be a date and time like 2026-10-23 10:30`);
    body[key] = date;
  }
  if (body.starts_at && body.ends_at && body.ends_at <= body.starts_at) validationError('ends_at', 'ends_at must be after starts_at');
  if (creating || body.status !== undefined) {
    body.status = text(body.status) || 'active';
    if (!['active', 'inactive'].includes(body.status)) validationError('status', 'status must be active or inactive');
  }
};

export const couponIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

export const createCouponRequest = (req) => couponFields(req.body, { creating: true });

export const updateCouponRequest = (req) => {
  couponIdRequest(req);
  couponFields(req.body, { creating: false });
};

export const couponStatusRequest = (req) => {
  couponIdRequest(req);
  req.body.status = text(req.body.status);
  if (!['active', 'inactive'].includes(req.body.status)) validationError('status', 'status must be active or inactive');
};
