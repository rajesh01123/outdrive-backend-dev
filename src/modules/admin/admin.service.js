import bcrypt from 'bcryptjs';
import { sequelize } from '../../config/database.js';
import { Admin, AdminSession } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { findActiveOtherSession, findAdminByEmail, revokeAdminSessions } from './admin.repository.js';
import {
  consumeAdminOtp,
  createAdminOtp,
  issueAdminLoginChallenge,
  issueAdminSession,
  issueTwoFactorChallenge,
  publicAdminPayload,
  verifyAdminChallenge
} from './admin-auth.service.js';

const assertActiveAdmin = (admin) => {
  if (!admin) throw new AppError('invalid_credentials', 401);
  if (admin.status === 'blocked') throw new AppError('admin_blocked', 403);
  if (admin.status !== 'active') throw new AppError('admin_inactive', 403);
};

const completeLogin = async ({ admin, device, requestMeta, forceOtherLogout = false }) =>
  sequelize.transaction(async (transaction) => {
    const currentAdmin = await Admin.findByPk(admin.id, { transaction, lock: transaction.LOCK.UPDATE });
    assertActiveAdmin(currentAdmin);
    const otherSession = await findActiveOtherSession({ adminId: currentAdmin.id, deviceId: device.id, transaction });
    if (otherSession && !forceOtherLogout) {
      throw new AppError('admin_active_session_exists', 409, {
        login_challenge_token: issueAdminLoginChallenge({ admin: currentAdmin, device }),
        active_device: otherSession.deviceName || 'Another device',
        last_active_at: otherSession.lastActiveAt
      });
    }

    // A single active session is retained, including when this is a repeat login from the same browser.
    await revokeAdminSessions({ adminId: currentAdmin.id, transaction });
    const accessToken = await issueAdminSession({ admin: currentAdmin, device, requestMeta, transaction });
    await currentAdmin.update({ lastLoginAt: new Date() }, { transaction });
    return { access_token: accessToken, token_type: 'Bearer', admin: publicAdminPayload(currentAdmin) };
  });

export const loginAdmin = async ({ email, password, device_id: deviceId, device_name: deviceName, requestMeta }) => {
  const admin = await findAdminByEmail(email);
  if (!admin || !await bcrypt.compare(password, admin.passwordHash)) throw new AppError('invalid_credentials', 401);
  assertActiveAdmin(admin);
  const device = { id: deviceId, name: deviceName || 'Unknown browser' };

  if (admin.twoFactorEnabled) {
    const otpData = await createAdminOtp({ admin, purpose: 'login_2fa' });
    return {
      two_factor_required: true,
      two_factor_challenge_token: issueTwoFactorChallenge({ admin, device }),
      ...otpData
    };
  }
  return completeLogin({ admin, device, requestMeta });
};

export const verifyLoginTwoFactor = async ({ challengeToken, otp, requestMeta }) => {
  const challenge = verifyAdminChallenge(challengeToken, 'admin_2fa_challenge');
  const admin = await Admin.findByPk(challenge.sub);
  assertActiveAdmin(admin);
  if (!admin.twoFactorEnabled) throw new AppError('two_factor_not_enabled', 400);
  await sequelize.transaction(async (transaction) => consumeAdminOtp({ adminId: admin.id, purpose: 'login_2fa', otp, transaction }));
  return completeLogin({ admin, device: challenge.device, requestMeta });
};

export const confirmNewDeviceLogin = async ({ challengeToken, requestMeta }) => {
  const challenge = verifyAdminChallenge(challengeToken, 'admin_login_challenge');
  const admin = await Admin.findByPk(challenge.sub);
  assertActiveAdmin(admin);
  return completeLogin({ admin, device: challenge.device, requestMeta, forceOtherLogout: true });
};

export const getAdminProfile = (admin) => publicAdminPayload(admin);

export const updateAdminProfile = async ({ adminId, body, profilePicture }) => {
  const admin = await Admin.findByPk(adminId);
  assertActiveAdmin(admin);
  const values = {};
  if (body.name !== undefined) values.name = body.name;
  if (body.mobile !== undefined) values.mobile = body.mobile;
  if (profilePicture) values.profilePicture = profilePicture;
  if (Object.keys(values).length) await admin.update(values);
  return publicAdminPayload(admin);
};

export const logoutAdmin = ({ sessionId }) => AdminSession.update({ revokedAt: new Date() }, { where: { id: sessionId, revokedAt: null } });

export const sendForgotPasswordOtp = async ({ email }) => {
  const admin = await findAdminByEmail(email);
  // Do not reveal whether an administrator account exists.
  if (!admin || admin.status !== 'active') return { expires_in_sec: 300 };
  return createAdminOtp({ admin, purpose: 'forgot_password' });
};

export const resetForgottenPassword = async ({ email, otp, newPassword }) => {
  const admin = await findAdminByEmail(email);
  assertActiveAdmin(admin);
  await sequelize.transaction(async (transaction) => {
    await consumeAdminOtp({ adminId: admin.id, purpose: 'forgot_password', otp, transaction });
    await admin.update({ passwordHash: await bcrypt.hash(newPassword, 12), passwordChangedAt: new Date() }, { transaction });
    await revokeAdminSessions({ adminId: admin.id, transaction });
  });
};

export const changeAdminPassword = async ({ admin, sessionId, currentPassword, newPassword }) => {
  if (!await bcrypt.compare(currentPassword, admin.passwordHash)) throw new AppError('current_password_incorrect', 400);
  await sequelize.transaction(async (transaction) => {
    await admin.update({ passwordHash: await bcrypt.hash(newPassword, 12), passwordChangedAt: new Date() }, { transaction });
    await revokeAdminSessions({ adminId: admin.id, transaction });
  });
};

const verifyCurrentPassword = async (admin, currentPassword) => {
  if (!await bcrypt.compare(currentPassword, admin.passwordHash)) throw new AppError('current_password_incorrect', 400);
};

export const sendTwoFactorOtp = async ({ admin, currentPassword, action }) => {
  await verifyCurrentPassword(admin, currentPassword);
  const expectedEnabled = action === 'disable';
  if (Boolean(admin.twoFactorEnabled) !== expectedEnabled) {
    throw new AppError(expectedEnabled ? 'two_factor_not_enabled' : 'two_factor_already_enabled', 400);
  }
  return createAdminOtp({ admin, purpose: action === 'enable' ? 'enable_2fa' : 'disable_2fa' });
};

export const verifyTwoFactorSetting = async ({ admin, otp, action }) => {
  const purpose = action === 'enable' ? 'enable_2fa' : 'disable_2fa';
  await sequelize.transaction(async (transaction) => {
    await consumeAdminOtp({ adminId: admin.id, purpose, otp, transaction });
    await admin.update({ twoFactorEnabled: action === 'enable', twoFactorMethod: 'email' }, { transaction });
  });
  return publicAdminPayload(admin);
};
