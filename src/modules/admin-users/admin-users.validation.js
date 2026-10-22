import { validationError } from '../../middleware/validate.js';
import { GENDERS } from '../../shared/constants/auth.js';

export const ADMIN_USER_STATUSES = ['active', 'inactive'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

export const listUsersRequest = (req) => {
  const { query } = req;
  const page = query.page === undefined || query.page === '' ? 1 : Number(query.page);
  if (!Number.isInteger(page) || page < 1) validationError('page', 'page must be a positive integer');
  query.page = page;
  query.search = text(query.search).slice(0, 80);
  query.status = text(query.status);
  if (query.status && !ADMIN_USER_STATUSES.includes(query.status)) validationError('status', 'status must be active or inactive');
};

export const userIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

export const updateUserRequest = (req) => {
  userIdRequest(req);
  const { body } = req;
  if (body.name !== undefined) {
    const name = text(body.name).replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 80) validationError('name', 'name must be between 2 and 80 characters');
    body.name = name;
  }
  if (body.gender !== undefined) {
    body.gender = text(body.gender);
    if (body.gender && !GENDERS.includes(body.gender)) validationError('gender', 'gender must be male, female or others');
  }
  if (body.emergency_contact_name !== undefined) {
    body.emergency_contact_name = text(body.emergency_contact_name).replace(/\s+/g, ' ');
    if (body.emergency_contact_name.length > 80) validationError('emergency_contact_name', 'emergency_contact_name must not exceed 80 characters');
  }
  if (body.emergency_contact_number !== undefined) {
    body.emergency_contact_number = text(body.emergency_contact_number);
    if (body.emergency_contact_number && !/^\d{10,15}$/.test(body.emergency_contact_number)) {
      validationError('emergency_contact_number', 'emergency_contact_number must contain 10 to 15 digits');
    }
  }
};

export const updateStatusRequest = (req) => {
  userIdRequest(req);
  req.body.status = text(req.body.status);
  if (!ADMIN_USER_STATUSES.includes(req.body.status)) validationError('status', 'status must be active or inactive');
};

export const deleteUserRequest = (req) => {
  userIdRequest(req);
  const reason = text(req.body.reason);
  if (!reason) validationError('reason', 'reason is required');
  if (reason.length > 500) validationError('reason', 'reason must not exceed 500 characters');
  req.body.reason = reason;
};
