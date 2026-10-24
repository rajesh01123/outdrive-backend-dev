import { validationError } from '../../middleware/validate.js';

export const ONBOARDING_LOCALES = ['en', 'hi'];

const text = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

const limited = (body, key, max, { required = false, min = 0 } = {}) => {
  if (!required && body[key] === undefined) return;
  body[key] = text(body[key]);
  if (required && body[key].length < min) validationError(key, `${key} must be between ${min} and ${max} characters`);
  if (body[key].length > max) validationError(key, `${key} must not exceed ${max} characters`);
};

const slideFields = (body, { creating }) => {
  limited(body, 'title', 80, { required: creating || body.title !== undefined, min: 2 });
  limited(body, 'description', 200);
  limited(body, 'title_hi', 80);
  limited(body, 'description_hi', 200);
  if (creating || body.status !== undefined) {
    body.status = text(body.status) || 'active';
    if (!['active', 'inactive'].includes(body.status)) validationError('status', 'status must be active or inactive');
  }
};

export const slideIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

export const createSlideRequest = (req) => {
  slideFields(req.body, { creating: true });
  if (!req.file) validationError('image', 'image is required');
};

export const updateSlideRequest = (req) => {
  slideIdRequest(req);
  slideFields(req.body, { creating: false });
};

export const slideStatusRequest = (req) => {
  slideIdRequest(req);
  req.body.status = text(req.body.status);
  if (!['active', 'inactive'].includes(req.body.status)) validationError('status', 'status must be active or inactive');
};

export const reorderSlidesRequest = (req) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length || !ids.every((id) => Number.isInteger(id) && id > 0)) validationError('ids', 'ids must be a non-empty array of slide ids');
  if (new Set(ids).size !== ids.length) validationError('ids', 'ids must not contain duplicates');
};

// HOME-09 — GET /common/on-boarding?locale=en|hi
export const publicOnboardingRequest = (req) => {
  req.query.locale = text(req.query.locale).toLowerCase() || 'en';
  if (!ONBOARDING_LOCALES.includes(req.query.locale)) validationError('locale', 'locale must be en or hi');
};
