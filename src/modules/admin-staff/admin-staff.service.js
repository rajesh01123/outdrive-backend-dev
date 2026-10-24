import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Admin, AdminRole } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { removeStoredUpload } from '../../shared/utils/image-upload.js';
import { publicProfilePictureUrl } from '../../shared/utils/serializers.js';
import { canGrantRole, canManageStaff, ROLE_INCLUDE } from '../admin/admin-access.js';
import { revokeAdminSessions } from '../admin/admin.repository.js';
import { changedFields, diffChanges, maskEmail, maskMobile, recordAudit } from '../audit/audit.service.js';

export const STAFF_PAGE_LIMIT = 10;

// The panel shows a blocked account as "inactive", like customers; both stop the sign-in.
const toPanelStatus = (status) => (status === 'active' ? 'active' : 'inactive');

const staffPayload = (admin, actor) => ({
  id: Number(admin.id),
  name: admin.name,
  email: admin.email,
  mobile: admin.mobile || '',
  address: admin.address || '',
  profile_picture: publicProfilePictureUrl(admin.profilePicture),
  role: admin.adminRole ? { id: Number(admin.adminRole.id), name: admin.adminRole.name, is_system: Boolean(admin.adminRole.isSystem), status: admin.adminRole.status } : null,
  status: toPanelStatus(admin.status),
  two_factor_enabled: Boolean(admin.twoFactorEnabled),
  must_change_password: Boolean(admin.mustChangePassword),
  last_login_at: admin.lastLoginAt,
  created_at: admin.createdAt,
  is_you: Number(admin.id) === Number(actor.id),
  // False for yourself and for anyone with more access than you: the panel hides their edit buttons.
  manageable: canManageStaff(actor, admin)
});

const staffTarget = (admin) => ({ type: 'admin', id: admin.id, label: `${admin.name} (${maskEmail(admin.email)})` });
// Email and mobile are masked in the audit log.
const auditView = (admin) => ({
  name: admin.name, email: maskEmail(admin.email), mobile: maskMobile(admin.mobile), address: admin.address || '',
  role: admin.adminRole?.name || '', status: toPanelStatus(admin.status), photo: admin.profilePicture ? 'photo' : ''
});
const AUDIT_FIELDS = ['name', 'email', 'mobile', 'address', 'role', 'status', 'photo'];

const findStaff = async (id, options = {}) => {
  const admin = await Admin.findByPk(id, { include: [ROLE_INCLUDE], ...options });
  if (!admin) throw new AppError('staff_not_found', 404);
  return admin;
};

// Your own account is changed on My profile, never here.
const assertManageable = (actor, target) => {
  if (Number(actor.id) === Number(target.id)) throw new AppError('cannot_change_own_account', 403);
  if (!canManageStaff(actor, target)) throw new AppError('staff_outside_your_access', 403);
};

const fieldError = (field, message) => new AppError('validation_error', 422, { errors: { [field]: message } });

const grantableRole = async (actor, roleId, transaction) => {
  const role = await AdminRole.findByPk(roleId, { transaction });
  if (!role) throw fieldError('role_id', 'role not found');
  if (role.status !== 'active') throw fieldError('role_id', 'this role is switched off');
  if (!canGrantRole(actor, role)) throw new AppError('role_outside_your_access', 403);
  return role;
};

const assertUnique = async ({ email, mobile, exceptId = null, transaction }) => {
  const except = exceptId ? { id: { [Op.ne]: exceptId } } : {};
  if (await Admin.findOne({ where: { email, ...except }, transaction })) throw fieldError('email', 'another staff member already uses this email');
  if (await Admin.findOne({ where: { mobile, ...except }, transaction })) throw fieldError('mobile', 'another staff member already uses this mobile number');
};

/** Roles for the filter and the staff form; `assignable` = active and not more access than the signed-in admin has. */
export const roleOptions = async (actor) => {
  const roles = await AdminRole.findAll({ order: [['isSystem', 'DESC'], ['id', 'ASC']] });
  return roles.map((role) => ({ id: Number(role.id), name: role.name, status: role.status, assignable: role.status === 'active' && canGrantRole(actor, role) }));
};

export const listStaff = async ({ page, search, status, role_id: roleId, actor }) => {
  const where = {};
  if (status) where.status = status === 'active' ? 'active' : { [Op.in]: ['inactive', 'blocked'] };
  if (roleId) where.roleId = roleId;
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    where[Op.or] = [{ name: { [Op.like]: like } }, { email: { [Op.like]: like } }, { mobile: { [Op.like]: like } }];
  }
  const [{ rows, count }, total, active, roles] = await Promise.all([
    Admin.findAndCountAll({ where, include: [ROLE_INCLUDE], order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: STAFF_PAGE_LIMIT, offset: (page - 1) * STAFF_PAGE_LIMIT }),
    Admin.count(),
    Admin.count({ where: { status: 'active' } }),
    roleOptions(actor)
  ]);
  return {
    stats: { total, active, inactive: total - active },
    staff: rows.map((admin) => staffPayload(admin, actor)),
    pagination: { page, limit: STAFF_PAGE_LIMIT, total: count, total_pages: Math.max(1, Math.ceil(count / STAFF_PAGE_LIMIT)) },
    roles
  };
};

