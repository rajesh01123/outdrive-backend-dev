import { validationError } from '../../middleware/validate.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const required = (body, key) => {
  const value = text(body[key]);
  if (!value) validationError(key, `${key} is required`);
  return value;
};
const email = (body) => {
  const value = required(body, 'email').toLowerCase();
  if (!emailPattern.test(value) || value.length > 150) validationError('email', 'email must be valid');
  body.email = value;
};
const password = (body, key, label = key) => {
  const value = required(body, key);
  if (value.length < 8 || value.length > 128) validationError(key, `${label} must be between 8 and 128 characters`);
  body[key] = value;
};
const device = (body) => {
  const deviceId = required(body, 'device_id');
  if (deviceId.length > 128) validationError('device_id', 'device_id must not exceed 128 characters');
  body.device_id = deviceId;
  if (body.device_name !== undefined) {
    const deviceName = text(body.device_name);
    if (deviceName.length > 255) validationError('device_name', 'device_name must not exceed 255 characters');
    body.device_name = deviceName;
  }
};
const otp = (body) => {
  const value = required(body, 'otp');
  if (!/^\d{6}$/.test(value)) validationError('otp', 'otp must contain exactly 6 digits');
  body.otp = value;
};

export const adminLoginRequest = (req) => { email(req.body); password(req.body, 'password'); device(req.body); };
export const verifyTwoFactorRequest = (req) => { required(req.body, 'two_factor_challenge_token'); otp(req.body); };
export const confirmNewDeviceRequest = (req) => { required(req.body, 'login_challenge_token'); };
export const forgotPasswordRequest = (req) => { email(req.body); };
export const resetPasswordRequest = (req) => {
  email(req.body); otp(req.body); password(req.body, 'new_password', 'new_password'); password(req.body, 'confirm_password', 'confirm_password');
  if (req.body.new_password !== req.body.confirm_password) validationError('confirm_password', 'confirm_password must match new_password');
};
export const changePasswordRequest = (req) => {
  password(req.body, 'current_password', 'current_password'); password(req.body, 'new_password', 'new_password'); password(req.body, 'confirm_password', 'confirm_password');
  if (req.body.new_password !== req.body.confirm_password) validationError('confirm_password', 'confirm_password must match new_password');
};
export const sendTwoFactorRequest = (req) => password(req.body, 'current_password', 'current_password');
export const verifyTwoFactorSettingRequest = (req) => otp(req.body);
export const updateAdminProfileRequest = (req) => {
  if (req.body.name !== undefined) {
    const name = text(req.body.name).replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 120) validationError('name', 'name must be between 2 and 120 characters');
    req.body.name = name;
  }
  if (req.body.mobile !== undefined) {
    const mobile = text(req.body.mobile);
    if (mobile && !/^\d{10}$/.test(mobile)) validationError('mobile', 'mobile must contain exactly 10 digits');
    req.body.mobile = mobile || null;
  }
};
