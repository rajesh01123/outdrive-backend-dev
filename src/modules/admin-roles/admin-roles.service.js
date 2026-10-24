import { col, fn, Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Admin, AdminRole, AdminSession } from '../../database/models/index.js';
import {
  ALL_PERMISSIONS,
  coversPermissions,
  expandPermissions,
  normalizePermissions,
  permissionGroupsPayload,
  permissionLabel
} from '../../shared/constants/admin-permissions.js';
import { AppError } from '../../shared/utils/app-error.js';
import { adminPermissions, isSuperAdmin } from '../admin/admin-access.js';
import { diffChanges, recordAudit } from '../audit/audit.service.js';

const roleTarget = (role) => ({ type: 'role', id: role.id, label: role.name });

// The Super Admin role is locked. Other admins cannot change their own role or one with more access than they have,
// so nobody can raise their own access through the Roles page.
const editBlocker = (actor, role) => {
  if (role.isSystem) return 'role_locked';
  if (isSuperAdmin(actor)) return null;
  if (Number(actor.roleId) === Number(role.id)) return 'cannot_change_own_role';
  if (!coversPermissions(adminPermissions(actor), role.permissions)) return 'role_outside_your_access';
  return null;
};

const assertEditable = (actor, role) => {
  const blocker = editBlocker(actor, role);
  if (blocker) throw new AppError(blocker, 403);
};

const assertCanGrant = (actor, permissions) => {
  if (!isSuperAdmin(actor) && !coversPermissions(adminPermissions(actor), permissions)) throw new AppError('role_permissions_exceed_yours', 403);
};

const rolePayload = (role, staffCount, actor) => ({
  id: Number(role.id),
  name: role.name,
  description: role.description || '',
  permissions: expandPermissions(role.permissions),
  full_access: role.permissions.includes(ALL_PERMISSIONS),
  is_system: Boolean(role.isSystem),
  status: role.status,
  staff_count: staffCount,
  editable: !editBlocker(actor, role),
  created_at: role.createdAt,
  updated_at: role.updatedAt
});

const staffCounts = async () => {
  const rows = await Admin.findAll({ attributes: ['roleId', [fn('COUNT', col('id')), 'count']], group: ['roleId'], raw: true });
  return new Map(rows.map((row) => [Number(row.roleId), Number(row.count)]));
};

const findRole = async (id, options = {}) => {
  const role = await AdminRole.findByPk(id, options);
  if (!role) throw new AppError('role_not_found', 404);
  return role;
};

// Role names compare without case (database collation), so "support" and "Support" cannot both exist.
const assertNameFree = async (name, exceptId = null) => {
  const where = { name };
  if (exceptId) where.id = { [Op.ne]: exceptId };
  if (await AdminRole.findOne({ where })) throw new AppError('role_name_exists', 409);
};

const signOutRoleStaff = async (roleId, transaction) => {
  const staff = await Admin.findAll({ attributes: ['id'], where: { roleId }, transaction });
  if (!staff.length) return 0;
  await AdminSession.update({ revokedAt: new Date() }, { where: { adminId: staff.map((admin) => admin.id), revokedAt: null }, transaction });
  return staff.length;
};

export const listRoles = async (actor) => {
  const [roles, counts] = await Promise.all([AdminRole.findAll({ order: [['isSystem', 'DESC'], ['id', 'ASC']] }), staffCounts()]);
  return {
    stats: { total: roles.length, active: roles.filter((role) => role.status === 'active').length, inactive: roles.filter((role) => role.status !== 'active').length },
    roles: roles.map((role) => rolePayload(role, counts.get(Number(role.id)) || 0, actor)),
    permission_groups: permissionGroupsPayload()
  };
};

export const createRole = async ({ body, actor }) => {
  const permissions = normalizePermissions(body.permissions);
  assertCanGrant(actor, permissions);
  await assertNameFree(body.name);
  const role = await AdminRole.create({ name: body.name, description: body.description || null, permissions, createdBy: actor.id });
  recordAudit({ action: 'role.created', target: roleTarget(role), description: `Created role ${role.name} with ${permissions.length} permissions` });
  return rolePayload(role, 0, actor);
};

export const updateRole = async ({ id, body, actor }) => {
  const role = await findRole(id);
  assertEditable(actor, role);
  const permissions = normalizePermissions(body.permissions);
  assertCanGrant(actor, permissions);
  await assertNameFree(body.name, role.id);

  const before = { name: role.name, description: role.description || '', permissions: expandPermissions(role.permissions) };
  await role.update({ name: body.name, description: body.description || null, permissions });
  const added = permissions.filter((key) => !before.permissions.includes(key));
  const removed = before.permissions.filter((key) => !permissions.includes(key));
  const changes = diffChanges(before, { name: role.name, description: role.description || '' }, ['name', 'description']) || {};
  if (added.length || removed.length) changes.permissions = { from: before.permissions.map(permissionLabel).join(', '), to: permissions.map(permissionLabel).join(', ') };
  if (Object.keys(changes).length) {
    const parts = [added.length && `added ${added.map(permissionLabel).join(', ')}`, removed.length && `removed ${removed.map(permissionLabel).join(', ')}`].filter(Boolean);
    recordAudit({ action: 'role.updated', target: roleTarget(role), changes, description: `Edited role ${role.name}${parts.length ? `: ${parts.join('; ')}` : ''}` });
  }
  return rolePayload(role, (await staffCounts()).get(Number(role.id)) || 0, actor);
};

export const updateRoleStatus = ({ id, status, actor }) =>
  sequelize.transaction(async (transaction) => {
    const role = await findRole(id, { transaction, lock: transaction.LOCK.UPDATE });
    assertEditable(actor, role);
    const previous = role.status;
    await role.update({ status }, { transaction });
    if (previous !== status) {
      // Staff in a switched-off role are signed out now; they can sign in again once it is switched back on.
      const signedOut = status === 'inactive' ? await signOutRoleStaff(role.id, transaction) : 0;
      recordAudit({
        action: 'role.status_changed',
        target: roleTarget(role),
        changes: { status: { from: previous, to: status } },
        description: status === 'inactive' ? `Switched off role ${role.name}; ${signedOut} staff signed out` : `Switched on role ${role.name}`
      }, { transaction });
    }
    const count = await Admin.count({ where: { roleId: role.id }, transaction });
    return rolePayload(role, count, actor);
  });

export const deleteRole = ({ id, actor }) =>
  sequelize.transaction(async (transaction) => {
    const role = await findRole(id, { transaction, lock: transaction.LOCK.UPDATE });
    assertEditable(actor, role);
    const staffCount = await Admin.count({ where: { roleId: role.id }, transaction });
    if (staffCount) throw new AppError('role_in_use', 409, { staff_count: staffCount });
    await role.destroy({ transaction });
    recordAudit({ action: 'role.deleted', target: roleTarget(role), description: `Deleted role ${role.name}` }, { transaction });
  });
