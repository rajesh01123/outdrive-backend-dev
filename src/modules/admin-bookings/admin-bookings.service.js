import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Booking, BookingParcel, Service, User, Zone } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { bookingCode, parseBookingCode, requestCode } from '../../shared/utils/booking-code.js';
import { STATUS_GROUPS } from './admin-bookings.validation.js';
import { recordAudit } from '../audit/audit.service.js';

export const BOOKINGS_PAGE_LIMIT = 10;
const CANCELLABLE = ['searching', 'scheduled'];

const sectionInclude = (section) => ({
  model: Service,
  as: 'service',
  attributes: ['id', 'name', 'moduleKey', 'section'],
  ...(section ? { where: { section }, required: true } : {})
});

const userInclude = { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'countryCode'], paranoid: false };

const bookingRow = (booking) => ({
  id: Number(booking.id),
  booking_id: bookingCode(booking.id),
  request_id: requestCode(booking.id),
  status: booking.status,
  module_key: booking.moduleKey,
  module_name: booking.service?.name || booking.moduleKey,
  section: booking.service?.section || '',
  vehicle_name: booking.vehicleName,
  customer: booking.user ? { id: Number(booking.user.id), name: booking.user.name, mobile: booking.user.mobile, country_code: booking.user.countryCode } : null,
  pick_address: booking.pickAddress,
  drop_address: booking.dropAddress,
  estimated_amount: Number(booking.estimatedAmount),
  currency: booking.currency,
  payment_opt: booking.paymentOpt,
  is_later: Boolean(booking.isLater),
  scheduled_at: booking.scheduledAt,
  created_at: booking.createdAt
});

export const getStats = async ({ section }) => {
  const rows = await Booking.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('Booking.id')), 'count']],
    include: [{ ...sectionInclude(section), attributes: [] }],
    group: ['status'],
    raw: true
  });
  const counts = Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  const sum = (statuses) => statuses.reduce((total, status) => total + (counts[status] || 0), 0);
  return {
    total: Object.values(counts).reduce((total, count) => total + count, 0),
    searching: counts.searching || 0,
    scheduled: counts.scheduled || 0,
    ongoing: sum(STATUS_GROUPS.ongoing),
    completed: counts.completed || 0,
    cancelled: sum(STATUS_GROUPS.cancelled)
  };
};

export const listBookings = async ({ page, status, module_key: moduleKey, section, search, from, to }) => {
  const where = {};
  if (status) where.status = STATUS_GROUPS[status] ? { [Op.in]: STATUS_GROUPS[status] } : status;
  if (moduleKey) where.moduleKey = moduleKey;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(`${from}T00:00:00.000Z`);
    if (to) where.createdAt[Op.lt] = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000);
  }
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    const bookingId = parseBookingCode(search);
    where[Op.or] = [
      ...(bookingId ? [{ id: bookingId }] : []),
      { '$user.name$': { [Op.like]: like } },
      { '$user.mobile$': { [Op.like]: like } }
    ];
  }
  const { rows, count } = await Booking.findAndCountAll({
    where,
    include: [sectionInclude(section), { ...userInclude, required: false }],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: BOOKINGS_PAGE_LIMIT,
    offset: (page - 1) * BOOKINGS_PAGE_LIMIT,
    distinct: true,
    subQuery: false
  });
  return {
    bookings: rows.map(bookingRow),
    pagination: { page, limit: BOOKINGS_PAGE_LIMIT, total: count, total_pages: Math.max(1, Math.ceil(count / BOOKINGS_PAGE_LIMIT)) }
  };
};

export const getBooking = async (id) => {
  const booking = await Booking.findByPk(id, {
    include: [sectionInclude(), userInclude, { model: Zone, as: 'zone', attributes: ['id', 'name'] }, { model: BookingParcel, as: 'parcel' }]
  });
  if (!booking) throw new AppError('booking_not_found', 404);
  return {
    ...bookingRow(booking),
    zone: booking.zone ? { id: Number(booking.zone.id), name: booking.zone.name } : null,
    zone_type_id: `zt_${booking.zoneFareId}`,
    pick: { lat: Number(booking.pickLat), lng: Number(booking.pickLng), address: booking.pickAddress },
    drop: { lat: Number(booking.dropLat), lng: Number(booking.dropLng), address: booking.dropAddress },
    distance_meters: booking.distanceMeters,
    duration_minutes: booking.durationMinutes,
    is_out_station: Boolean(booking.isOutStation),
    is_round_trip: Boolean(booking.isRoundTrip),
    shared_ride: Boolean(booking.sharedRide),
    seats_taken: booking.seatsTaken,
    promo_code: booking.promoCode || '',
    fare_breakdown: booking.fareBreakdown,
    parcel: booking.parcel
      ? {
        sender_name: booking.parcel.senderName,
        sender_mobile: booking.parcel.senderMobile,
        receiver_name: booking.parcel.receiverName,
        receiver_mobile: booking.parcel.receiverMobile,
        goods_description: booking.parcel.goodsDescription,
        paid_at: booking.parcel.paidAt
      }
      : null,
    driver: null,
    cancelled_by: booking.cancelledBy || '',
    cancel_reason: booking.cancelReason || '',
    cancelled_at: booking.cancelledAt
  };
};

export const cancelBooking = async ({ id, reason }) => {
  await sequelize.transaction(async (transaction) => {
    const booking = await Booking.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!booking) throw new AppError('booking_not_found', 404);
    // Once a driver is involved the trip flow (next phase) owns cancellation and its charges.
    if (!CANCELLABLE.includes(booking.status)) throw new AppError('booking_not_cancellable', 422, { status: booking.status });
    await booking.update({ status: 'cancelled', cancelledBy: 'admin', cancelReason: reason, cancelledAt: new Date() }, { transaction });
    recordAudit({
      action: 'booking.cancelled',
      target: { type: 'booking', id: booking.id, label: bookingCode(booking.id) },
      description: `Cancelled ${bookingCode(booking.id)}. Reason: ${reason}`
    }, { transaction });
  });
  return getBooking(id);
};
