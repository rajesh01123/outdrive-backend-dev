import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { adminChallengeTokenOptions, adminTokenOptions } from '../../config/auth.js';
import { env } from '../../config/env.js';
import { AdminOtpVerification, AdminSession } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { latestAdminOtp } from './admin.repository.js';

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

const adminPayload = (admin) => ({
  id: `a_${admin.id}`,
  name: admin.name,
  email: admin.email,
  mobile: admin.mobile || '',
  profile_picture: admin.profilePicture || '',
  role: admin.role,
  two_factor_enabled: Boolean(admin.twoFactorEnabled),
  two_factor_method: admin.twoFactorMethod || 'email'
});

const challengeOptions = adminChallengeTokenOptions;

export const issueAdminLoginChallenge = ({ admin, device }) =>
  jwt.sign(
    { sub: String(admin.id), type: 'admin_login_challenge', device },
    env.adminAuth.jwtSecret,
    challengeOptions
  );

export const issueTwoFactorChallenge = ({ admin, device }) =>
  jwt.sign(
    { sub: String(admin.id), type: 'admin_2fa_challenge', device },
    env.adminAuth.jwtSecret,
    challengeOptions
  );

export const verifyAdminChallenge = (token, expectedType) => {
  try {
    const payload = jwt.verify(token, env.adminAuth.jwtSecret, challengeOptions);
    if (payload.type !== expectedType || !payload.sub || !payload.device?.id) throw new Error('Invalid challenge');
    return payload;
  } catch {
    throw new AppError('invalid_or_expired_login_challenge', 401);
  }
};

export const issueAdminSession = async ({ admin, device, requestMeta, transaction }) => {
  const jti = crypto.randomUUID();
  const accessToken = jwt.sign(
    { sub: String(admin.id), jti, type: 'admin', role: admin.role },
    env.adminAuth.jwtSecret,
    adminTokenOptions
  );
  const decoded = jwt.decode(accessToken);
  await AdminSession.create({
    adminId: admin.id,
    deviceId: device.id,
    deviceName: device.name || null,
    userAgent: requestMeta.userAgent || null,
    ipAddress: requestMeta.ipAddress || null,
    tokenJti: jti,
    tokenHash: hash(accessToken),
    lastActiveAt: new Date(),
    expiresAt: new Date(decoded.exp * 1000)
  }, { transaction });
  return accessToken;
};

export const verifyAdminAccessToken = (token) => jwt.verify(token, env.adminAuth.jwtSecret, adminTokenOptions);

const generateOtp = () => env.adminAuth.fixedOtp || crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

export const createAdminOtp = async ({ admin, purpose }) => {
  if (env.nodeEnv === 'production') throw new AppError('admin_email_provider_not_configured', 503);
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + env.adminAuth.otpExpirySeconds * 1000);
  await AdminOtpVerification.create({
    adminId: admin.id,
    email: admin.email,
    purpose,
    otpHash: await bcrypt.hash(otp, 12),
    expiresAt,
    maxAttempts: env.adminAuth.otpMaxAttempts
  });
  console.info(`[DEV ADMIN OTP] ${admin.email}: ${otp} (${purpose})`);

  return {
    expires_in_sec: env.adminAuth.otpExpirySeconds,
    otp
  };
};

export const consumeAdminOtp = async ({ adminId, purpose, otp, transaction }) => {
  const record = await latestAdminOtp({ adminId, purpose, transaction });
  if (!record) throw new AppError('otp_not_found', 400);
  if (record.expiresAt.getTime() <= Date.now()) {
    await record.update({ status: 'expired' }, { transaction });
    throw new AppError('otp_expired', 400);
  }
  if (record.status === 'used') throw new AppError('otp_already_used', 400);
  if (record.status === 'locked') throw new AppError('otp_attempts_exceeded', 429);
  if (record.status === 'expired') throw new AppError('otp_expired', 400);

  if (!await bcrypt.compare(otp, record.otpHash)) {
    const attempts = record.attempts + 1;
    const locked = attempts >= record.maxAttempts;
    await record.update({ attempts, status: locked ? 'locked' : 'pending' }, { transaction });
    throw new AppError(locked ? 'otp_attempts_exceeded' : 'invalid_otp', locked ? 429 : 400, { remaining_attempts: Math.max(record.maxAttempts - attempts, 0) });
  }
  await record.update({ status: 'used', usedAt: new Date() }, { transaction });
};

export const publicAdminPayload = adminPayload;
export const activeAdminSessionWhere = (jti) => ({ tokenJti: jti, revokedAt: null, expiresAt: { [Op.gt]: new Date() } });
