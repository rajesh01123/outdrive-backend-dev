import { AppError } from '../shared/utils/app-error.js';

export const authorizeAdmin = (...roles) => (req, res, next) => {
  if (!req.adminAuth || !roles.includes(req.adminAuth.role)) return next(new AppError('admin_forbidden', 403));
  next();
};
