import { validationError } from '../../middleware/validate.js';
import { USE_FOR, WHEELS } from '../../shared/fleet/vehicle-rules.js';

const keyPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const text = (value) => (typeof value === 'string' ? value.trim() : '');
export const keyFromName = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40).replace(/_+$/, '');

// Multipart forms send everything as strings.
const booleanField = (body, key) => {
  if (body[key] === undefined) return;
  const value = String(body[key]).toLowerCase();
  if (!['true', 'false', '1', '0'].includes(value)) validationError(key, `${key} must be true or false`);
  body[key] = value === 'true' || value === '1';
};

const vehicleFields = (body, { creating }) => {
  if (creating || body.name !== undefined) {
    body.name = text(body.name).replace(/\s+/g, ' ');
    if (body.name.length < 2 || body.name.length > 60) validationError('name', 'name must be between 2 and 60 characters');
  }
  if (body.description !== undefined) {
    body.description = text(body.description).replace(/\s+/g, ' ');
    if (body.description.length > 200) validationError('description', 'description must not exceed 200 characters');
  }
  if (creating || body.capacity !== undefined) {
    body.capacity = body.capacity === undefined || body.capacity === '' ? 1 : Number(body.capacity);
    if (!Number.isInteger(body.capacity) || body.capacity < 1 || body.capacity > 20) validationError('capacity', 'capacity must be a whole number between 1 and 20');
  }
  booleanField(body, 'is_shared');
  if (creating || body.use_for !== undefined) {
    body.use_for = text(body.use_for) || 'ride';
    if (!USE_FOR.includes(body.use_for)) validationError('use_for', 'use_for must be ride, parcel or both');
  }
  if (creating || body.wheels !== undefined) {
    body.wheels = body.wheels === undefined || body.wheels === '' ? 4 : Number(body.wheels);
    if (!WHEELS.includes(body.wheels)) validationError('wheels', 'wheels must be 2, 3 or 4');
  }
  // A shared vehicle sells seats on rides, so it cannot be a parcel vehicle.
  if (body.is_shared && body.use_for && body.use_for !== 'ride') validationError('use_for', 'a shared vehicle must be used for rides');
  if (creating || body.status !== undefined) {
    body.status = text(body.status) || 'active';
    if (!['active', 'inactive'].includes(body.status)) validationError('status', 'status must be active or inactive');
  }
};

export const vehicleIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

export const createVehicleRequest = (req) => {
  const { body } = req;
  vehicleFields(body, { creating: true });
  body.type_key = text(body.type_key) ? text(body.type_key).toLowerCase() : keyFromName(body.name);
  if (!keyPattern.test(body.type_key) || body.type_key.length > 40) {
    validationError('type_key', 'type_key may contain lowercase letters, numbers and single underscores (max 40)');
  }
  if (!req.file) validationError('icon', 'icon is required');
};

export const updateVehicleRequest = (req) => {
  vehicleIdRequest(req);
  vehicleFields(req.body, { creating: false });
};

export const updateVehicleStatusRequest = (req) => {
  vehicleIdRequest(req);
  req.body.status = text(req.body.status);
  if (!['active', 'inactive'].includes(req.body.status)) validationError('status', 'status must be active or inactive');
};

export const reorderVehiclesRequest = (req) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length || !ids.every((id) => Number.isInteger(id) && id > 0)) validationError('ids', 'ids must be a non-empty array of vehicle ids');
  if (new Set(ids).size !== ids.length) validationError('ids', 'ids must not contain duplicates');
};

// { mapping: { "<service_id>": [vehicle_type_id, ...] } }
export const saveMappingRequest = (req) => {
  const { mapping } = req.body;
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) validationError('mapping', 'mapping must be an object of service_id to vehicle ids');
  const cleaned = {};
  for (const [serviceId, vehicleIds] of Object.entries(mapping)) {
    if (!/^\d+$/.test(serviceId)) validationError('mapping', `invalid service id: ${serviceId}`);
    if (!Array.isArray(vehicleIds) || !vehicleIds.every((id) => Number.isInteger(id) && id > 0)) validationError('mapping', `vehicle ids for service ${serviceId} must be an array of ids`);
    cleaned[Number(serviceId)] = [...new Set(vehicleIds)];
  }
  req.body.mapping = cleaned;
};
