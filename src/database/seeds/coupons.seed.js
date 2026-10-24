import { Coupon } from '../models/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Today 00:00 and 90 days later 23:59:59, Indian time.
const istDay = (offsetDays, time) => new Date(`${new Date(Date.now() + 5.5 * 60 * 60 * 1000 + offsetDays * DAY_MS).toISOString().slice(0, 10)}T${time}+05:30`);

// Demo coupons for testing ETA promos. Edit or switch them off in admin → Coupons.
const coupons = [
  { code: 'SAVE50', title: 'Flat ₹50 off', description: 'Valid on rides above ₹200', discountType: 'flat', discountValue: 50, minTripAmount: 200, usesPerUser: 3 },
  { code: 'RIDE20', title: '20% off', description: 'Max discount ₹100', discountType: 'percent', discountValue: 20, minTripAmount: 100, maxDiscountAmount: 100, usesPerUser: 1 },
  { code: 'PARCEL30', title: '₹30 off on parcels', description: 'On parcel deliveries above ₹150', discountType: 'flat', discountValue: 30, minTripAmount: 150, usesPerUser: 2, moduleKeys: ['parcel_bike', 'parcel_3wheeler'] },
  { code: 'OUTSTATION10', title: '10% off outstation', description: 'Up to ₹300 off on trips outside the city', discountType: 'percent', discountValue: 10, minTripAmount: 1000, maxDiscountAmount: 300, usesPerUser: 2, moduleKeys: ['outstation', 'round_trip'] }
];

// Only seeds an empty coupons table, so coupons an admin removed are not brought back.
export const seedCoupons = async () => {
  if (await Coupon.count()) {
    console.info('  Coupons already set up.');
    return;
  }
  const startsAt = istDay(0, '00:00:00');
  const endsAt = istDay(90, '23:59:59');
  await Coupon.bulkCreate(coupons.map((coupon) => ({ moduleKeys: [], zoneIds: [], totalUsesLimit: 0, maxDiscountAmount: null, ...coupon, startsAt, endsAt, status: 'active' })));
  console.info(`  Seeded ${coupons.length} demo coupons (${coupons.map((coupon) => coupon.code).join(', ')}), valid for 90 days.`);
};
