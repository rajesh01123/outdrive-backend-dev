import { GENDERS, MAP_TYPES } from '../../shared/constants/auth.js';
import { validationError } from '../../middleware/validate.js';

const optionalText = (value) => (typeof value === 'string' ? value.trim() : undefined);

export const updateProfileRequest = (req) => {
  const { body } = req;
  if (body.name !== undefined) {
    const name = optionalText(body.name)?.replace(/\s+/g, ' ');
    if (!name || name.length < 2 || name.length > 80) validationError('name', 'name must be between 2 and 80 characters');
    body.name = name;
  }
  if (body.mobile !== undefined && !/^\d{10}$/.test(optionalText(body.mobile))) {
    validationError('mobile', 'mobile must contain exactly 10 digits');
  }
  if (body.country_code !== undefined && optionalText(body.country_code) !== '91') {
    validationError('country_code', 'only country_code 91 is supported');
  }
  if (body.gender !== undefined && body.gender !== '' && !GENDERS.includes(optionalText(body.gender))) {
    validationError('gender', 'gender must be male, female or others');
  }
  if (body.map_type !== undefined && body.map_type !== '' && !MAP_TYPES.includes(optionalText(body.map_type))) {
    validationError('map_type', 'map_type must be google_map');
  }
};

export const deleteAccountRequest = (req) => {
  const otp = optionalText(req.body.otp);
  if (!/^\d{6}$/.test(otp || '')) validationError('otp', 'otp must contain exactly 6 digits');
  if (req.body.reason !== undefined && String(req.body.reason).trim().length > 500) {
    validationError('reason', 'reason must not exceed 500 characters');
  }
  req.body.otp = otp;
};

// HOME-06
export const addFavouriteRequest = (req) => {
  const { body } = req;
  for (const [key, limit] of [['pick_lat', 90], ['pick_lng', 180]]) {
    const value = typeof body[key] === 'string' && body[key].trim() !== '' ? Number(body[key]) : body[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) validationError(key, `${key} must be a number between -${limit} and ${limit}`);
    body[key] = value;
  }
  body.pick_address = (optionalText(body.pick_address) || '').replace(/\s+/g, ' ');
  if (!body.pick_address || body.pick_address.length > 255) validationError('pick_address', 'pick_address is required (max 255 characters)');
  body.address_name = (optionalText(body.address_name) || '').replace(/\s+/g, ' ');
  if (!body.address_name || body.address_name.length > 40) validationError('address_name', 'address_name is required (max 40 characters)');
  body.landmark = optionalText(body.landmark) || '';
  if (body.landmark.length > 120) validationError('landmark', 'landmark must not exceed 120 characters');
};

// HOME-07 — id from the URL (/favourite-location/:id) or the body ({ "id": "f_91" }).
export const deleteFavouriteRequest = (req) => {
  const raw = String(req.params.id ?? req.body?.id ?? '').trim();
  if (!raw) validationError('id', 'id is required');
  req.favouriteId = raw;
};
