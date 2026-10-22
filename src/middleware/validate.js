import { AppError } from '../shared/utils/app-error.js';

export const validate = (validator) => (req, res, next) => {
  try {
    validator(req);
    next();
  } catch (error) {
    next(error);
  }
};

export const validationError = (field, message) => {
  throw new AppError('validation_error', 422, { errors: { [field]: message } });
};
