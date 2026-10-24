import { validationError } from '../../middleware/validate.js';

export const STAFF_STATUSES = ['active', 'inactive'];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const positiveId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};
const password = (body, key) => {
  body[key] = text(body[key]);
  if (body[key].length < 8 || body[key].length > 128) validationError(key, `${key} must be between 8 and 128 characters`);
};

export const listStaffRequest = (req) => {
  const { query } = req;
  const page = query.page === undefined || query.page === '' ? 1 : Number(query.page);
  if (!Number.isInteger(page) || page < 1) validationError('page', 'page must be a positive integer');
  query.page = page;
  query.search = text(query.search).slice(0, 80);
  query.status = text(query.status);
  if (query.status && !STAFF_STATUSES.includes(query.status)) validationError('status', 'status must be active or inactive');
  if (query.role_id === undefined || query.role_id === '') query.role_id = null;
  else if (!(query.role_id = positiveId(query.role_id))) validationError('role_id', 'role_id must be a positive integer');
};

export const staffIdRequest = (req) => {
  const id = positiveId(req.params.id);
  if (!id) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

// Sent as multipart form data (with the photo) or JSON, so every value may arrive as a string.
const staffBody = (body, { creating }) => {
  body.name = text(body.name).replace(/\s+/g, ' ');
  if (body.name.length < 2 || body.name.length > 120) validationError('name', 'name must be between 2 and 120 characters');
  body.email = text(body.email).toLowerCase();
  if (!emailPattern.test(body.email) || body.email.length > 150) validationError('email', 'email must be valid');
  body.mobile = text(body.mobile);
  if (!/^\d{10}$/.test(body.mobile)) validationError('mobile', 'mobile must contain exactly 10 digits');
  body.address = text(body.address).replace(/\s+/g, ' ');
  if (body.address.length > 255) validationError('address', 'address must not exceed 255 characters');
  if (!(body.role_id = positiveId(body.role_id))) validationError('role_id', 'choose a role');
  body.status = text(body.status) || (creating ? 'active' : '');
  if (body.status && !STAFF_STATUSES.includes(body.status)) validationError('status', 'status must be active or inactive');
  if (creating) password(body, 'password');
};

export const createStaffRequest = (req) => staffBody(req.body, { creating: true });

export const updateStaffRequest = (req) => {
  staffIdRequest(req);
  staffBody(req.body, { creating: false });
};

export const staffStatusRequest = (req) => {
  staffIdRequest(req);
  req.body.status = text(req.body.status);
  if (!STAFF_STATUSES.includes(req.body.status)) validationError('status', 'status must be active or inactive');
};

export const resetStaffPasswordRequest = (req) => {
  staffIdRequest(req);
  password(req.body, 'new_password');
  password(req.body, 'confirm_password');
  if (req.body.new_password !== req.body.confirm_password) validationError('confirm_password', 'confirm_password must match new_password');
};
