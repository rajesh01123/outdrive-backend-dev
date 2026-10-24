import { Op, Transaction } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { env } from '../../config/env.js';
import { Booking, BookingParcel, GoodsType, Service, User } from '../../database/models/index.js';
import { calculateFare } from '../../shared/fare/fare-calculator.js';
import { AppError } from '../../shared/utils/app-error.js';
import { bookingCode, parseBookingCode, requestCode } from '../../shared/utils/booking-code.js';
import { recordAudit } from '../audit/audit.service.js';
import { couponDiscount, couponPublicId, findUsableCoupon, minimumFareError } from '../coupon/coupon.service.js';
import { paymentOptions, resolveTrip, SCHEDULE_MAX_DAYS } from '../request/request.service.js';

// A user can have one of these at a time (scheduled bookings do not count).
export const ACTIVE_STATUSES = ['searching', 'accepted', 'arrived', 'on_trip'];
const ACCEPTED_STATUSES = ['accepted', 'arrived', 'on_trip', 'completed'];
const ENDED_STATUSES = ['cancelled', 'no_driver_found'];
const PAYMENT_NUMBER = { online: 0, cash: 1, wallet: 2 };
const DAY_MS = 24 * 60 * 60 * 1000;

const fieldError = (field, message) => new AppError('validation_error', 422, { errors: { [field]: message } });
const money = (value) => Number(value || 0);
const iso = (date) => (date ? new Date(date).toISOString() : '');

const BOOKING_INCLUDE = [
  { model: Service, as: 'service', attributes: ['name', 'moduleKey', 'transportType', 'serviceType'] },
  { model: BookingParcel, as: 'parcel' }
];

// App contract (BOOK-01, GET /user): string ids, numbers for money, "" for missing values.
export const bookingPayload = (booking) => {
  const { parcel } = booking;
  return {
    id: requestCode(booking.id),
    request_number: bookingCode(booking.id),
    status: booking.status,
    module_key: booking.moduleKey,
    module_name: booking.service?.name || booking.moduleKey,
    transport_type: booking.service?.transportType || '',
    service_type: booking.service?.serviceType || '',
    is_later: Boolean(booking.isLater),
    is_completed: booking.status === 'completed',
    is_cancelled: ENDED_STATUSES.includes(booking.status),
    accepted_ride: ACCEPTED_STATUSES.includes(booking.status),
    pick_lat: Number(booking.pickLat),
    pick_lng: Number(booking.pickLng),
    drop_lat: Number(booking.dropLat),
    drop_lng: Number(booking.dropLng),
    pick_address: booking.pickAddress,
    drop_address: booking.dropAddress,
    distance_meters: booking.distanceMeters,
    duration_minutes: booking.durationMinutes,
    zone_type_id: `zt_${booking.zoneFareId}`,
    type_id: `vt_${booking.vehicleTypeId}`,
    vehicle_name: booking.vehicleName,
    payment_opt: PAYMENT_NUMBER[booking.paymentOpt],
    subtotal: money(booking.subtotalAmount ?? booking.estimatedAmount),
    promo_discount: money(booking.promoDiscount),
    request_eta_amount: money(booking.estimatedAmount),
    currency: booking.currency,
    promo_code: booking.promoCode || '',
    promocode_id: booking.couponId ? `promo_${booking.couponId}` : '',
    shared_ride: Boolean(booking.sharedRide),
    seats_taken: booking.seatsTaken,
    is_round_trip: Boolean(booking.isRoundTrip),
    schedule_datetime: iso(booking.scheduledAt),
    return_time: iso(booking.returnAt),
    pickup_poc_instruction: booking.pickupInstruction || '',
    book_for_other: Boolean(booking.bookForOther),
    other_contact_name: booking.otherContactName || '',
    contact_no_other: booking.otherContactMobile || '',
    parcel: parcel ? {
      parcel_type: parcel.parcelType,
      goods_type_id: parcel.goodsTypeId ? Number(parcel.goodsTypeId) : null,
      goods_type_name: parcel.goodsDescription,
      goods_type_quantity: parcel.goodsQuantity || '',
      paid_at: parcel.paidAt === 'receiver' ? 'Receiver' : 'Sender',
      pickup_poc_name: parcel.senderName,
      pickup_poc_mobile: parcel.senderMobile,
      drop_poc_name: parcel.receiverName,
      drop_poc_mobile: parcel.receiverMobile,
      drop_poc_instruction: parcel.receiverInstruction || ''
    } : null,
    cancel_reason: booking.cancelReason || '',
    driver_detail: null,
    vehicle_detail: null,
    created_at: booking.createdAt
  };
};

