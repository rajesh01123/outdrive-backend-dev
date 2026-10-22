import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { validate } from '../../middleware/validate.js';
import { profileUpload } from '../../shared/utils/profile-upload.js';
import * as controller from './admin.controller.js';
import {
  adminLoginRequest,
  changePasswordRequest,
  confirmNewDeviceRequest,
  forgotPasswordRequest,
  resetPasswordRequest,
  sendTwoFactorRequest,
  updateAdminProfileRequest,
  verifyTwoFactorRequest,
  verifyTwoFactorSettingRequest
} from './admin.validation.js';

const router = Router();

router.post('/auth/login', validate(adminLoginRequest), controller.login);
router.post('/auth/verify-2fa', validate(verifyTwoFactorRequest), controller.verifyTwoFactorLogin);
router.post('/auth/confirm-new-device-login', validate(confirmNewDeviceRequest), controller.confirmNewDeviceLogin);
router.post('/auth/forgot-password', validate(forgotPasswordRequest), controller.forgotPassword);
router.post('/auth/reset-password', validate(resetPasswordRequest), controller.resetPassword);

router.get('/auth/me', authenticateAdmin, controller.me);
router.post('/auth/logout', authenticateAdmin, controller.logout);
router.get('/profile', authenticateAdmin, controller.me);
router.post('/profile', authenticateAdmin, profileUpload.single('profile_picture'), validate(updateAdminProfileRequest), controller.updateProfile);
router.post('/change-password', authenticateAdmin, validate(changePasswordRequest), controller.changePassword);
router.post('/2fa/send-enable-otp', authenticateAdmin, validate(sendTwoFactorRequest), controller.sendEnableTwoFactorOtp);
router.post('/2fa/verify-enable-otp', authenticateAdmin, validate(verifyTwoFactorSettingRequest), controller.verifyEnableTwoFactorOtp);
router.post('/2fa/send-disable-otp', authenticateAdmin, validate(sendTwoFactorRequest), controller.sendDisableTwoFactorOtp);
router.post('/2fa/verify-disable-otp', authenticateAdmin, validate(verifyTwoFactorSettingRequest), controller.verifyDisableTwoFactorOtp);

export default router;
