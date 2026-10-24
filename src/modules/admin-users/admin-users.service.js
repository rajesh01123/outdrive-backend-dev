import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Device, User, UserSession } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { publicProfilePictureUrl } from '../../shared/utils/serializers.js';
import { changedFields, diffChanges, maskMobile, recordAudit } from '../audit/audit.service.js';

export const USERS_PAGE_LIMIT = 10;

// The admin panel calls a blocked account "inactive"; app login checks keep using `blocked`.
const toDbStatus = (status) => (status === 'inactive' ? 'blocked' : status);
const toAdminStatus = (status) => (status === 'blocked' ? 'inactive' : status);

const adminUserPayload = (user) => ({
  id: Number(user.id),
  name: user.name,
  mobile: user.mobile,
  country_code: user.countryCode,
  profile_picture: publicProfilePictureUrl(user.profilePicture),
  gender: user.gender || '',
  wallet_balance: Number(user.walletBalance || 0),
  emergency_contact_name: user.emergencyContactName || '',
  emergency_contact_number: user.emergencyContactNumber || '',
  locale: user.locale || 'en',
  status: toAdminStatus(user.status),
  joined_at: user.createdAt
});

const findUser = async (id, options = {}) => {
  const user = await User.findByPk(id, options);
  if (!user || user.status === 'deleted') throw new AppError('user_not_found', 404);
  return user;
};

const userTarget = (user) => ({ type: 'user', id: user.id, label: `${user.name || 'User'} (${maskMobile(user.mobile)})` });
// Phone numbers are masked in the audit log.
const userAuditView = (payload) => ({ ...payload, emergency_contact_number: maskMobile(payload.emergency_contact_number) });
const USER_AUDIT_FIELDS = ['name', 'gender', 'emergency_contact_name', 'emergency_contact_number'];

const revokeSessions = (userId, transaction) =>
  UserSession.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null }, transaction });

export const getUserStats = async () => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [active, inactive, newThisWeek] = await Promise.all([
    User.count({ where: { status: 'active' } }),
    User.count({ where: { status: 'blocked' } }),
    User.count({ where: { status: { [Op.in]: ['active', 'blocked'] }, createdAt: { [Op.gte]: weekAgo } } })
  ]);
  return { total: active + inactive, active, inactive, new_this_week: newThisWeek };
};

export const listUsers = async ({ page, search, status }) => {
  const where = { status: status ? toDbStatus(status) : { [Op.in]: ['active', 'blocked'] } };
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    where[Op.or] = [{ name: { [Op.like]: like } }, { mobile: { [Op.like]: like } }];
  }
  const { rows, count } = await User.findAndCountAll({
    where,
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: USERS_PAGE_LIMIT,
    offset: (page - 1) * USERS_PAGE_LIMIT
  });
  return {
    users: rows.map(adminUserPayload),
    pagination: { page, limit: USERS_PAGE_LIMIT, total: count, total_pages: Math.max(1, Math.ceil(count / USERS_PAGE_LIMIT)) }
  };
};

export const getUser = async (id) => adminUserPayload(await findUser(id));

export const updateUser = async ({ id, body }) => {
  const user = await findUser(id);
  const before = userAuditView(adminUserPayload(user));
  const values = {};
  if (body.name !== undefined) values.name = body.name;
  if (body.gender !== undefined) values.gender = body.gender || null;
  if (body.emergency_contact_name !== undefined) values.emergencyContactName = body.emergency_contact_name || null;
  if (body.emergency_contact_number !== undefined) values.emergencyContactNumber = body.emergency_contact_number || null;
  if (Object.keys(values).length) await user.update(values);
  const payload = adminUserPayload(user);
  const changes = diffChanges(before, userAuditView(payload), USER_AUDIT_FIELDS);
  if (changes) recordAudit({ action: 'user.updated', target: userTarget(user), changes, description: `Edited ${user.name}: ${changedFields(changes)}` });
  return payload;
};

export const updateUserStatus = ({ id, status }) =>
  sequelize.transaction(async (transaction) => {
    const user = await findUser(id, { transaction, lock: transaction.LOCK.UPDATE });
    const previous = toAdminStatus(user.status);
    await user.update({ status: toDbStatus(status) }, { transaction });
    // An inactive user is signed out of every device straight away.
    if (status === 'inactive') await revokeSessions(user.id, transaction);
    if (previous !== status) {
      recordAudit({
        action: 'user.status_changed',
        target: userTarget(user),
        changes: { status: { from: previous, to: status } },
        description: status === 'inactive' ? `Set ${user.name} inactive and signed them out of every device` : `Set ${user.name} active again`
      }, { transaction });
    }
    return adminUserPayload(user);
  });

export const deleteUser = ({ id, reason }) =>
  sequelize.transaction(async (transaction) => {
    const user = await findUser(id, { transaction, lock: transaction.LOCK.UPDATE });
    await revokeSessions(user.id, transaction);
    await Device.update({ userId: null }, { where: { userId: user.id }, transaction });
    await user.update({ status: 'deleted', deleteReason: reason }, { transaction });
    await user.destroy({ transaction });
    recordAudit({ action: 'user.deleted', target: userTarget(user), description: `Deleted ${user.name}. Reason: ${reason}` }, { transaction });
  });