// Parcels need both contacts, who pays and an active goods type.
const parcelGoodsType = async (body) => {
  for (const key of ['pickup_poc_name', 'pickup_poc_mobile', 'drop_poc_name', 'drop_poc_mobile']) {
    if (!body[key]) throw fieldError(key, `${key} is required for parcels`);
  }
  if (!body.paid_at) throw fieldError('paid_at', 'paid_at must be Sender or Receiver');
  if (!body.goods_type_id) throw fieldError('goods_type_id', 'goods_type_id is required for parcels');
  const goodsType = await GoodsType.findOne({ where: { id: body.goods_type_id, status: 'active' } });
  if (!goodsType) throw fieldError('goods_type_id', 'goods_type_id is not an active goods type');
  return goodsType;
};

const roundTripReturn = (body, trip) => {
  if (!body.return_at) throw fieldError('return_time', 'return_time is required for round trips');
  const pickupAt = trip.scheduledAt || new Date();
  if (body.return_at <= pickupAt) throw fieldError('return_time', 'return_time must be after the pickup time');
  if (body.return_at - pickupAt > SCHEDULE_MAX_DAYS * DAY_MS) throw fieldError('return_time', `return within ${SCHEDULE_MAX_DAYS} days of pickup`);
  return body.return_at;
};

/**
 * BOOK-01. Everything is checked again on the server: module, zone, vehicle, payment, promo and the fare.
 * The app's amount is only compared — when the fare moved since ETA, the app must refresh and book again.
 */
export const createBooking = async ({ body, user }) => {
  const trip = await resolveTrip(body);
  const offer = trip.offers.find(({ vehicle, fare }) => Number(fare.id) === body.fare_id && Number(vehicle.id) === body.vehicle_id);
  if (!offer) throw new AppError('vehicle_not_available', 422, { errors: { type_id: 'This vehicle is not available for this trip. Refresh the prices and choose again.' } });
  if (!paymentOptions(offer.fare).includes(body.payment)) {
    throw new AppError('payment_not_available', 422, { errors: { payment_opt: `${body.payment} payment is not available for this ride` } });
  }
  const isParcel = trip.fareCategory === 'parcel';
  const goodsType = isParcel ? await parcelGoodsType(body) : null;
  const returnAt = trip.roundTrip ? roundTripReturn(body, trip) : null;
  const breakdown = calculateFare(offer.fare, { distanceMeters: trip.distanceMeters, minutes: trip.minutes, seats: trip.seats, roundTrip: trip.roundTrip });

  // READ COMMITTED: after waiting for the coupon lock, the use count must see the booking that held it.
  // Under REPEATABLE READ the snapshot is older than the lock, and two riders could take a coupon's last use.
  const bookingId = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
    // Locking the user row makes a double tap wait for the first booking, so it cannot create two.
    const rider = await User.findByPk(user.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!trip.scheduledAt) {
      const active = await Booking.findOne({ where: { userId: user.id, status: ACTIVE_STATUSES }, order: [['id', 'DESC']], transaction });
      if (active) throw new AppError('active_booking_exists', 409, { request_id: requestCode(active.id), request_number: bookingCode(active.id), status: active.status });
    }

    const coupon = body.promo_code
      ? await findUsableCoupon({ code: body.promo_code, userId: user.id, moduleKey: trip.service.moduleKey, zoneId: trip.zone.id, transaction })
      : null;
    if (coupon && body.promocode_id && body.promocode_id !== couponPublicId(coupon)) throw fieldError('promocode_id', 'promocode_id does not match promo_code');
    const discount = coupon ? couponDiscount(coupon, breakdown.total).amount : 0;
    if (coupon && !discount) throw minimumFareError(coupon);
    const total = breakdown.total - discount;

    if (Math.round(body.request_eta_amount) !== total) {
      throw new AppError('fare_changed', 409, { request_eta_amount: body.request_eta_amount, total, errors: { request_eta_amount: 'The fare has changed. Refresh the price and book again.' } });
    }
    // The wallet is only checked here; it is charged when the trip ends (driver phase).
    if (body.payment === 'wallet' && money(rider.walletBalance) < total) {
      throw new AppError('insufficient_wallet_balance', 422, { wallet_balance: money(rider.walletBalance), total, errors: { payment_opt: 'Wallet balance is lower than the fare' } });
    }

    const booking = await Booking.create({
      userId: user.id,
      serviceId: trip.service.id,
      zoneId: trip.zone.id,
      zoneFareId: offer.fare.id,
      vehicleTypeId: offer.vehicle.id,
      moduleKey: trip.service.moduleKey,
      vehicleName: offer.vehicle.name,
      status: trip.scheduledAt ? 'scheduled' : 'searching',
      paymentOpt: body.payment,
      pickLat: body.pick_lat,
      pickLng: body.pick_lng,
      pickAddress: body.pick_address,
      dropLat: body.drop_lat,
      dropLng: body.drop_lng,
      dropAddress: body.drop_address,
      distanceMeters: trip.distanceMeters,
      durationMinutes: trip.minutes,
      polyline: body.polyline || null,
      isOutStation: trip.fareCategory === 'outstation',
      isRoundTrip: trip.roundTrip,
      isLater: Boolean(trip.scheduledAt),
      scheduledAt: trip.scheduledAt,
      sharedRide: trip.fareCategory === 'shared',
      seatsTaken: trip.seats,
      promoCode: coupon?.code || null,
      couponId: coupon?.id || null,
      subtotalAmount: breakdown.total,
      promoDiscount: discount,
      requestEtaAmount: body.request_eta_amount,
      estimatedAmount: total,
      fareBreakdown: { ...breakdown, promo_discount: discount, payable: total },
      returnAt,
      pickupInstruction: body.pickup_poc_instruction || null,
      bookForOther: !isParcel && body.book_for_other,
      otherContactName: !isParcel && body.book_for_other ? body.other_contact_name : null,
      otherContactMobile: !isParcel && body.book_for_other ? body.contact_no_other : null
    }, { transaction });

    if (isParcel) {
      await BookingParcel.create({
        bookingId: booking.id,
        senderName: body.pickup_poc_name,
        senderMobile: body.pickup_poc_mobile,
        receiverName: body.drop_poc_name,
        receiverMobile: body.drop_poc_mobile,
        // A copy of the name, so renaming the goods type later does not change old bookings.
        goodsDescription: goodsType.name,
        paidAt: body.paid_at,
        parcelType: body.parcel_type,
        goodsTypeId: goodsType.id,
        goodsQuantity: body.goods_type_quantity || null,
        receiverInstruction: body.drop_poc_instruction || null
      }, { transaction });
    }

    recordAudit({
      action: 'app.booking_created',
      target: { type: 'booking', id: booking.id, label: bookingCode(booking.id) },
      description: `Booked ${offer.vehicle.name} (${trip.service.name}) for ₹${total}${coupon ? ` with ${coupon.code}` : ''}${trip.scheduledAt ? ', scheduled' : ''}`
    }, { transaction });
    return booking.id;
  });

  return bookingPayload(await Booking.findByPk(bookingId, { include: BOOKING_INCLUDE }));
};

