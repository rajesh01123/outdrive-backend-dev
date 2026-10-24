import { Op } from 'sequelize';
import { env } from '../../config/env.js';
import { Service, ZoneVehicleFare } from '../../database/models/index.js';
import { calculateFare, fareCategoryForService } from '../../shared/fare/fare-calculator.js';
import { haversineKm } from '../../shared/geo/geo.js';
import { AppError } from '../../shared/utils/app-error.js';
import { publicProfilePictureUrl as publicUploadUrl } from '../../shared/utils/serializers.js';
import { checkServiceability } from '../zone/zone.service.js';
import { couponDiscount, couponPublicId, findUsableCoupon, minimumFareError } from '../coupon/coupon.service.js';

export const SCHEDULE_MIN_LEAD_MINUTES = 30;
export const SCHEDULE_MAX_DAYS = 7;

const fieldError = (field, message, status = 422) => new AppError('validation_error', status, { errors: { [field]: message } });

const paymentOptions = (fare) => fare.paymentTypes.split(',').filter((type) => type && (type !== 'online' || env.payments.onlineEnabled));

/**
 * Everything ETA and (later) booking need before pricing: the module, its zone, the trip distance
 * and the vehicles on offer. Throws the same errors for both, so they can never disagree.
 */
export const resolveTrip = async (body) => {
  const service = await Service.findOne({ where: { moduleKey: body.module_key } });
  if (!service) throw fieldError('module_key', 'module_key is not a valid ride module');
  if (body.transport_type && body.transport_type !== service.transportType) throw fieldError('transport_type', `transport_type for ${service.moduleKey} is ${service.transportType}`);
  if (body.service_type && body.service_type !== service.serviceType) throw fieldError('service_type', `service_type for ${service.moduleKey} is ${service.serviceType}`);
  if (service.status !== 'active') throw new AppError('module_not_available', 422, { module_key: service.moduleKey, status: service.status });

  // Module rules come from the module itself; the app's flags are not trusted to change pricing.
  const fareCategory = fareCategoryForService(service);
  const roundTrip = service.moduleKey === 'round_trip';
  const seats = fareCategory === 'shared' ? body.seats_taken : 1;
  let scheduledAt = null;
  if (service.moduleKey === 'scheduled') {
    if (!body.schedule_at) throw fieldError('schedule_datetime', 'schedule_datetime is required for scheduled rides');
    const minutesAhead = (body.schedule_at.getTime() - Date.now()) / 60000;
    if (minutesAhead < SCHEDULE_MIN_LEAD_MINUTES) throw fieldError('schedule_datetime', `schedule a ride at least ${SCHEDULE_MIN_LEAD_MINUTES} minutes from now`);
    if (minutesAhead > SCHEDULE_MAX_DAYS * 24 * 60) throw fieldError('schedule_datetime', `schedule a ride within ${SCHEDULE_MAX_DAYS} days`);
    scheduledAt = body.schedule_at;
  }
  const area = await checkServiceability({ lat: body.pick_lat, lng: body.pick_lng, moduleKey: service.moduleKey });
  if (!area.isServiceable) throw new AppError('out_of_service_area', 422, { is_serviceable: false });

  // The app's route distance can only be longer than the straight line; a shorter value would underprice the ride.
  const straightLineMeters = Math.round(haversineKm([body.pick_lat, body.pick_lng], [body.drop_lat, body.drop_lng]) * 1000);
  const distanceMeters = Math.max(body.distance, straightLineMeters);

  const vehicles = await service.getVehicleTypes({ where: { status: 'active' }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
  const fares = vehicles.length
    ? await ZoneVehicleFare.findAll({ where: { zoneId: area.zone.id, fareCategory, status: 'active', vehicleTypeId: { [Op.in]: vehicles.map((vehicle) => vehicle.id) } } })
    : [];
  const fareByVehicle = new Map(fares.map((fare) => [Number(fare.vehicleTypeId), fare]));
  const offers = vehicles
    .filter((vehicle) => fareCategory !== 'shared' || vehicle.capacity >= seats)
    .map((vehicle) => ({ vehicle, fare: fareByVehicle.get(Number(vehicle.id)) }))
    .filter(({ fare }) => fare && paymentOptions(fare).length);

  return { service, zone: area.zone, fareCategory, roundTrip, seats, scheduledAt, distanceMeters, minutes: body.duration, offers };
};

const etaItem = ({ vehicle, fare }, trip, walletBalance, coupon) => {
  const breakdown = calculateFare(fare, { distanceMeters: trip.distanceMeters, minutes: trip.minutes, seats: trip.seats, roundTrip: trip.roundTrip });
  // The promo comes off the payable fare (tax included); the app never calculates it.
  const promo = coupon ? couponDiscount(coupon, breakdown.total) : { amount: 0, message: '' };
  const total = breakdown.total - promo.amount;
  return {
    zone_type_id: `zt_${fare.id}`,
    type_id: `vt_${vehicle.id}`,
    name: vehicle.name,
    description: vehicle.description || '',
    vehicle_icon: publicUploadUrl(vehicle.icon),
    capacity: vehicle.capacity,
    payment_type: paymentOptions(fare).join(','),
    distance: String(breakdown.distance_km),
    distance_in_meters: String(Math.round(breakdown.distance_km * 1000)),
    time: breakdown.minutes,
    subtotal: breakdown.total,
    total,
    min_amount: total,
    currency: 'INR',
    unit_in_words: 'KM',
    is_default: Boolean(fare.isDefault),
    dispatch_type: 'normal',
    enable_bidding: false,
    enable_shared_ride: trip.fareCategory === 'shared',
    seats_taken: breakdown.seats,
    has_discount: promo.amount > 0,
    discount_total: promo.amount,
    promo_discount: promo.amount,
    promo_code: promo.amount ? coupon.code : '',
    promo_applied: promo.amount > 0,
    promo_message: promo.message,
    base_price: breakdown.base_price,
    price_per_distance: breakdown.price_per_km,
    price_per_time: breakdown.price_per_min,
    distance_price: breakdown.distance_price,
    time_price: breakdown.time_price,
    tax_amount: breakdown.tax_amount,
    tax: String(breakdown.tax_percent),
    airport_surge_fee: breakdown.airport_surge_fee,
    min_fare_applied: breakdown.min_fare_applied,
    free_waiting_time_in_mins_before_trip_start: fare.freeWaitingMins,
    waiting_charge: Number(fare.waitingChargePerMin),
    promocode_id: promo.amount ? couponPublicId(coupon) : '',
    user_wallet_balance: walletBalance,
    preference: []
  };
};

// ETA-01
export const estimate = async ({ body, user }) => {
  const trip = await resolveTrip(body);
  const coupon = body.promo_code
    ? await findUsableCoupon({ code: body.promo_code, userId: user.id, moduleKey: trip.service.moduleKey, zoneId: trip.zone.id })
    : null;
  const walletBalance = Number(user.walletBalance || 0);
  const data = trip.offers.map((offer) => etaItem(offer, trip, walletBalance, coupon));
  // A code is refused only when no vehicle reaches its minimum fare; otherwise each vehicle shows its own result.
  if (coupon && data.length && !data.some((item) => item.promo_applied)) throw minimumFareError(coupon);
  // Exactly one vehicle is pre-selected: the first configured default, or the first vehicle when the
  // default is filtered out (e.g. by seats). Older data can hold two defaults in one zone + category.
  const defaultIndex = Math.max(0, data.findIndex((item) => item.is_default));
  data.forEach((item, index) => { item.is_default = index === defaultIndex; });
  return {
    message: data.length ? 'OK' : 'no_vehicles_available',
    enabledDispatchType: { ondemand: true, bidding: false, shared: trip.fareCategory === 'shared' },
    data
  };
};
