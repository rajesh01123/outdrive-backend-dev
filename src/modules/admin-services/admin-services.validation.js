import { validationError } from '../../middleware/validate.js';

export const SERVICE_STATUSES = ['active', 'coming_soon', 'inactive'];
export const SERVICE_TYPES = ['ride', 'parcel'];
const slugPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

const text = (value) => (typeof value === 'string' ? value.trim() : '');
export const slugify = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40).replace(/_+$/, '');

const serviceFields = (body, { creating }) => {
  if (creating || body.name !== undefined) {
    body.name = text(body.name).replace(/\s+/g, ' ');
    if (body.name.length < 2 || body.name.length > 60) validationError('name', 'name must be between 2 and 60 characters');
  }
  if (body.subtitle !== undefined) {
    body.subtitle = text(body.subtitle).replace(/\s+/g, ' ');
    if (body.subtitle.length > 120) validationError('subtitle', 'subtitle must not exceed 120 characters');
  }
  if (creating || body.service_type !== undefined) {
    body.service_type = text(body.service_type) || 'ride';
    if (!SERVICE_TYPES.includes(body.service_type)) validationError('service_type', 'service_type must be ride or parcel');
  }
  if (creating || body.status !== undefined) {
    body.status = text(body.status) || 'inactive';
    if (!SERVICE_STATUSES.includes(body.status)) validationError('status', 'status must be active, coming_soon or inactive');
  }
};

export const serviceIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

export const createServiceRequest = (req) => {
  const { body } = req;
  serviceFields(body, { creating: true });
  body.slug = text(body.slug) ? text(body.slug).toLowerCase() : slugify(body.name);
  if (!slugPattern.test(body.slug) || body.slug.length > 40) {
    validationError('slug', 'slug may contain lowercase letters, numbers and single underscores (max 40)');
  }
  if (!req.file) validationError('image', 'image is required');
};

export const updateServiceRequest = (req) => {
  serviceIdRequest(req);
  serviceFields(req.body, { creating: false });
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
