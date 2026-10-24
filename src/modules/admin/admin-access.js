import { AdminRole } from '../../database/models/index.js';
import { coversPermissions, expandPermissions } from '../../shared/constants/admin-permissions.js';

// Load an admin together with their role: `Admin.findByPk(id, { include: [ROLE_INCLUDE] })`.
export const ROLE_INCLUDE = { model: AdminRole, as: 'adminRole' };

export const adminRoleName = (admin) => admin?.adminRole?.name || '';
/** The role's stored permission list; ["*"] for the Super Admin role. */
export const adminPermissions = (admin) => admin?.adminRole?.permissions || [];
export const isSuperAdmin = (admin) => Boolean(admin?.adminRole?.isSystem);

/** True when `actor` may hand out `role` (to a new staff member, or by editing it): never more access than they have. */
export const canGrantRole = (actor, role) => isSuperAdmin(actor) || (!role.isSystem && coversPermissions(adminPermissions(actor), role.permissions));

/** True when `actor` may edit, block, reset or delete `target`: never themselves and never someone with more access. */
export const canManageStaff = (actor, target) =>
  Number(actor.id) !== Number(target.id) && (isSuperAdmin(actor) || coversPermissions(adminPermissions(actor), target.adminRole?.permissions || ['*']));

export const rolePermissionsPayload = (admin) => expandPermissions(adminPermissions(admin));
