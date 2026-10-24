import { validationError } from '../../middleware/validate.js';
import { AppError } from '../../shared/utils/app-error.js';
import { parseIstDatetime } from '../../shared/utils/ist-datetime.js';
import { etaRequest } from '../request/request.validation.js';

// payment_opt from the app → stored payment.
export const PAYMENT_BY_NUMBER = { 0: 'online', 1: 'cash', 2: 'wallet' };
const MOBILE = /^\d{10}$/;

const text = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : typeof value === 'number' ? String(value) : '');

const optionalText = (body, key, max) => {
  body[key] = text(body[key]);
  if (body[key].length > max) validationError(key, `${key} must not exceed ${max} characters`);
};

const optionalMobile = (body, key) => {
  body[key] = text(body[key]).replace(/\D/g, '');
  if (body[key] && !MOBILE.test(body[key])) validationError(key, `${key} must contain exactly 10 digits`);
};

const flag = (body, key) => {
  const value = body[key];
  if (value === undefined || value === null || value === '') { body[key] = false; return; }
  if (![0, 1, '0', '1', true, false].includes(value)) validationError(key, `${key} must be 0 or 1`);
  body[key] = value === 1 || value === '1' || value === true;
};

// ETA ids: "zt_5" → 5.
const etaId = (body, key, prefix) => {
  const match = text(body[key]).match(new RegExp(`^${prefix}_(\\d+)$`));
  if (!match) validationError(key, `${key} must be the ${prefix}_<number> value from ETA`);
  return Number(match[1]);
};

// Multi-stop rides and ride preferences come later; an empty list is fine, a filled one is refused rather than dropped.
const notYet = (body, key, what) => {
  const value = body[key];
  if (value === undefined || value === null || value === '') return;
  if (!Array.isArray(value)) validationError(key, `${key} must be a list`);
  if (value.length) throw new AppError('not_available_yet', 422, { errors: { [key]: `${what} are not available yet` } });
};

/** BOOK-01: the ETA trip fields (same rules) plus the chosen vehicle, payment and booking details. */
export const createBookingRequest = (req) => {
  etaRequest(req);
  const { body } = req;
  body.fare_id = etaId(body, 'zone_type_id', 'zt');
  body.vehicle_id = etaId(body, 'type_id', 'vt');

  const amount = typeof body.request_eta_amount === 'string' && body.request_eta_amount.trim() !== '' ? Number(body.request_eta_amount) : body.request_eta_amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 1_000_000) validationError('request_eta_amount', 'request_eta_amount must be the total from ETA');
  body.request_eta_amount = amount;

  // Only a number or a numeric string; null, true or [] must not turn into 0 / 1.
  const option = body.payment_opt;
  const paymentNumber = typeof option === 'number' || (typeof option === 'string' && option.trim() !== '') ? Number(option) : NaN;
  if (!(paymentNumber in PAYMENT_BY_NUMBER)) validationError('payment_opt', 'payment_opt must be 0 (online), 1 (cash) or 2 (wallet)');
  body.payment = PAYMENT_BY_NUMBER[paymentNumber];

  body.promocode_id = text(body.promocode_id);
  if (body.promocode_id && !/^promo_\d+$/.test(body.promocode_id)) validationError('promocode_id', 'promocode_id must be the promo_<number> value from ETA');

  notYet(body, 'stops', 'Multi-stop rides');
  notYet(body, 'preferences', 'Ride preferences');

  optionalText(body, 'pickup_poc_instruction', 255);
  optionalText(body, 'drop_poc_instruction', 255);
  flag(body, 'book_for_other');
  optionalText(body, 'other_contact_name', 80);
  optionalMobile(body, 'contact_no_other');
  if (body.book_for_other) {
    if (body.other_contact_name.length < 2) validationError('other_contact_name', 'other_contact_name is required when booking for someone else');
    if (!body.contact_no_other) validationError('contact_no_other', 'contact_no_other is required when booking for someone else');
  }

  const returnAt = parseIstDatetime(body.return_time);
  if (returnAt === undefined) validationError('return_time', 'return_time must be a date and time like 2026-10-26 10:00:00');
  body.return_at = returnAt;

  // Parcel fields: shapes here; whether they are required depends on the module (checked in the service).
  optionalText(body, 'pickup_poc_name', 80);
  optionalText(body, 'drop_poc_name', 80);
  optionalMobile(body, 'pickup_poc_mobile');
  optionalMobile(body, 'drop_poc_mobile');
  optionalText(body, 'goods_type_quantity', 40);
  body.paid_at = text(body.paid_at).toLowerCase();
  if (body.paid_at && !['sender', 'receiver'].includes(body.paid_at)) validationError('paid_at', 'paid_at must be Sender or Receiver');
  body.parcel_type = text(body.parcel_type).toLowerCase() || 'send';
  if (!['send', 'receive'].includes(body.parcel_type)) validationError('parcel_type', 'parcel_type must be send or receive');
  if (body.goods_type_id === undefined || body.goods_type_id === null || body.goods_type_id === '') body.goods_type_id = null;
  else {
    const goodsTypeId = Number(body.goods_type_id);
    if (!Number.isInteger(goodsTypeId) || goodsTypeId < 1) validationError('goods_type_id', 'goods_type_id must be an id from the goods types list');
    body.goods_type_id = goodsTypeId;
  }
};
