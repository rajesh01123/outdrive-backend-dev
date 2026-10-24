import { validationError } from '../../middleware/validate.js';
import { parseIstDatetime } from '../../shared/utils/ist-datetime.js';
import { coordinate, moduleKeyField } from '../common/common.validation.js';

export const TRANSPORT_TYPES = ['taxi', 'delivery'];
export const RECENT_SEARCH_LIMIT = { default: 10, max: 20 };
export const MAX_SEARCH_STOPS = 3;

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const flag = (body, key) => {
  const value = body[key];
  if (value === undefined || value === null || value === '') { body[key] = false; return; }
  if (![0, 1, '0', '1', true, false].includes(value)) validationError(key, `${key} must be 0 or 1`);
  body[key] = value === 1 || value === '1' || value === true;
};

const wholeNumber = (body, key, max) => {
  const raw = body[key];
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) validationError(key, `${key} must be a number between 0 and ${max}`);
  body[key] = Math.round(value);
};

const address = (body, key) => {
  body[key] = text(body[key]);
  if (!body[key]) validationError(key, `${key} is required`);
  if (body[key].length > 255) validationError(key, `${key} must not exceed 255 characters`);
};

export const etaRequest = (req) => {
  const { body } = req;
  moduleKeyField(body);
  body.transport_type = text(body.transport_type);
  body.service_type = text(body.service_type);
  coordinate(body, 'pick_lat', -90, 90);
  coordinate(body, 'pick_lng', -180, 180);
  coordinate(body, 'drop_lat', -90, 90);
  coordinate(body, 'drop_lng', -180, 180);
  address(body, 'pick_address');
  address(body, 'drop_address');
  wholeNumber(body, 'distance', 3_000_000); // meters
  wholeNumber(body, 'duration', 4320); // minutes
  body.polyline = typeof body.polyline === 'string' ? body.polyline : '';
  for (const key of ['is_out_station', 'is_round_trip', 'shared_ride']) flag(body, key);

  const seats = body.seats_taken === undefined || body.seats_taken === '' ? 1 : Number(body.seats_taken);
  if (!Number.isInteger(seats) || seats < 1 || seats > 20) validationError('seats_taken', 'seats_taken must be a whole number between 1 and 20');
  body.seats_taken = seats;

  const schedule = parseIstDatetime(body.schedule_datetime);
  if (schedule === undefined) validationError('schedule_datetime', 'schedule_datetime must be a date and time like 2026-10-23 10:30:00');
  body.schedule_at = schedule;

  body.promo_code = text(body.promo_code).toUpperCase();
  if (body.promo_code.length > 20) validationError('promo_code', 'promo_code must not exceed 20 characters');
};

// HOME-10 — every filter is optional.
export const promocodeListRequest = (req) => {
  const { query } = req;
  query.module_key = text(query.module_key);
  query.promo_code = text(query.promo_code).toUpperCase().slice(0, 20);
  if (query.zone_id === undefined || query.zone_id === '') { query.zone_id = null; return; }
  const zoneId = Number(query.zone_id);
  if (!Number.isInteger(zoneId) || zoneId < 1) validationError('zone_id', 'zone_id must be a positive integer');
  query.zone_id = zoneId;
};

const optionalText = (body, key, max) => {
  if (body[key] === undefined || body[key] === null) { body[key] = ''; return; }
  if (typeof body[key] !== 'string') validationError(key, `${key} must be text`);
  body[key] = body[key].trim();
  if (body[key].length > max) validationError(key, `${key} must not exceed ${max} characters`);
};

const optionalNumber = (body, key, max, { whole = false } = {}) => {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') { body[key] = 0; return; }
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) validationError(key, `${key} must be a number between 0 and ${max}`);
  body[key] = whole ? Math.round(value) : Math.round(value * 100) / 100;
};

const transportType = (source, { required }) => {
  source.transport_type = text(source.transport_type);
  if (!source.transport_type) { if (required) source.transport_type = 'taxi'; return; }
  if (!TRANSPORT_TYPES.includes(source.transport_type)) validationError('transport_type', 'transport_type must be taxi or delivery');
};

// HOME-04
export const listRecentSearchesRequest = (req) => {
  const { query } = req;
  const limit = query.limit === undefined || query.limit === '' ? RECENT_SEARCH_LIMIT.default : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > RECENT_SEARCH_LIMIT.max) validationError('limit', `limit must be a whole number between 1 and ${RECENT_SEARCH_LIMIT.max}`);
  query.limit = limit;
  transportType(query, { required: false });
};

// Stops accept lat/lng (request contract) or latitude/longitude (response shape).
const stopsField = (body) => {
  if (body.stops === undefined || body.stops === null) { body.stops = []; return; }
  if (!Array.isArray(body.stops)) validationError('stops', 'stops must be an array');
  if (body.stops.length > MAX_SEARCH_STOPS) validationError('stops', `at most ${MAX_SEARCH_STOPS} stops are allowed`);
  body.stops = body.stops.map((stop, index) => {
    const key = `stops.${index}`;
    if (!stop || typeof stop !== 'object') validationError(key, 'each stop must be an object');
    const point = { lat: stop.lat ?? stop.latitude, lng: stop.lng ?? stop.longitude, address: stop.address, short_address: stop.short_address, order: stop.order };
    for (const [field, limit] of [['lat', 90], ['lng', 180]]) {
      const value = typeof point[field] === 'string' && point[field].trim() !== '' ? Number(point[field]) : point[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) validationError(`${key}.${field}`, `${field} must be a number between -${limit} and ${limit}`);
      point[field] = value;
    }
    point.address = text(point.address);
    if (!point.address || point.address.length > 255) validationError(`${key}.address`, 'address is required (max 255 characters)');
    optionalText(point, 'short_address', 120);
    point.order = Number(point.order);
    if (!Number.isInteger(point.order) || point.order < 1 || point.order > MAX_SEARCH_STOPS) validationError(`${key}.order`, `order must be a whole number between 1 and ${MAX_SEARCH_STOPS}`);
    return point;
  });
  if (new Set(body.stops.map((stop) => stop.order)).size !== body.stops.length) validationError('stops', 'stop order numbers must be unique');
  body.stops.sort((a, b) => a.order - b.order);
};

// HOME-05
export const saveRecentSearchRequest = (req) => {
  const { body } = req;
  coordinate(body, 'pick_lat', -90, 90);
  coordinate(body, 'pick_lng', -180, 180);
  coordinate(body, 'drop_lat', -90, 90);
  coordinate(body, 'drop_lng', -180, 180);
  address(body, 'pick_address');
  address(body, 'drop_address');
  optionalText(body, 'pick_short_address', 120);
  optionalText(body, 'drop_short_address', 120);
  for (const [key, max] of [['pickup_poc_name', 80], ['pickup_poc_mobile', 15], ['pickup_poc_instruction', 255], ['drop_poc_name', 80], ['drop_poc_mobile', 15], ['drop_poc_instruction', 255]]) optionalText(body, key, max);
  optionalNumber(body, 'total_distance', 3000); // km
  optionalNumber(body, 'total_time', 4320, { whole: true }); // minutes
  body.poly_line = typeof body.poly_line === 'string' ? body.poly_line : '';
  transportType(body, { required: true });
  body.module_key = text(body.module_key);
  stopsField(body);
};
