import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { storedProfilePath } from '../../shared/utils/profile-upload.js';
import * as adminService from './admin.service.js';

const requestMeta = (req) => ({
  userAgent: req.get('user-agent') || '',
  ipAddress: req.ip || req.socket.remoteAddress || ''
});

export const login = asyncHandler(async (req, res) => {
  const data = await adminService.loginAdmin({ ...req.body, requestMeta: requestMeta(req) });
  const message = data.two_factor_required ? 'two_factor_required' : 'admin_login_success';
  return success(res, { message, data });
});

export const verifyTwoFactorLogin = asyncHandler(async (req, res) => {
  const data = await adminService.verifyLoginTwoFactor({
    challengeToken: req.body.two_factor_challenge_token,
    otp: req.body.otp,
    requestMeta: requestMeta(req)
  });
  return success(res, { message: 'admin_login_success', data });
});

export const confirmNewDeviceLogin = asyncHandler(async (req, res) => {
  const data = await adminService.confirmNewDeviceLogin({
    challengeToken: req.body.login_challenge_token,
    requestMeta: requestMeta(req)
  });
  return success(res, { message: 'admin_login_success', data });
});

export const me = asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: { admin: adminService.getAdminProfile(req.admin) } })
);

export const updateProfile = asyncHandler(async (req, res) => {
  const admin = await adminService.updateAdminProfile({
    adminId: req.admin.id,
    body: req.body,
    profilePicture: storedProfilePath(req.file)
  });
  return success(res, { message: 'admin_profile_updated', data: { admin } });
});

export const logout = asyncHandler(async (req, res) => {
  await adminService.logoutAdmin({ sessionId: req.adminAuth.sessionId });
  return success(res, { message: 'admin_logged_out' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const data = await adminService.sendForgotPasswordOtp(req.body);
  return success(res, { message: 'password_reset_otp_sent', data });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await adminService.resetForgottenPassword({
    email: req.body.email,
    otp: req.body.otp,
    newPassword: req.body.new_password
  });
  return success(res, { message: 'password_reset_success_relogin_required' });
});

export const changePassword = asyncHandler(async (req, res) => {
  await adminService.changeAdminPassword({
    admin: req.admin,
    sessionId: req.adminAuth.sessionId,
    currentPassword: req.body.current_password,
    newPassword: req.body.new_password
  });
  return success(res, { message: 'password_changed_relogin_required' });
});

export const sendEnableTwoFactorOtp = asyncHandler(async (req, res) => {
  const data = await adminService.sendTwoFactorOtp({ admin: req.admin, currentPassword: req.body.current_password, action: 'enable' });
  return success(res, { message: 'two_factor_enable_otp_sent', data });
});

export const verifyEnableTwoFactorOtp = asyncHandler(async (req, res) => {
  const admin = await adminService.verifyTwoFactorSetting({ admin: req.admin, otp: req.body.otp, action: 'enable' });
  return success(res, { message: 'two_factor_enabled', data: { admin } });
});

export const sendDisableTwoFactorOtp = asyncHandler(async (req, res) => {
  const data = await adminService.sendTwoFactorOtp({ admin: req.admin, currentPassword: req.body.current_password, action: 'disable' });
  return success(res, { message: 'two_factor_disable_otp_sent', data });
});

export const verifyDisableTwoFactorOtp = asyncHandler(async (req, res) => {
  const admin = await adminService.verifyTwoFactorSetting({ admin: req.admin, otp: req.body.otp, action: 'disable' });
  return success(res, { message: 'two_factor_disabled', data: { admin } });
});
