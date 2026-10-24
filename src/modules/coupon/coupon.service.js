import { col, fn, Op } from 'sequelize';
import { Booking, Coupon } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';

// A booking that never happened does not use up a coupon.
const NOT_USED_STATUSES = ['cancelled', 'no_driver_found'];
const money = (value) => Number(value || 0);

export const normalizeCode = (code) => String(code || '').trim().toUpperCase();
export const couponPublicId = (coupon) => `promo_${coupon.id}`;

const promoError = (message, text, data = {}) => new AppError(message, 422, { ...data, errors: { promo_code: text } });

/** live = can be used now; scheduled / expired = active but outside its dates. */
export const couponState = (coupon, now = new Date()) => {
  if (coupon.status !== 'active') return 'inactive';
  if (coupon.startsAt && coupon.startsAt > now) return 'scheduled';
  if (coupon.endsAt && coupon.endsAt < now) return 'expired';
  return 'live';
};

// Empty module / zone lists mean "everywhere"; a missing module or zone in the request is not a filter.
const fitsTrip = (coupon, { moduleKey, zoneId }) =>
  (!coupon.moduleKeys?.length || !moduleKey || coupon.moduleKeys.includes(moduleKey))
  && (!coupon.zoneIds?.length || !zoneId || coupon.zoneIds.map(Number).includes(Number(zoneId)));

/** Uses per code (bookings that were not cancelled), optionally for one user: Map(code → count). */
export const usesByCode = async (codes, userId, transaction) => {
  if (!codes.length) return new Map();
  const rows = await Booking.findAll({
    attributes: ['promoCode', [fn('COUNT', col('id')), 'uses']],
    where: { promoCode: codes, status: { [Op.notIn]: NOT_USED_STATUSES }, ...(userId ? { userId } : {}) },
    group: ['promoCode'],
    raw: true,
    transaction
  });
  return new Map(rows.map((row) => [row.promoCode, Number(row.uses)]));
};

/** Discount on one fare in whole rupees, never more than the fare; 0 with a hint when the fare is below the minimum. */
export const couponDiscount = (coupon, fareTotal) => {
  const minimum = money(coupon.minTripAmount);
  if (fareTotal < minimum) return { amount: 0, message: `Add ₹${Math.ceil(minimum - fareTotal)} more to use ${coupon.code}` };
  const raw = coupon.discountType === 'flat' ? money(coupon.discountValue) : (fareTotal * money(coupon.discountValue)) / 100;
  const cap = coupon.discountType === 'percent' && coupon.maxDiscountAmount !== null ? money(coupon.maxDiscountAmount) : Infinity;
  return { amount: Math.min(Math.round(Math.min(raw, cap)), fareTotal), message: '' };
};

/**
 * The coupon a user may apply to this trip, or the reason they cannot (same errors for ETA and booking).
 * Inside a booking transaction the coupon row is locked, so two bookings cannot both take its last use.
 */
export const findUsableCoupon = async ({ code, userId, moduleKey, zoneId, transaction }) => {
  const coupon = await Coupon.findOne({ where: { code: normalizeCode(code) }, ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}) });
  if (!coupon || coupon.status !== 'active') throw promoError('invalid_promo_code', 'This promo code is not valid');
  if (!fitsTrip(coupon, { moduleKey, zoneId })) throw promoError('invalid_promo_code', 'This promo code is not valid for this ride');
  const state = couponState(coupon);
  if (state === 'scheduled') throw promoError('promo_expired', 'This promo code is not active yet');
  if (state === 'expired') throw promoError('promo_expired', 'This promo code has expired');
  const [allUses, userUses] = await Promise.all([usesByCode([coupon.code], null, transaction), usesByCode([coupon.code], userId, transaction)]);
  if (coupon.totalUsesLimit && (allUses.get(coupon.code) || 0) >= coupon.totalUsesLimit) {
    throw promoError('promo_usage_limit', 'This promo code has reached its limit');
  }
  if ((userUses.get(coupon.code) || 0) >= coupon.usesPerUser) {
    throw promoError('promo_usage_limit', coupon.usesPerUser > 1 ? `You have already used this promo code ${coupon.usesPerUser} times` : 'You have already used this promo code');
  }
  return coupon;
};

/** ETA: the code fits the trip, but no vehicle's fare reaches the minimum. */
export const minimumFareError = (coupon) => promoError(
  'promo_min_fare_not_met',
  `This promo code needs a fare of at least ₹${money(coupon.minTripAmount)}`,
  { minimum_trip_amount: money(coupon.minTripAmount) }
);

// App contract (HOME-10): string id, "" for missing dates, 0 for "no cap".
export const publicCouponPayload = (coupon, appliedCode = '') => ({
  id: couponPublicId(coupon),
  code: coupon.code,
  title: coupon.title,
  description: coupon.description || '',
  discount_type: coupon.discountType,
  discount_value: money(coupon.discountValue),
  minimum_trip_amount: money(coupon.minTripAmount),
  maximum_discount_amount: coupon.discountType === 'flat' ? money(coupon.discountValue) : money(coupon.maxDiscountAmount),
  discount_percent: coupon.discountType === 'percent' ? money(coupon.discountValue) : 0,
  uses_per_user: coupon.usesPerUser,
  from: coupon.startsAt ? coupon.startsAt.toISOString() : '',
  to: coupon.endsAt ? coupon.endsAt.toISOString() : '',
  active: true,
  is_applied: Boolean(appliedCode) && coupon.code === appliedCode
});

// HOME-10: live coupons for this module / zone that the user can still use, newest first.
export const listAvailableCoupons = async ({ userId, moduleKey, zoneId, appliedCode }) => {
  const now = new Date();
  const coupons = (await Coupon.findAll({
    where: {
      status: 'active',
      [Op.and]: [
        { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
        { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] }
      ]
    },
    order: [['createdAt', 'DESC'], ['id', 'DESC']]
  })).filter((coupon) => fitsTrip(coupon, { moduleKey, zoneId }));
  const codes = coupons.map((coupon) => coupon.code);
  const [allUses, userUses] = await Promise.all([usesByCode(codes), usesByCode(codes, userId)]);
  const applied = normalizeCode(appliedCode);
  return coupons
    .filter((coupon) => (userUses.get(coupon.code) || 0) < coupon.usesPerUser)
    .filter((coupon) => !coupon.totalUsesLimit || (allUses.get(coupon.code) || 0) < coupon.totalUsesLimit)
    .map((coupon) => publicCouponPayload(coupon, applied));
};
