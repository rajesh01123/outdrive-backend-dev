import { Op } from 'sequelize';
import { Admin, AdminOtpVerification, AdminSession } from '../../database/models/index.js';

export const findAdminByEmail = (email, options = {}) => Admin.findOne({ where: { email }, ...options });

export const findActiveOtherSession = ({ adminId, deviceId, transaction }) =>
  AdminSession.findOne({
    where: { adminId, deviceId: { [Op.ne]: deviceId }, revokedAt: null, expiresAt: { [Op.gt]: new Date() } },
    order: [['lastActiveAt', 'DESC']],
    transaction,
    lock: transaction?.LOCK?.UPDATE
  });

export const revokeAdminSessions = ({ adminId, exceptSessionId = null, transaction }) => {
  const where = { adminId, revokedAt: null };
  if (exceptSessionId) where.id = { [Op.ne]: exceptSessionId };
  return AdminSession.update({ revokedAt: new Date() }, { where, transaction });
};

export const latestAdminOtp = ({ adminId, purpose, transaction }) =>
  AdminOtpVerification.findOne({
    where: { adminId, purpose },
    order: [['createdAt', 'DESC']],
    transaction,
    lock: transaction?.LOCK?.UPDATE
  });
