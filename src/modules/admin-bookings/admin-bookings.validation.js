import { validationError } from '../../middleware/validate.js';

export const BOOKING_STATUSES = ['searching', 'scheduled', 'accepted', 'arrived', 'on_trip', 'completed', 'cancelled', 'no_driver_found'];
// Filter groups used by the stats cards.
export const STATUS_GROUPS = { ongoing: ['accepted', 'arrived', 'on_trip'], cancelled: ['cancelled', 'no_driver_found'] };

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const sectionFilter = (query) => {
  query.section = text(query.section);
  if (query.section && !['rides', 'parcel'].includes(query.section)) validationError('section', 'section must be rides or parcel');
};

export const statsRequest = (req) => sectionFilter(req.query);

export const listBookingsRequest = (req) => {
  const { query } = req;
  query.page = query.page === undefined || query.page === '' ? 1 : Number(query.page);
  if (!Number.isInteger(query.page) || query.page < 1) validationError('page', 'page must be a positive integer');
  query.status = text(query.status);
  if (query.status && !BOOKING_STATUSES.includes(query.status) && !STATUS_GROUPS[query.status]) validationError('status', 'status is not a valid booking status');
  query.module_key = text(query.module_key);
  sectionFilter(query);
  query.search = text(query.search).slice(0, 80);
  for (const key of ['from', 'to']) {
    query[key] = text(query[key]);
    if (query[key] && (!datePattern.test(query[key]) || Number.isNaN(Date.parse(query[key])))) validationError(key, `${key} must be a date like 2026-10-22`);
  }
  if (query.from && query.to && query.from > query.to) validationError('to', 'to must not be before from');
};

export const bookingIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

export const cancelBookingRequest = (req) => {
  bookingIdRequest(req);
  const reason = text(req.body.reason);
  if (!reason) validationError('reason', 'reason is required');
  if (reason.length > 500) validationError('reason', 'reason must not exceed 500 characters');
  req.body.reason = reason;
};
