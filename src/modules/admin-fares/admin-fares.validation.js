import { validationError } from '../../middleware/validate.js';
import { FARE_CATEGORIES } from '../../shared/fare/fare-calculator.js';

export const PAYMENT_TYPES = ['cash', 'wallet', 'online'];

const positiveId = (value, key) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) validationError(key, `${key} must be a positive integer`);
  return id;
};

const category = (body) => {
  if (!FARE_CATEGORIES.includes(body.fare_category)) validationError('fare_category', `fare_category must be one of ${FARE_CATEGORIES.join(', ')}`);
};

// [key, max, wholeNumber]
const numericFields = [
  ['base_price', 100000, false],
  ['base_distance_km', 1000, false],
  ['price_per_km', 10000, false],
  ['free_minutes', 1440, true],
  ['price_per_min', 1000, false],
  ['min_fare', 100000, false],
  ['tax_percent', 100, false],
  ['free_waiting_mins', 120, true],
  ['waiting_charge_per_min', 1000, false]
];

export const saveFareRequest = (req) => {
  const { body } = req;
  body.zone_id = positiveId(body.zone_id, 'zone_id');
  body.vehicle_type_id = positiveId(body.vehicle_type_id, 'vehicle_type_id');
  category(body);
  for (const [key, max, whole] of numericFields) {
    const value = typeof body[key] === 'string' && body[key].trim() !== '' ? Number(body[key]) : body[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) validationError(key, `${key} is required and must be a number`);
    if (value < 0 || value > max) validationError(key, `${key} must be between 0 and ${max}`);
    if (whole && !Number.isInteger(value)) validationError(key, `${key} must be a whole number`);
    if (!whole && Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) validationError(key, `${key} may have at most 2 decimals`);
    body[key] = value;
  }
  const payment = Array.isArray(body.payment_types) ? body.payment_types : String(body.payment_types || '').split(',');
  body.payment_types = [...new Set(payment.map((type) => String(type).trim()).filter(Boolean))];
  if (!body.payment_types.length || !body.payment_types.every((type) => PAYMENT_TYPES.includes(type))) {
    validationError('payment_types', 'payment_types must contain at least one of cash, wallet, online');
  }
  body.is_default = body.is_default === true || body.is_default === 'true';
  body.status = body.status === undefined ? 'active' : String(body.status);
  if (!['active', 'inactive'].includes(body.status)) validationError('status', 'status must be active or inactive');
};

export const fareIdStatusRequest = (req) => {
  req.params.id = positiveId(req.params.id, 'id');
  if (!['active', 'inactive'].includes(req.body.status)) validationError('status', 'status must be active or inactive');
};

export const listFaresRequest = (req) => {
  if (req.query.zone_id !== undefined && req.query.zone_id !== '') req.query.zone_id = positiveId(req.query.zone_id, 'zone_id');
  else req.query.zone_id = undefined;
};

export const copyFaresRequest = (req) => {
  const { body } = req;
  body.from_zone_id = positiveId(body.from_zone_id, 'from_zone_id');
  body.to_zone_id = positiveId(body.to_zone_id, 'to_zone_id');
  if (body.from_zone_id === body.to_zone_id) validationError('to_zone_id', 'choose a different zone to copy into');
  body.overwrite = body.overwrite === true;
};

export const previewFareRequest = (req) => {
  const { body } = req;
  body.zone_id = positiveId(body.zone_id, 'zone_id');
  category(body);
  body.distance_km = Number(body.distance_km);
  body.minutes = Number(body.minutes);
  if (!Number.isFinite(body.distance_km) || body.distance_km < 0 || body.distance_km > 3000) validationError('distance_km', 'distance_km must be between 0 and 3000');
  if (!Number.isFinite(body.minutes) || body.minutes < 0 || body.minutes > 4320) validationError('minutes', 'minutes must be between 0 and 4320');
  body.seats = body.seats === undefined ? 1 : Number(body.seats);
  if (!Number.isInteger(body.seats) || body.seats < 1 || body.seats > 20) validationError('seats', 'seats must be between 1 and 20');
  body.round_trip = body.round_trip === true;
};

export const historyRequest = (req) => {
  const { query } = req;
  query.page = query.page === undefined || query.page === '' ? 1 : Number(query.page);
  if (!Number.isInteger(query.page) || query.page < 1) validationError('page', 'page must be a positive integer');
  if (query.zone_id !== undefined && query.zone_id !== '') query.zone_id = positiveId(query.zone_id, 'zone_id');
  else query.zone_id = undefined;
};
