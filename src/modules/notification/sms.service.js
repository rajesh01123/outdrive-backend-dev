import { env } from '../../config/env.js';
import { AppError } from '../../shared/utils/app-error.js';

// Replace this adapter with MSG91/Twilio/etc. in production. Never log real OTPs in production.
export const sendOtpSms = async ({ mobile, otp }) => {
  if (env.nodeEnv !== 'production') {
    console.info(`[DEV OTP] ${mobile}: ${otp}`);
    return { provider: 'development' };
  }
  throw new AppError('sms_provider_not_configured', 503);
};
