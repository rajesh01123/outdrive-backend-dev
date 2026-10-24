import { validationError } from '../../middleware/validate.js';
import { PERMISSION_KEYS } from '../../shared/constants/admin-permissions.js';

export const ROLE_STATUSES = ['active', 'inactive'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

export const roleIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

const roleBody = (body) => {
  body.name = text(body.name).replace(/\s+/g, ' ');
  if (body.name.length < 2 || body.name.length > 60) validationError('name', 'name must be between 2 and 60 characters');
  body.description = text(body.description).replace(/\s+/g, ' ');
  if (body.description.length > 200) validationError('description', 'description must not exceed 200 characters');
  if (!Array.isArray(body.permissions) || !body.permissions.length) validationError('permissions', 'tick at least one permission');
  const unknown = body.permissions.find((key) => typeof key !== 'string' || !PERMISSION_KEYS.includes(key));
  if (unknown !== undefined) validationError('permissions', `unknown permission: ${unknown}`);
};

export const createRoleRequest = (req) => roleBody(req.body);

export const updateRoleRequest = (req) => {
  roleIdRequest(req);
  roleBody(req.body);
};

export const roleStatusRequest = (req) => {
  roleIdRequest(req);
  req.body.status = text(req.body.status);
  if (!ROLE_STATUSES.includes(req.body.status)) validationError('status', 'status must be active or inactive');
};