// GET /user — the ride in progress (if any) and whether a scheduled ride is coming up.
export const userRideState = async (userId) => {
  const [ongoing, upcoming] = await Promise.all([
    Booking.findOne({ where: { userId, status: ACTIVE_STATUSES }, include: BOOKING_INCLUDE, order: [['id', 'DESC']] }),
    Booking.count({ where: { userId, status: 'scheduled', scheduledAt: { [Op.gt]: new Date() } } })
  ]);
  return { has_ongoing_ride: Boolean(ongoing), has_upcoming_ride: upcoming > 0, onTripRequest: ongoing ? { data: bookingPayload(ongoing) } : null };
};

// GET /user?current_ride=req_1001 — one of the user's own bookings.
export const userBooking = async (userId, requestId) => {
  const id = parseBookingCode(requestId);
  const booking = id ? await Booking.findOne({ where: { id, userId }, include: BOOKING_INCLUDE }) : null;
  if (!booking) throw new AppError('booking_not_found', 404);
  return bookingPayload(booking);
};

/** Bookings no driver took within the timeout become no_driver_found (the coupon use is given back). */
export const expireUnansweredBookings = async (minutes = env.bookingSearchTimeoutMinutes) => {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  const stale = await Booking.findAll({ where: { status: 'searching', createdAt: { [Op.lt]: cutoff } }, attributes: ['id'], limit: 500 });
  let expired = 0;
  for (const { id } of stale) {
    const [changed] = await Booking.update(
      { status: 'no_driver_found', cancelledBy: 'system', cancelReason: `No driver accepted within ${minutes} minutes`, cancelledAt: new Date() },
      { where: { id, status: 'searching' } }
    );
    if (!changed) continue;
    expired += 1;
    recordAudit({ action: 'booking.no_driver_found', target: { type: 'booking', id, label: bookingCode(id) }, description: `${bookingCode(id)}: no driver accepted within ${minutes} minutes` });
  }
  return expired;
};

/** Checks every minute; BOOKING_SEARCH_TIMEOUT_MINUTES=0 turns it off. */
export const startBookingTimeouts = () => {
  if (!env.bookingSearchTimeoutMinutes) return;
  const run = () => expireUnansweredBookings().catch((error) => console.error(`[booking] timeout check failed: ${error.message}`));
  setInterval(run, 60 * 1000).unref();
};
