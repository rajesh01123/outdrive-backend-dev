import { validationError } from '../../middleware/validate.js';

export const SERVICE_STATUSES = ['active', 'coming_soon', 'inactive'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const optionalText = (body, key, max) => {
  if (body[key] === undefined) return;
  body[key] = text(body[key]).replace(/[ \t]+/g, ' ');
  if (body[key].length > max) validationError(key, `${key} must not exceed ${max} characters`);
};

export const serviceIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

// module_key, section, transport_type and service_type are the app contract, so they are not editable.
export const updateServiceRequest = (req) => {
  serviceIdRequest(req);
  const { body } = req;
  if (body.name !== undefined) {
    body.name = text(body.name).replace(/\s+/g, ' ');
    if (body.name.length < 2 || body.name.length > 60) validationError('name', 'name must be between 2 and 60 characters');
  }
  optionalText(body, 'short_description', 120);
  optionalText(body, 'description', 500);
  optionalText(body, 'cancel_policy_title', 120);
  optionalText(body, 'cancel_policy_body', 1000);
  if (body.status !== undefined) {
    body.status = text(body.status);
    if (!SERVICE_STATUSES.includes(body.status)) validationError('status', 'status must be active, coming_soon or inactive');
  }
};

export const updateServiceStatusRequest = (req) => {
  serviceIdRequest(req);
  req.body.status = text(req.body.status);
  if (!SERVICE_STATUSES.includes(req.body.status)) validationError('status', 'status must be active, coming_soon or inactive');
};

export const reorderServicesRequest = (req) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length || !ids.every((id) => Number.isInteger(id) && id > 0)) {
    validationError('ids', 'ids must be a non-empty array of service ids');
  }
  if (new Set(ids).size !== ids.length) validationError('ids', 'ids must not contain duplicates');
};
