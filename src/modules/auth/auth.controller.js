import * as authService from './auth.service.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { storedProfilePath } from '../../shared/utils/profile-upload.js';
import { revokeSessions } from './auth.repository.js';
import { recordAudit } from '../audit/audit.service.js';

export const validateMobile = asyncHandler(async (req, res) => {
  const result = await authService.validateMobile(req.body);
  return success(res, result);
});

export const sendOtp = asyncHandler(async (req, res) => {
  const data = await authService.sendOtp(req.body);
  return success(res, { message: 'otp_sent', data });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyOtpOnly(req.body);
  return success(res, { message: 'otp_valid', data });
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  return success(res, { message: 'login_success', data });
});

export const register = asyncHandler(async (req, res) => {
  const data = await authService.register({ ...req.body, profilePicture: storedProfilePath(req.file) });
  return success(res, { status: 201, message: 'register_success', data });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeSessions({ userId: req.auth.userId, deviceToken: req.body.device_token });
  recordAudit({ action: 'app.user_logout', description: 'Signed out of the app' });
  return success(res, { message: 'logged_out' });
});
