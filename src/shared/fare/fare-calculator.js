export const FARE_CATEGORIES = ['city', 'shared', 'outstation', 'parcel'];

// Which fare table a module uses: decided by the module's own fields, never by a hard-coded key list.
export const fareCategoryForService = (service) => {
  if (service.section === 'parcel') return 'parcel';
  if (service.serviceType === 'shared_ride') return 'shared';
  if (service.serviceType === 'outstation') return 'outstation';
  return 'city';
};

const round2 = (value) => Math.round(value * 100) / 100;
const num = (value) => Number(value || 0);

/**
 * distance_price = max(0, km - base_distance_km) * price_per_km
 * time_price     = max(0, minutes - free_minutes) * price_per_min
 * subtotal       = (base_price + distance_price + time_price) * seats
 * total          = round(max(subtotal + tax + airport_surge, min_fare * seats))
 * Round trip doubles distance and minutes; seats only multiply for shared fares.
 */
export const calculateFare = (fare, { distanceMeters, minutes, seats = 1, roundTrip = false }) => {
  const tripFactor = roundTrip ? 2 : 1;
  const seatFactor = fare.fareCategory === 'shared' ? Math.max(1, seats) : 1;
  const distanceKm = round2((num(distanceMeters) / 1000) * tripFactor);
  const tripMinutes = Math.round(num(minutes) * tripFactor);

  const basePrice = num(fare.basePrice);
  const extraKm = Math.max(0, distanceKm - num(fare.baseDistanceKm));
  const extraMinutes = Math.max(0, tripMinutes - num(fare.freeMinutes));
  const distancePrice = round2(extraKm * num(fare.pricePerKm));
  const timePrice = round2(extraMinutes * num(fare.pricePerMin));

  const subtotal = round2((basePrice + distancePrice + timePrice) * seatFactor);
  const taxPercent = num(fare.taxPercent);
  const taxAmount = round2((subtotal * taxPercent) / 100);
  const airportSurgeFee = 0;
  const minFare = round2(num(fare.minFare) * seatFactor);
  const beforeMinimum = subtotal + taxAmount + airportSurgeFee;

  return {
    distance_km: distanceKm,
    minutes: tripMinutes,
    seats: seatFactor,
    base_price: basePrice,
    price_per_km: num(fare.pricePerKm),
    price_per_min: num(fare.pricePerMin),
    extra_km: round2(extraKm),
    extra_minutes: extraMinutes,
    distance_price: distancePrice,
    time_price: timePrice,
    subtotal,
    tax_percent: taxPercent,
    tax_amount: taxAmount,
    airport_surge_fee: airportSurgeFee,
    min_fare: minFare,
    min_fare_applied: beforeMinimum < minFare,
    total: Math.round(Math.max(beforeMinimum, minFare))
  };
};
