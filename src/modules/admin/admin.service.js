import bcrypt from 'bcryptjs';
import { sequelize } from '../../config/database.js';
import { Admin, AdminSession } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { adminActor, diffChanges, maskEmail, maskMobile, recordAudit } from '../audit/audit.service.js';
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

const loginNote = { password: '', two_factor: ' with a two-factor code', new_device: '; the other device was signed out' };

const completeLogin = async ({ admin, device, requestMeta, forceOtherLogout = false, via = 'password' }) =>
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
    recordAudit({
      action: 'admin.login',
      actor: adminActor(currentAdmin),
      device: device.name,
      description: `Signed in on ${device.name || 'a browser'}${loginNote[via] || ''}`
    }, { transaction });
    return { access_token: accessToken, token_type: 'Bearer', admin: publicAdminPayload(currentAdmin) };
  });

export const loginAdmin = async ({ email, password, device_id: deviceId, device_name: deviceName, requestMeta }) => {
  const admin = await findAdminByEmail(email);
  if (!admin || !await bcrypt.compare(password, admin.passwordHash)) {
    recordAudit({
      action: 'admin.login_failed',
      status: 'failed',
      actor: admin ? adminActor(admin) : { type: 'admin', id: null, name: maskEmail(email) },
      description: admin ? 'Wrong password' : `No admin account for ${maskEmail(email)}`
    });
    throw new AppError('invalid_credentials', 401);
  }
  if (admin.status !== 'active') {
    recordAudit({ action: 'admin.login_failed', status: 'failed', actor: adminActor(admin), description: `Sign-in refused: the account is ${admin.status}` });
  }
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
  try {
    await sequelize.transaction(async (transaction) => consumeAdminOtp({ adminId: admin.id, purpose: 'login_2fa', otp, transaction }));
  } catch (error) {
    if (error instanceof AppError) {
      recordAudit({ action: 'admin.login_failed', status: 'failed', actor: adminActor(admin), device: challenge.device?.name, description: `Two-factor code rejected (${error.message})` });
    }
    throw error;
  }
  return completeLogin({ admin, device: challenge.device, requestMeta, via: 'two_factor' });
};

export const confirmNewDeviceLogin = async ({ challengeToken, requestMeta }) => {
  const challenge = verifyAdminChallenge(challengeToken, 'admin_login_challenge');
  const admin = await Admin.findByPk(challenge.sub);
  assertActiveAdmin(admin);
  return completeLogin({ admin, device: challenge.device, requestMeta, forceOtherLogout: true, via: 'new_device' });
};

export const getAdminProfile = (admin) => publicAdminPayload(admin);

export const updateAdminProfile = async ({ adminId, body, profilePicture }) => {
  const admin = await Admin.findByPk(adminId);
  assertActiveAdmin(admin);
  const values = {};
  if (body.name !== undefined) values.name = body.name;
  if (body.mobile !== undefined) values.mobile = body.mobile;
  if (profilePicture) values.profilePicture = profilePicture;
  const before = { name: admin.name, mobile: maskMobile(admin.mobile), photo: admin.profilePicture ? 'photo' : null };
  if (Object.keys(values).length) await admin.update(values);
  const after = { name: admin.name, mobile: maskMobile(admin.mobile), photo: profilePicture ? 'new photo' : before.photo };
  const changes = diffChanges(before, after, ['name', 'mobile', 'photo']);
  if (changes) {
    recordAudit({ action: 'admin.profile_updated', target: { type: 'admin', id: admin.id, label: admin.name }, changes, description: `Updated own profile: ${Object.keys(changes).join(', ')}` });
  }
  return publicAdminPayload(admin);
};

export const logoutAdmin = async ({ sessionId }) => {
  await AdminSession.update({ revokedAt: new Date() }, { where: { id: sessionId, revokedAt: null } });
  recordAudit({ action: 'admin.logout', description: 'Signed out' });
};

export const sendForgotPasswordOtp = async ({ email }) => {
  const admin = await findAdminByEmail(email);
  // Do not reveal whether an administrator account exists.
  if (!admin || admin.status !== 'active') return { expires_in_sec: 300 };
  const otpData = await createAdminOtp({ admin, purpose: 'forgot_password' });
  recordAudit({ action: 'admin.password_reset_requested', actor: adminActor(admin), description: 'Password reset code sent by email' });
  return otpData;
};

export const resetForgottenPassword = async ({ email, otp, newPassword }) => {
  const admin = await findAdminByEmail(email);
  assertActiveAdmin(admin);
  try {
    await sequelize.transaction(async (transaction) => {
      await consumeAdminOtp({ adminId: admin.id, purpose: 'forgot_password', otp, transaction });
      await admin.update({ passwordHash: await bcrypt.hash(newPassword, 12), passwordChangedAt: new Date() }, { transaction });
      await revokeAdminSessions({ adminId: admin.id, transaction });
    });
  } catch (error) {
    if (error instanceof AppError) {
      recordAudit({ action: 'admin.password_reset', status: 'failed', actor: adminActor(admin), description: `Password reset refused (${error.message})` });
    }
    throw error;
  }
  recordAudit({ action: 'admin.password_reset', actor: adminActor(admin), description: 'Password reset with an email code; all devices signed out' });
};

export const changeAdminPassword = async ({ admin, sessionId, currentPassword, newPassword }) => {
  if (!await bcrypt.compare(currentPassword, admin.passwordHash)) {
    recordAudit({ action: 'admin.password_changed', status: 'failed', description: 'Password change refused: the current password was wrong' });
    throw new AppError('current_password_incorrect', 400);
  }
  await sequelize.transaction(async (transaction) => {
    await admin.update({ passwordHash: await bcrypt.hash(newPassword, 12), passwordChangedAt: new Date() }, { transaction });
    await revokeAdminSessions({ adminId: admin.id, transaction });
  });
  recordAudit({ action: 'admin.password_changed', description: 'Password changed; all devices signed out' });
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
  recordAudit({ action: `admin.2fa_${action}d`, description: `Two-factor sign-in turned ${action === 'enable' ? 'on' : 'off'}` });
  return publicAdminPayload(admin);
};
