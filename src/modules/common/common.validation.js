import { validationError } from '../../middleware/validate.js';

const text = (value) => (typeof value === 'string' ? value.trim() : '');

export const coordinate = (body, key, min, max) => {
  const raw = body[key];
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    validationError(key, `${key} must be a number between ${min} and ${max}`);
  }
  body[key] = value;
};

export const moduleKeyField = (source) => {
  source.module_key = text(source.module_key);
  if (!source.module_key) validationError('module_key', 'module_key is required');
};

export const serviceAvailabilityRequest = (req) => {
  const { body } = req;
  coordinate(body, 'pick_lat', -90, 90);
  coordinate(body, 'pick_lng', -180, 180);
  moduleKeyField(body);
  // Drop is accepted for forward compatibility but not checked yet.
  if (body.drop_lat !== undefined && body.drop_lat !== '' && body.drop_lat !== null) coordinate(body, 'drop_lat', -90, 90);
  if (body.drop_lng !== undefined && body.drop_lng !== '' && body.drop_lng !== null) coordinate(body, 'drop_lng', -180, 180);
};

export const cancelPolicyRequest = (req) => moduleKeyField(req.query);