export const getStaff = async ({ id, actor }) => ({ staff: staffPayload(await findStaff(id), actor), roles: await roleOptions(actor) });

export const createStaff = ({ body, photo, actor }) =>
  sequelize.transaction(async (transaction) => {
    const role = await grantableRole(actor, body.role_id, transaction);
    await assertUnique({ email: body.email, mobile: body.mobile, transaction });
    const admin = await Admin.create({
      name: body.name,
      email: body.email,
      mobile: body.mobile,
      address: body.address || null,
      roleId: role.id,
      status: body.status,
      profilePicture: photo,
      passwordHash: await bcrypt.hash(body.password, 12),
      // The password was chosen by someone else, so the staff member replaces it at first sign-in.
      mustChangePassword: true
    }, { transaction });
    await admin.reload({ include: [ROLE_INCLUDE], transaction });
    recordAudit({ action: 'staff.created', target: staffTarget(admin), description: `Added ${admin.name} as ${role.name}; they choose their own password at first sign-in` }, { transaction });
    return staffPayload(admin, actor);
  });

export const updateStaff = async ({ id, body, photo, actor }) => {
  const result = await sequelize.transaction(async (transaction) => {
    const admin = await findStaff(id, { transaction, lock: transaction.LOCK.UPDATE });
    assertManageable(actor, admin);
    const role = Number(body.role_id) === Number(admin.roleId) ? admin.adminRole : await grantableRole(actor, body.role_id, transaction);
    await assertUnique({ email: body.email, mobile: body.mobile, exceptId: admin.id, transaction });

    const before = auditView(admin);
    const oldPhoto = admin.profilePicture;
    const values = { name: body.name, email: body.email, mobile: body.mobile, address: body.address || null, roleId: role.id };
    if (photo) values.profilePicture = photo;
    if (body.status && body.status !== before.status) values.status = body.status;
    await admin.update(values, { transaction });
    await admin.reload({ include: [ROLE_INCLUDE], transaction });
    if (values.status === 'inactive') await revokeAdminSessions({ adminId: admin.id, transaction });

    const changes = diffChanges(before, { ...auditView(admin), photo: photo ? 'new photo' : before.photo }, AUDIT_FIELDS);
    if (changes) {
      recordAudit({
        action: 'staff.updated',
        target: staffTarget(admin),
        changes,
        description: `Edited ${admin.name}: ${changedFields(changes)}${values.status === 'inactive' ? '; signed out everywhere' : ''}`
      }, { transaction });
    }
    return { staff: staffPayload(admin, actor), replacedPhoto: photo ? oldPhoto : null };
  });
  if (result.replacedPhoto) await removeStoredUpload(result.replacedPhoto);
  return result.staff;
};

export const updateStaffStatus = ({ id, status, actor }) =>
  sequelize.transaction(async (transaction) => {
    const admin = await findStaff(id, { transaction, lock: transaction.LOCK.UPDATE });
    assertManageable(actor, admin);
    const previous = toPanelStatus(admin.status);
    if (previous !== status) {
      await admin.update({ status }, { transaction });
      // An inactive staff member is signed out of every device straight away.
      if (status === 'inactive') await revokeAdminSessions({ adminId: admin.id, transaction });
      recordAudit({
        action: 'staff.status_changed',
        target: staffTarget(admin),
        changes: { status: { from: previous, to: status } },
        description: status === 'inactive' ? `Set ${admin.name} inactive and signed them out everywhere` : `Set ${admin.name} active again`
      }, { transaction });
    }
    return staffPayload(admin, actor);
  });

export const resetStaffPassword = ({ id, newPassword, actor }) =>
  sequelize.transaction(async (transaction) => {
    const admin = await findStaff(id, { transaction, lock: transaction.LOCK.UPDATE });
    assertManageable(actor, admin);
    await admin.update({ passwordHash: await bcrypt.hash(newPassword, 12), passwordChangedAt: new Date(), mustChangePassword: true }, { transaction });
    await revokeAdminSessions({ adminId: admin.id, transaction });
    recordAudit({ action: 'staff.password_reset', target: staffTarget(admin), description: `Reset the password of ${admin.name}; signed out everywhere and must choose a new one at next sign-in` }, { transaction });
    return staffPayload(admin, actor);
  });

// Sessions and sign-in codes go with the account; fare history and pages keep their rows without the name.
export const deleteStaff = async ({ id, actor }) => {
  const photo = await sequelize.transaction(async (transaction) => {
    const admin = await findStaff(id, { transaction, lock: transaction.LOCK.UPDATE });
    assertManageable(actor, admin);
    await admin.destroy({ transaction });
    recordAudit({ action: 'staff.deleted', target: staffTarget(admin), description: `Deleted ${admin.name} (${admin.adminRole?.name || 'no role'})` }, { transaction });
    return admin.profilePicture;
  });
  await removeStoredUpload(photo);
};
