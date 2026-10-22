import { sequelize } from '../../config/database.js';
import { User } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { userPayload } from '../../shared/utils/serializers.js';
import { findUserByMobile, revokeSessions } from './auth.repository.js';
import { createAndSendOtp, verifyOtp } from './otp.service.js';
import { issueOtpProof, issueUserSession } from './token.service.js';

const assertOtpPurposeMatchesAccount = async ({ mobile, countryCode, purpose }) => {
  const user = await findUserByMobile(mobile, countryCode);
  const registered = Boolean(user && user.status !== 'deleted' && !user.deletedAt);

  if (purpose === 'login' && !registered) {
    throw new AppError('user_not_found_use_register', 404, { is_new_user: true, next: 'register' });
  }
  if (purpose === 'signup' && registered) throw new AppError('mobile_already_registered', 409);
  if (purpose === 'delete_account' && !registered) throw new AppError('user_not_found', 404);
};

export const validateMobile = async ({ mobile, country_code: countryCode }) => {
  const user = await findUserByMobile(mobile, countryCode);
  const exists = Boolean(user && user.status !== 'deleted' && !user.deletedAt);
  return {
    message: exists ? 'mobile_exists' : 'mobile_not_exists',
    data: { is_existing_user: exists }
  };
};

export const sendOtp = async ({ mobile, country_code: countryCode, device_token: deviceToken, purpose }) => {
  await assertOtpPurposeMatchesAccount({ mobile, countryCode, purpose });
  return createAndSendOtp({ mobile, countryCode, deviceToken, purpose });
};

export const verifyOtpOnly = async ({ mobile, country_code: countryCode, otp }) => {
  await verifyOtp({ mobile, countryCode, otp });
  return { otp_token: issueOtpProof({ mobile, countryCode }) };
};

export const login = async ({ mobile, country_code: countryCode, otp, device_token: deviceToken, login_by: loginBy }) => {
  const user = await findUserByMobile(mobile, countryCode);
  if (!user || user.deletedAt || user.status === 'deleted') {
    throw new AppError('user_not_found_use_register', 404, { is_new_user: true, next: 'register' });
  }
  if (user.status === 'blocked') throw new AppError('user_blocked', 403);

  return sequelize.transaction(async (transaction) => {
    const currentUser = await User.findByPk(user.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!currentUser || currentUser.status === 'deleted') throw new AppError('user_not_found_use_register', 404, { is_new_user: true, next: 'register' });
    if (currentUser.status === 'blocked') throw new AppError('user_blocked', 403);

    await verifyOtp({ mobile, countryCode, otp, purpose: 'login', transaction, consume: true });
    await revokeSessions({ userId: currentUser.id, deviceToken, transaction });
    const accessToken = await issueUserSession({ user: currentUser, deviceToken, loginBy, transaction });
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      is_new_user: false,
      profile_complete: true,
      user: userPayload(currentUser)
    };
  });
};

export const register = async ({ mobile, country_code: countryCode, otp, name, device_token: deviceToken, login_by: loginBy, profilePicture }) =>
  sequelize.transaction(async (transaction) => {
    const existing = await User.findOne({ where: { mobile, countryCode }, paranoid: false, transaction, lock: transaction.LOCK.UPDATE });
    if (existing) throw new AppError('mobile_already_registered', 409);

    await verifyOtp({ mobile, countryCode, otp, purpose: 'signup', transaction, consume: true });
    const user = await User.create(
      { name, mobile, countryCode, profilePicture: profilePicture || null, status: 'active' },
      { transaction }
    );
    const accessToken = await issueUserSession({ user, deviceToken, loginBy, transaction });
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      is_new_user: true,
      profile_complete: true,
      user: userPayload(user)
    };
  });
