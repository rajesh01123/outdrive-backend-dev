import { validationError } from '../../middleware/validate.js';
import { coordinate, moduleKeyField } from '../common/common.validation.js';

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

// A time without an offset ("2026-10-23 10:30") is Indian time; the service only runs in India.
const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;
export const parseScheduleDatetime = (value) => {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(LOCAL_TIME.test(raw) ? `${raw.replace(' ', 'T')}+05:30` : raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
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

  const schedule = parseScheduleDatetime(body.schedule_datetime);
  if (schedule === undefined) validationError('schedule_datetime', 'schedule_datetime must be a date and time like 2026-10-23 10:30:00');
  body.schedule_at = schedule;

  body.promo_code = text(body.promo_code);
};
