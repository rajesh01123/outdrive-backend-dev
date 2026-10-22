import { Op } from 'sequelize';
import { Device, OtpVerification, User, UserSession } from '../../database/models/index.js';

export const findUserByMobile = (mobile, countryCode, { includeDeleted = true } = {}) =>
  User.findOne({ where: { mobile, countryCode }, paranoid: !includeDeleted });

export const findLatestOtp = ({ mobile, countryCode, purpose = null, transaction, lock = false }) => {
  const where = { mobile, countryCode };
  if (purpose) where.purpose = purpose;
  return OtpVerification.findOne({
    where,
    order: [['createdAt', 'DESC']],
    transaction,
    lock: lock ? transaction.LOCK.UPDATE : undefined
  });
};

export const findLatestOtpSent = ({ mobile, countryCode }) =>
  OtpVerification.findOne({ where: { mobile, countryCode }, order: [['sentAt', 'DESC']] });

export const countDailyOtps = ({ mobile, countryCode, from }) =>
  OtpVerification.count({ where: { mobile, countryCode, sentAt: { [Op.gte]: from } } });

export const revokeSessions = ({ userId, deviceToken = null, transaction }) => {
  const where = { userId, revokedAt: null };
  if (deviceToken) where.deviceToken = deviceToken;
  return UserSession.update({ revokedAt: new Date() }, { where, transaction });
};

export const bindDevice = async ({ userId, deviceToken, platform, transaction }) => {
  const device = await Device.findOne({ where: { deviceToken }, transaction, lock: transaction?.LOCK?.UPDATE });
  if (device) {
    return device.update({ userId, platform, lastSeenAt: new Date() }, { transaction });
  }
  return Device.create({ userId, deviceToken, platform, lastSeenAt: new Date() }, { transaction });
};
