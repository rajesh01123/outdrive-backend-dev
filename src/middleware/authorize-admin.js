import { hasPermission } from '../shared/constants/admin-permissions.js';
import { AppError } from '../shared/utils/app-error.js';

// Lets the request through only when the admin's role grants `permission` ("zones.manage"). Use after authenticateAdmin.
export const requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.adminAuth?.permissions, permission)) return next(new AppError('admin_forbidden', 403));
  next();
};
