import { sequelize } from '../../config/database.js';
import { Device, User, UserSession } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { userPayload } from '../../shared/utils/serializers.js';
import { verifyOtp } from '../auth/otp.service.js';
import { listFavourites } from './favourite.service.js';
import { changedFields, diffChanges, recordAudit } from '../audit/audit.service.js';

const profileFields = (body) => {
  const values = {};
  if (body.name !== undefined) values.name = body.name;
  if (body.gender !== undefined) values.gender = body.gender || null;
  if (body.map_type !== undefined) values.mapType = body.map_type || null;
  return values;
};

export const updateProfile = async ({ userId, body, profilePicture }) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('user_not_found', 404);

  if (body.mobile !== undefined && body.mobile !== user.mobile) {
    throw new AppError('mobile_change_requires_verification', 422);
  }
  if (body.country_code !== undefined && body.country_code !== user.countryCode) {
    throw new AppError('country_code_change_not_allowed', 422);
  }

  const values = profileFields(body);
  if (profilePicture) values.profilePicture = profilePicture;
  const before = userPayload(user, { detailed: true });
  if (Object.keys(values).length) await user.update(values);
  const payload = userPayload(user, { detailed: true });
  const changes = { ...diffChanges(before, payload, ['name', 'gender', 'map_type']), ...(profilePicture ? { photo: { from: before.profile_picture ? 'old photo' : null, to: 'new photo' } } : {}) };
  if (Object.keys(changes).length) recordAudit({ action: 'app.profile_updated', target: { type: 'user', id: user.id, label: user.name }, changes, description: `Updated profile: ${changedFields(changes)}` });
  return payload;
};

export const getUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('user_not_found', 404);
  return { ...userPayload(user, { detailed: true }), favouriteLocations: { data: await listFavourites(user.id) } };
};

export const deleteAccount = ({ userId, otp, reason }) =>
  sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw new AppError('user_not_found', 404);
    await verifyOtp({
      mobile: user.mobile,
      countryCode: user.countryCode,
      otp,
      purpose: 'delete_account',
      transaction,
      consume: true
    });
    await UserSession.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null }, transaction });
    await Device.update({ userId: null }, { where: { userId: user.id }, transaction });
    await user.update({ status: 'deleted', deleteReason: reason?.trim() || null }, { transaction });
    await user.destroy({ transaction });
    recordAudit({ action: 'app.account_deleted', target: { type: 'user', id: user.id, label: user.name }, description: `Deleted own account${reason?.trim() ? `. Reason: ${reason.trim()}` : ''}` }, { transaction });
  });
