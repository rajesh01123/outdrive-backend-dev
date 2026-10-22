import { AppError } from '../shared/utils/app-error.js';

// Reserved for later admin/driver token flows.
export const authorize = (...roles) => (req, res, next) => {
  if (!req.auth?.role || !roles.includes(req.auth.role)) return next(new AppError('forbidden', 403));
  next();
};
