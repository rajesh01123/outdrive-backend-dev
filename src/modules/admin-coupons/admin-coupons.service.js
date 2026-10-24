import { Coupon, Service, Zone } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { changedFields, diffChanges, recordAudit } from '../audit/audit.service.js';
import { couponState, usesByCode } from '../coupon/coupon.service.js';

const COUPON_AUDIT_FIELDS = ['code', 'title', 'description', 'discount_type', 'discount_value', 'min_trip_amount', 'max_discount_amount', 'uses_per_user', 'total_uses_limit', 'module_keys', 'zone_ids', 'starts_at', 'ends_at', 'status'];
const couponTarget = (coupon) => ({ type: 'coupon', id: coupon.id, label: coupon.code });
const money = (value) => (value === null || value === undefined ? null : Number(value));

const adminCouponPayload = (coupon, usedCount = 0) => ({
  id: Number(coupon.id),
  code: coupon.code,
  title: coupon.title,
  description: coupon.description || '',
  discount_type: coupon.discountType,
  discount_value: money(coupon.discountValue),
  min_trip_amount: money(coupon.minTripAmount),
  max_discount_amount: coupon.discountType === 'percent' ? money(coupon.maxDiscountAmount) : null,
  uses_per_user: coupon.usesPerUser,
  total_uses_limit: coupon.totalUsesLimit,
  module_keys: coupon.moduleKeys || [],
  zone_ids: (coupon.zoneIds || []).map(Number),
  starts_at: coupon.startsAt,
  ends_at: coupon.endsAt,
  status: coupon.status,
  state: couponState(coupon),
  used_count: usedCount,
  created_at: coupon.createdAt,
  updated_at: coupon.updatedAt
});

const usedCount = async (coupon) => (await usesByCode([coupon.code])).get(coupon.code) || 0;

const findCoupon = async (id) => {
  const coupon = await Coupon.findByPk(id);
  if (!coupon) throw new AppError('coupon_not_found', 404);
  return coupon;
};

// Module keys and zones must exist; the code must be unique.
const assertReferences = async (body, couponId) => {
  if (body.module_keys?.length) {
    const known = (await Service.findAll({ attributes: ['moduleKey'] })).map((service) => service.moduleKey);
    const unknown = body.module_keys.filter((key) => !known.includes(key));
    if (unknown.length) throw new AppError('validation_error', 422, { errors: { module_keys: `unknown modules: ${unknown.join(', ')}` } });
  }
  if (body.zone_ids?.length) {
    const found = await Zone.count({ where: { id: body.zone_ids } });
    if (found !== body.zone_ids.length) throw new AppError('validation_error', 422, { errors: { zone_ids: 'one or more zones do not exist' } });
  }
  if (body.code) {
    const other = await Coupon.findOne({ where: { code: body.code } });
    if (other && Number(other.id) !== Number(couponId)) throw new AppError('coupon_code_exists', 409, { errors: { code: 'another coupon already uses this code' } });
  }
};

const couponValues = (body) => {
  const values = {};
  const map = { code: 'code', title: 'title', discount_type: 'discountType', discount_value: 'discountValue', min_trip_amount: 'minTripAmount', max_discount_amount: 'maxDiscountAmount', uses_per_user: 'usesPerUser', total_uses_limit: 'totalUsesLimit', module_keys: 'moduleKeys', zone_ids: 'zoneIds', starts_at: 'startsAt', ends_at: 'endsAt', status: 'status' };
  for (const [key, column] of Object.entries(map)) if (body[key] !== undefined) values[column] = body[key];
  if (body.description !== undefined) values.description = body.description || null;
  return values;
};

// A flat coupon has no separate cap; a percent coupon's value cannot pass 100.
const assertConsistent = (coupon) => {
  if (coupon.discountType === 'percent' && Number(coupon.discountValue) > 100) throw new AppError('validation_error', 422, { errors: { discount_value: 'a percent discount must be between 1 and 100' } });
  if (coupon.startsAt && coupon.endsAt && coupon.endsAt <= coupon.startsAt) throw new AppError('validation_error', 422, { errors: { ends_at: 'ends_at must be after starts_at' } });
  if (coupon.discountType === 'flat') coupon.maxDiscountAmount = null;
};

export const listCoupons = async () => {
  const [coupons, services, zones] = await Promise.all([
    Coupon.findAll({ order: [['createdAt', 'DESC'], ['id', 'DESC']] }),
    Service.findAll({ attributes: ['moduleKey', 'name'], order: [['sortOrder', 'ASC'], ['id', 'ASC']] }),
    Zone.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] })
  ]);
  const uses = await usesByCode(coupons.map((coupon) => coupon.code));
  const payloads = coupons.map((coupon) => adminCouponPayload(coupon, uses.get(coupon.code) || 0));
  const count = (state) => payloads.filter((coupon) => coupon.state === state).length;
  return {
    stats: { total: payloads.length, live: count('live'), scheduled: count('scheduled'), expired: count('expired'), inactive: count('inactive'), total_uses: payloads.reduce((sum, coupon) => sum + coupon.used_count, 0) },
    coupons: payloads,
    options: {
      modules: services.map((service) => ({ key: service.moduleKey, name: service.name })),
      zones: zones.map((zone) => ({ id: Number(zone.id), name: zone.name }))
    }
  };
};

export const createCoupon = async (body) => {
  await assertReferences(body);
  const coupon = Coupon.build({ minTripAmount: 0, usesPerUser: 1, totalUsesLimit: 0, moduleKeys: [], zoneIds: [], ...couponValues(body) });
  assertConsistent(coupon);
  await coupon.save();
  recordAudit({ action: 'coupon.created', target: couponTarget(coupon), description: `Created coupon ${coupon.code} (${coupon.title})` });
  return adminCouponPayload(coupon);
};

export const updateCoupon = async ({ id, body }) => {
  const coupon = await findCoupon(id);
  const uses = await usedCount(coupon);
  // Bookings keep the code they used, so a used code cannot be renamed.
  if (body.code !== undefined && body.code !== coupon.code && uses) {
    throw new AppError('coupon_code_locked', 422, { errors: { code: 'this code is already used in bookings; create a new coupon instead' } });
  }
  await assertReferences(body, coupon.id);
  const before = adminCouponPayload(coupon, uses);
  coupon.set(couponValues(body));
  assertConsistent(coupon);
  await coupon.save();
  const payload = adminCouponPayload(coupon, uses);
  const changes = diffChanges(before, payload, COUPON_AUDIT_FIELDS);
  if (changes) recordAudit({ action: 'coupon.updated', target: couponTarget(coupon), changes, description: `Edited coupon ${coupon.code}: ${changedFields(changes)}` });
  return payload;
};

export const updateCouponStatus = async ({ id, status }) => {
  const coupon = await findCoupon(id);
  const previous = coupon.status;
  await coupon.update({ status });
  if (previous !== status) recordAudit({ action: 'coupon.status_changed', target: couponTarget(coupon), changes: { status: { from: previous, to: status } }, description: `Coupon ${coupon.code} set to ${status}` });
  return adminCouponPayload(coupon, await usedCount(coupon));
};

export const deleteCoupon = async (id) => {
  const coupon = await findCoupon(id);
  if (await usedCount(coupon)) throw new AppError('coupon_in_use', 409, { errors: { id: 'this coupon is used in bookings; set it inactive instead' } });
  await coupon.destroy();
  recordAudit({ action: 'coupon.deleted', target: couponTarget(coupon), description: `Deleted coupon ${coupon.code}` });
};
