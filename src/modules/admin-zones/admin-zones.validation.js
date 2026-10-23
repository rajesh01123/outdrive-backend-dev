import { validationError } from '../../middleware/validate.js';

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const isLat = (value) => typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
const isLng = (value) => typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;

export const zoneIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

const idList = (body, key) => {
  if (body[key] === undefined) return;
  if (!Array.isArray(body[key]) || !body[key].every((id) => Number.isInteger(id) && id > 0)) validationError(key, `${key} must be an array of ids`);
  body[key] = [...new Set(body[key])];
};

const zoneFields = (body, { creating }) => {
  if (creating || body.name !== undefined) {
    body.name = text(body.name).replace(/\s+/g, ' ');
    if (body.name.length < 2 || body.name.length > 80) validationError('name', 'name must be between 2 and 80 characters');
  }
  if (body.priority !== undefined) {
    if (!Number.isInteger(body.priority) || body.priority < -1000 || body.priority > 1000) validationError('priority', 'priority must be a whole number between -1000 and 1000');
  } else if (creating) body.priority = 0;
  if (body.status !== undefined || creating) {
    body.status = text(body.status) || 'active';
    if (!['active', 'inactive'].includes(body.status)) validationError('status', 'status must be active or inactive');
  }
  if (creating || body.polygon !== undefined) {
    const { polygon } = body;
    if (!Array.isArray(polygon) || polygon.length < 3 || polygon.length > 500) validationError('polygon', 'polygon must have between 3 and 500 points');
    if (!polygon.every((point) => Array.isArray(point) && point.length === 2 && isLat(point[0]) && isLng(point[1]))) {
      validationError('polygon', 'each polygon point must be [lat, lng] with valid numbers');
    }
    // A closed ring from some map tools repeats the first point; drop it.
    const [first] = polygon;
    const last = polygon[polygon.length - 1];
    if (polygon.length > 3 && first[0] === last[0] && first[1] === last[1]) body.polygon = polygon.slice(0, -1);
  }
  idList(body, 'enabled_module_ids');
};

export const createZoneRequest = (req) => zoneFields(req.body, { creating: true });

export const updateZoneRequest = (req) => {
  zoneIdRequest(req);
  zoneFields(req.body, { creating: false });
};

export const updateZoneStatusRequest = (req) => {
  zoneIdRequest(req);
  req.body.status = text(req.body.status);
  if (!['active', 'inactive'].includes(req.body.status)) validationError('status', 'status must be active or inactive');
};

export const setZoneModuleRequest = (req) => {
  zoneIdRequest(req);
  const serviceId = Number(req.params.serviceId);
  if (!Number.isInteger(serviceId) || serviceId < 1) validationError('service_id', 'service_id must be a positive integer');
  req.params.serviceId = serviceId;
  if (typeof req.body.is_enabled !== 'boolean') validationError('is_enabled', 'is_enabled must be true or false');
};

export const testPointRequest = (req) => {
  const { body } = req;
  body.lat = Number(body.lat);
  body.lng = Number(body.lng);
  if (!isLat(body.lat)) validationError('lat', 'lat must be between -90 and 90');
  if (!isLng(body.lng)) validationError('lng', 'lng must be between -180 and 180');
  body.module_key = text(body.module_key);
  if (!body.module_key) validationError('module_key', 'module_key is required');
};
