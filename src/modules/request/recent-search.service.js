import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { RecentSearch, Service } from '../../database/models/index.js';
import { haversineKm } from '../../shared/geo/geo.js';
import { AppError } from '../../shared/utils/app-error.js';

export const MAX_RECENT_SEARCHES = 20;
// Two points this close (in km) count as the same place.
const SAME_PLACE_KM = 0.05;

const near = (a, b) => haversineKm(a, b) <= SAME_PLACE_KM;
const point = (lat, lng) => [Number(lat), Number(lng)];

export const recentSearchPayload = (row) => ({
  id: Number(row.id),
  user_id: Number(row.userId),
  pick_lat: Number(row.pickLat),
  pick_lng: Number(row.pickLng),
  drop_lat: Number(row.dropLat),
  drop_lng: Number(row.dropLng),
  pick_address: row.pickAddress,
  pick_short_address: row.pickShortAddress || '',
  drop_address: row.dropAddress,
  drop_short_address: row.dropShortAddress || '',
  pickup_poc_name: row.pickupPocName || '',
  pickup_poc_mobile: row.pickupPocMobile || '',
  pickup_poc_instruction: row.pickupPocInstruction || '',
  drop_poc_name: row.dropPocName || '',
  drop_poc_mobile: row.dropPocMobile || '',
  drop_poc_instruction: row.dropPocInstruction || '',
  total_distance: Number(row.totalDistance),
  total_time: row.totalTime,
  poly_line: row.polyLine || '',
  transport_type: row.transportType,
  module_key: row.moduleKey || '',
  searchStops: {
    data: (row.stops || []).map((stop) => ({ order: stop.order, latitude: stop.lat, longitude: stop.lng, address: stop.address, short_address: stop.short_address || '' }))
  },
  // The app sorts and shows this as "when"; it is the last time the route was searched.
  created_at: row.searchedAt
});

// HOME-04 — newest first.
export const listRecentSearches = async ({ userId, limit, transportType }) => {
  const where = { userId };
  if (transportType) where.transportType = transportType;
  const rows = await RecentSearch.findAll({ where, order: [['searchedAt', 'DESC'], ['id', 'DESC']], limit });
  return rows.map(recentSearchPayload);
};

// HOME-05 — a repeat of a saved route (pickup and drop both within 50 m) refreshes that row instead of adding one.
export const saveRecentSearch = async ({ userId, body }) => {
  const pick = point(body.pick_lat, body.pick_lng);
  const drop = point(body.drop_lat, body.drop_lng);
  if (near(pick, drop)) throw new AppError('same_pick_drop', 422, { errors: { drop_lat: 'pickup and drop are the same place' } });
  if (body.module_key && !(await Service.findOne({ where: { moduleKey: body.module_key } }))) {
    throw new AppError('validation_error', 422, { errors: { module_key: 'module_key is not a valid ride module' } });
  }

  const values = {
    pickLat: pick[0],
    pickLng: pick[1],
    dropLat: drop[0],
    dropLng: drop[1],
    pickAddress: body.pick_address,
    pickShortAddress: body.pick_short_address || null,
    dropAddress: body.drop_address,
    dropShortAddress: body.drop_short_address || null,
    pickupPocName: body.pickup_poc_name || null,
    pickupPocMobile: body.pickup_poc_mobile || null,
    pickupPocInstruction: body.pickup_poc_instruction || null,
    dropPocName: body.drop_poc_name || null,
    dropPocMobile: body.drop_poc_mobile || null,
    dropPocInstruction: body.drop_poc_instruction || null,
    totalDistance: body.total_distance,
    totalTime: body.total_time,
    polyLine: body.poly_line || null,
    transportType: body.transport_type,
    moduleKey: body.module_key || null,
    stops: body.stops,
    searchedAt: new Date()
  };

  return sequelize.transaction(async (transaction) => {
    const rows = await RecentSearch.findAll({ where: { userId }, order: [['searchedAt', 'DESC'], ['id', 'DESC']], transaction, lock: transaction.LOCK.UPDATE });
    const repeat = rows.find((row) => near(point(row.pickLat, row.pickLng), pick) && near(point(row.dropLat, row.dropLng), drop));
    let saved;
    if (repeat) {
      saved = await repeat.update(values, { transaction });
    } else {
      saved = await RecentSearch.create({ userId, ...values }, { transaction });
      // Keep the newest MAX_RECENT_SEARCHES rows; the new one plus the 19 most recent existing rows.
      const overflow = rows.slice(MAX_RECENT_SEARCHES - 1).map((row) => row.id);
      if (overflow.length) await RecentSearch.destroy({ where: { id: { [Op.in]: overflow } }, transaction });
    }
    return { id: Number(saved.id) };
  });
};
