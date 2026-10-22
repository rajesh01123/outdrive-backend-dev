import multer from 'multer';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import { failure } from '../shared/responses/api-response.js';
import { AppError } from '../shared/utils/app-error.js';

export const notFoundHandler = (req, res) => failure(res, { status: 404, message: 'route_not_found' });

export const errorHandler = (error, req, res, next) => {
  if (error instanceof AppError) return failure(res, { status: error.status, message: error.message, data: error.data });
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'profile_picture_too_large' : 'upload_error';
    return failure(res, { status: 422, message });
  }
  if (error instanceof UniqueConstraintError) return failure(res, { status: 409, message: 'mobile_already_registered' });
  if (error instanceof ValidationError) return failure(res, { status: 422, message: 'validation_error' });

  console.error(error);
  return failure(res, { status: 500, message: 'internal_server_error' });
};
