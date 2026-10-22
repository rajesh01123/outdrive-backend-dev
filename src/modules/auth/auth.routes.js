import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { profileUpload } from '../../shared/utils/profile-upload.js';
import * as controller from './auth.controller.js';
import {
  loginRequest,
  logoutRequest,
  registerRequest,
  sendOtpRequest,
  validateMobileRequest,
  verifyOtpRequest
} from './auth.validation.js';

const router = Router();

router.post('/validate-mobile', validate(validateMobileRequest), controller.validateMobile);
router.post('/send-otp', validate(sendOtpRequest), controller.sendOtp);
router.post('/verify-otp', validate(verifyOtpRequest), controller.verifyOtp);
router.post('/login', validate(loginRequest), controller.login);
router.post('/register', profileUpload.single('profile_picture'), validate(registerRequest), controller.register);
router.post('/logout', authenticate, validate(logoutRequest), controller.logout);

export default router;
