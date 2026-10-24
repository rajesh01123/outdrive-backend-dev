import { AdminSession } from '../database/models/index.js';
import { adminPermissions } from '../modules/admin/admin-access.js';
import { findAdminWithRole } from '../modules/admin/admin.repository.js';
import { activeAdminSessionWhere, verifyAdminAccessToken } from '../modules/admin/admin-auth.service.js';
import { AppError } from '../shared/utils/app-error.js';
import { asyncHandler } from '../shared/utils/async-handler.js';

// The role is read on every request, so a permission change or a switched-off role applies from the next click.
const authenticate = ({ allowPendingPasswordChange = false } = {}) => asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('admin_unauthorized', 401);

  let payload;
  try {
    payload = verifyAdminAccessToken(token);
  } catch {
    throw new AppError('admin_invalid_or_expired_token', 401);
  }
  if (payload.type !== 'admin' || !payload.sub || !payload.jti) throw new AppError('admin_invalid_token', 401);

  const session = await AdminSession.findOne({ where: activeAdminSessionWhere(payload.jti) });
  if (!session) throw new AppError('admin_session_revoked', 401);
  const admin = await findAdminWithRole(payload.sub);
  if (!admin) throw new AppError('admin_session_revoked', 401);
  if (admin.status === 'blocked') throw new AppError('admin_blocked', 403);
  if (admin.status !== 'active') throw new AppError('admin_inactive', 403);
  if (admin.adminRole?.status !== 'active') throw new AppError('admin_role_inactive', 403);
  if (admin.mustChangePassword && !allowPendingPasswordChange) throw new AppError('admin_password_change_required', 403);

  await session.update({ lastActiveAt: new Date() });
  req.admin = admin;
  req.adminAuth = { sessionId: session.id, jti: payload.jti, permissions: adminPermissions(admin), deviceName: session.deviceName };
  next();
});

export const authenticateAdmin = authenticate();

// Only for what a staff member needs before choosing their own password: who am I, change password, logout.
export const authenticateAdminForPasswordChange = authenticate({ allowPendingPasswordChange: true });
