import multer from 'multer';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import { failure } from '../shared/responses/api-response.js';
import { AppError } from '../shared/utils/app-error.js';

export const notFoundHandler = (req, res) => failure(res, { status: 404, message: 'route_not_found' });

export const errorHandler = (error, req, res, next) => {
  if (error instanceof AppError) return failure(res, { status: error.status, message: error.message, data: error.data });
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? `${error.field || 'file'}_too_large` : 'upload_error';
    return failure(res, { status: 422, message });
  }
  if (error instanceof UniqueConstraintError) {
    // Services check uniqueness themselves; this only catches races, so stay generic unless it is the mobile index.
    const fields = Object.keys(error.fields || {});
    const message = fields.some((field) => field.includes('mobile')) ? 'mobile_already_registered' : 'duplicate_value';
    return failure(res, { status: 409, message, data: { fields } });
  }
  if (error instanceof ValidationError) return failure(res, { status: 422, message: 'validation_error' });

  console.error(error);
  return failure(res, { status: 500, message: 'internal_server_error' });
};
