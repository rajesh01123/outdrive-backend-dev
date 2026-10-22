import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { env } from '../../config/env.js';
import { OtpVerification } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { countDailyOtps, findLatestOtp, findLatestOtpSent } from './auth.repository.js';
import { sendOtpSms } from '../notification/sms.service.js';

const otpValue = () => env.otp.fixedValue || crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

const latestOrThrow = async ({ mobile, countryCode, purpose, transaction }) => {
  const record = await findLatestOtp({ mobile, countryCode, purpose, transaction, lock: Boolean(transaction) });
  if (!record) throw new AppError('otp_not_found', 400);

  if (record.expiresAt.getTime() <= Date.now()) {
    if (record.status === 'pending' || record.status === 'verified') {
      await record.update({ status: 'expired' }, { transaction });
    }
    throw new AppError('otp_expired', 400);
  }
  if (record.status === 'locked') throw new AppError('otp_attempts_exceeded', 429);
  if (record.status === 'used') throw new AppError('otp_already_used', 400);
  if (record.status === 'expired') throw new AppError('otp_expired', 400);
  return record;
};

const assertMatchingOtp = async ({ record, otp, transaction }) => {
  const valid = await bcrypt.compare(otp, record.otpHash);
  if (valid) return;

  const attempts = record.attempts + 1;
  const locked = attempts >= record.maxAttempts;
  await record.update({ attempts, status: locked ? 'locked' : record.status }, { transaction });
  throw new AppError(locked ? 'otp_attempts_exceeded' : 'invalid_otp', locked ? 429 : 400, {
    remaining_attempts: Math.max(record.maxAttempts - attempts, 0)
  });
};

export const createAndSendOtp = async ({ mobile, countryCode, deviceToken, purpose }) => {
  const now = new Date();
  const latest = await findLatestOtpSent({ mobile, countryCode });
  if (latest) {
    const elapsedSeconds = Math.floor((now.getTime() - latest.sentAt.getTime()) / 1000);
    if (elapsedSeconds < env.otp.resendSeconds) {
      throw new AppError('otp_resend_not_allowed', 429, {
        resend_after_sec: env.otp.resendSeconds - elapsedSeconds
      });
    }
  }

  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const sentToday = await countDailyOtps({ mobile, countryCode, from: startOfDay });
  if (sentToday >= env.otp.dailyCap) throw new AppError('otp_daily_limit_exceeded', 429);

  const otp = otpValue();
  const expiresAt = new Date(now.getTime() + env.otp.expirySeconds * 1000);
  await OtpVerification.create({
    mobile,
    countryCode,
    purpose,
    otpHash: await bcrypt.hash(otp, 12),
    expiresAt,
    attempts: 0,
    maxAttempts: env.otp.maxAttempts,
    status: 'pending',
    sentAt: now,
    deviceToken
  });
  await sendOtpSms({ mobile: `${countryCode}${mobile}`, otp });

  const response = {
    expires_in_sec: env.otp.expirySeconds,
    resend_after_sec: env.otp.resendSeconds
  };

  // Development-only convenience for mobile/frontend testing. Never expose OTP in production.
  if (env.nodeEnv !== 'production') response.otp = otp;
  return response;
};

export const verifyOtp = async ({ mobile, countryCode, otp, purpose = null, transaction, consume = false }) => {
  const record = await latestOrThrow({ mobile, countryCode, purpose, transaction });
  await assertMatchingOtp({ record, otp, transaction });

  const update = { status: consume ? 'used' : 'verified' };
  if (!record.verifiedAt) update.verifiedAt = new Date();
  if (consume) update.consumedAt = new Date();
  await record.update(update, { transaction });
  return record;
};

// Kept exported for operational cleanup jobs, e.g. marking stale pending OTPs as expired.
export const expireOutstandingOtps = () =>
  OtpVerification.update(
    { status: 'expired' },
    { where: { status: { [Op.in]: ['pending', 'verified'] }, expiresAt: { [Op.lt]: new Date() } } }
  );
