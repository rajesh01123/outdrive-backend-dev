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
