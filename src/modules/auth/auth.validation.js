import { COUNTRY_CODE, LOGIN_PLATFORMS, OTP_PURPOSES } from '../../shared/constants/auth.js';
import { validationError } from '../../middleware/validate.js';

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const required = (body, key) => {
  const value = text(body[key]);
  if (!value) validationError(key, `${key} is required`);
  return value;
};

const assertMobile = (body) => {
  const mobile = required(body, 'mobile');
  if (!/^\d{10}$/.test(mobile)) validationError('mobile', 'mobile must contain exactly 10 digits');
  body.mobile = mobile;
};

const assertCountryCode = (body) => {
  const countryCode = required(body, 'country_code');
  if (countryCode !== COUNTRY_CODE) validationError('country_code', 'only country_code 91 is supported');
  body.country_code = countryCode;
};

const assertDevice = (body) => {
  const deviceToken = required(body, 'device_token');
  if (deviceToken.length > 255) validationError('device_token', 'device_token must not exceed 255 characters');
  body.device_token = deviceToken;
};

const assertPlatform = (body) => {
  const loginBy = required(body, 'login_by').toLowerCase();
  if (!LOGIN_PLATFORMS.includes(loginBy)) validationError('login_by', 'login_by must be android or ios');
  body.login_by = loginBy;
};

const assertOtp = (body) => {
  const otp = required(body, 'otp');
  if (!/^\d{6}$/.test(otp)) validationError('otp', 'otp must contain exactly 6 digits');
  body.otp = otp;
};

export const validateMobileRequest = (req) => {
  assertMobile(req.body);
  assertCountryCode(req.body);
  assertDevice(req.body);
  assertPlatform(req.body);
};

export const sendOtpRequest = (req) => {
  validateMobileRequest(req);
  const purpose = required(req.body, 'purpose');
  if (!OTP_PURPOSES.includes(purpose)) validationError('purpose', 'purpose must be login, signup or delete_account');
  req.body.purpose = purpose;
};

export const verifyOtpRequest = (req) => {
  validateMobileRequest(req);
  assertOtp(req.body);
};

export const loginRequest = (req) => {
  validateMobileRequest(req);
  assertOtp(req.body);
};

export const registerRequest = (req) => {
  validateMobileRequest(req);
  assertOtp(req.body);
  const name = required(req.body, 'name').replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) validationError('name', 'name must be between 2 and 80 characters');
  req.body.name = name;
};

export const logoutRequest = (req) => {
  assertDevice(req.body);
};
