import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Admin, FareHistory, Service, VehicleType, Zone, ZoneVehicleFare } from '../../database/models/index.js';
import { calculateFare, FARE_CATEGORIES, fareCategoryForService } from '../../shared/fare/fare-calculator.js';
import { vehicleCategoryMismatch } from '../../shared/fleet/vehicle-rules.js';
import { AppError } from '../../shared/utils/app-error.js';
import { publicProfilePictureUrl as publicUploadUrl } from '../../shared/utils/serializers.js';
import { diffChanges, recordAudit } from '../audit/audit.service.js';

export const HISTORY_PAGE_LIMIT = 20;

export const farePayload = (fare) => ({
  id: Number(fare.id),
  zone_type_id: `zt_${fare.id}`,
  zone_id: Number(fare.zoneId),
  vehicle_type_id: Number(fare.vehicleTypeId),
  fare_category: fare.fareCategory,
  base_price: Number(fare.basePrice),
  base_distance_km: Number(fare.baseDistanceKm),
  price_per_km: Number(fare.pricePerKm),
  free_minutes: fare.freeMinutes,
  price_per_min: Number(fare.pricePerMin),
  min_fare: Number(fare.minFare),
  tax_percent: Number(fare.taxPercent),
  free_waiting_mins: fare.freeWaitingMins,
  waiting_charge_per_min: Number(fare.waitingChargePerMin),
  payment_types: fare.paymentTypes.split(',').filter(Boolean),
  is_default: Boolean(fare.isDefault),
  status: fare.status
});

const vehicleLite = (vehicle) => ({
  id: Number(vehicle.id),
  name: vehicle.name,
  type_key: vehicle.typeKey,
  icon: publicUploadUrl(vehicle.icon),
  capacity: vehicle.capacity,
  is_shared: Boolean(vehicle.isShared),
  status: vehicle.status
});

const FARE_AUDIT_FIELDS = ['base_price', 'base_distance_km', 'price_per_km', 'free_minutes', 'price_per_min', 'min_fare', 'tax_percent', 'free_waiting_mins', 'waiting_charge_per_min', 'payment_types', 'is_default', 'status'];
const fareTarget = (fare, zone, vehicle) => ({ type: 'fare', id: fare.id, label: `${vehicle.name} · ${fare.fareCategory} · ${zone.name}` });

const findZone = async (id) => {
  const zone = await Zone.findByPk(id);
  if (!zone) throw new AppError('zone_not_found', 404);
  return zone;
};

const recordHistory = (fare, { adminId, action, oldValues }, transaction) =>
  FareHistory.create({ fareId: fare.id, adminId, action, oldValues: oldValues || null, newValues: farePayload(fare) }, { transaction });

// Only one default vehicle per zone + category (the one pre-selected in the app).
const clearOtherDefaults = (fare, transaction) =>
  ZoneVehicleFare.update(
    { isDefault: false },
    { where: { zoneId: fare.zoneId, fareCategory: fare.fareCategory, id: { [Op.ne]: fare.id }, isDefault: true }, transaction }
  );

export const listFares = async ({ zoneId }) => {
  const zones = await Zone.findAll({ order: [['priority', 'DESC'], ['name', 'ASC']] });
  const zone = zoneId ? zones.find((item) => Number(item.id) === zoneId) : zones[0];
  if (zoneId && !zone) throw new AppError('zone_not_found', 404);
  const zoneList = zones.map((item) => ({ id: Number(item.id), name: item.name, status: item.status }));
  if (!zone) return { zones: zoneList, zone: null, categories: Object.fromEntries(FARE_CATEGORIES.map((key) => [key, []])) };

  const [services, vehicles, fares] = await Promise.all([
    Service.findAll({ include: [{ model: VehicleType, as: 'vehicleTypes', attributes: ['id'] }], order: [['sortOrder', 'ASC']] }),
    VehicleType.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] }),
    ZoneVehicleFare.findAll({ where: { zoneId: zone.id } })
  ]);

  // A vehicle belongs in a category when a module of that category offers it, or a fare already exists for it.
  const modulesUsing = new Map();
  for (const service of services) {
    const fareCategory = fareCategoryForService(service);
    for (const vehicle of service.vehicleTypes) {
      const key = `${fareCategory}:${vehicle.id}`;
      modulesUsing.set(key, [...(modulesUsing.get(key) || []), service.name]);
    }
  }
  const categories = {};
  for (const fareCategory of FARE_CATEGORIES) {
    categories[fareCategory] = vehicles
      .map((vehicle) => {
        const fare = fares.find((item) => item.fareCategory === fareCategory && Number(item.vehicleTypeId) === Number(vehicle.id));
        const modules = modulesUsing.get(`${fareCategory}:${vehicle.id}`) || [];
        if (!fare && !modules.length) return null;
        return { vehicle: vehicleLite(vehicle), modules, fare: fare ? farePayload(fare) : null };
      })
      .filter(Boolean);
  }
  return { zones: zoneList, zone: { id: Number(zone.id), name: zone.name, status: zone.status }, categories };
};

export const saveFare = async ({ body, adminId }) => {
  const zone = await findZone(body.zone_id);
  const vehicle = await VehicleType.findByPk(body.vehicle_type_id);
  if (!vehicle) throw new AppError('vehicle_type_not_found', 404);
  const mismatch = vehicleCategoryMismatch(vehicle, body.fare_category);
  if (mismatch) throw new AppError('validation_error', 422, { errors: { fare_category: mismatch } });
  const values = {
    basePrice: body.base_price,
    baseDistanceKm: body.base_distance_km,
    pricePerKm: body.price_per_km,
    freeMinutes: body.free_minutes,
    pricePerMin: body.price_per_min,
    minFare: body.min_fare,
    taxPercent: body.tax_percent,
    freeWaitingMins: body.free_waiting_mins,
    waitingChargePerMin: body.waiting_charge_per_min,
    paymentTypes: body.payment_types.join(','),
    isDefault: body.is_default,
    status: body.status
  };
  return sequelize.transaction(async (transaction) => {
    const where = { zoneId: body.zone_id, vehicleTypeId: body.vehicle_type_id, fareCategory: body.fare_category };
    let fare = await ZoneVehicleFare.findOne({ where, transaction, lock: transaction.LOCK.UPDATE });
    const oldValues = fare ? farePayload(fare) : null;
    if (fare) await fare.update(values, { transaction });
    else fare = await ZoneVehicleFare.create({ ...where, ...values }, { transaction });
    if (fare.isDefault) await clearOtherDefaults(fare, transaction);
    await recordHistory(fare, { adminId, action: oldValues ? 'updated' : 'created', oldValues }, transaction);
    const payload = farePayload(fare);
    const changes = diffChanges(oldValues, payload, FARE_AUDIT_FIELDS);
    if (!oldValues || changes) {
      recordAudit({
        action: 'fare.saved',
        target: fareTarget(fare, zone, vehicle),
        changes,
        description: `${oldValues ? 'Updated' : 'Created'} the ${vehicle.name} ${fare.fareCategory} fare in ${zone.name}`
      }, { transaction });
    }
    return payload;
  });
};

export const updateFareStatus = ({ id, status, adminId }) =>
  sequelize.transaction(async (transaction) => {
    const fare = await ZoneVehicleFare.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!fare) throw new AppError('fare_not_found', 404);
    if (fare.status === status) return farePayload(fare);
    const oldValues = farePayload(fare);
    await fare.update({ status }, { transaction });
    await recordHistory(fare, { adminId, action: 'status_changed', oldValues }, transaction);
    const [zone, vehicle] = await Promise.all([Zone.findByPk(fare.zoneId, { transaction }), VehicleType.findByPk(fare.vehicleTypeId, { transaction })]);
    recordAudit({
      action: 'fare.status_changed',
      target: fareTarget(fare, zone, vehicle),
      changes: { status: { from: oldValues.status, to: status } },
      description: `The ${vehicle.name} ${fare.fareCategory} fare in ${zone.name} set to ${status}`
    }, { transaction });
    return farePayload(fare);
  });

const copiedColumns = ['basePrice', 'baseDistanceKm', 'pricePerKm', 'freeMinutes', 'pricePerMin', 'minFare', 'taxPercent', 'freeWaitingMins', 'waitingChargePerMin', 'paymentTypes', 'isDefault', 'status'];

export const copyFares = async ({ fromZoneId, toZoneId, overwrite, adminId }) => {
  const fromZone = await findZone(fromZoneId);
  const toZone = await findZone(toZoneId);
  return sequelize.transaction(async (transaction) => {
    const source = await ZoneVehicleFare.findAll({ where: { zoneId: fromZoneId }, transaction });
    if (!source.length) throw new AppError('no_fares_to_copy', 422, { errors: { from_zone_id: 'the source zone has no fares yet' } });
    const result = { created: 0, updated: 0, skipped: 0 };
    for (const row of source) {
      const where = { zoneId: toZoneId, vehicleTypeId: row.vehicleTypeId, fareCategory: row.fareCategory };
      const values = Object.fromEntries(copiedColumns.map((column) => [column, row[column]]));
      const existing = await ZoneVehicleFare.findOne({ where, transaction });
      if (existing && !overwrite) { result.skipped += 1; continue; }
      const oldValues = existing ? farePayload(existing) : null;
      const fare = existing ? await existing.update(values, { transaction }) : await ZoneVehicleFare.create({ ...where, ...values }, { transaction });
      await recordHistory(fare, { adminId, action: 'copied', oldValues }, transaction);
      result[existing ? 'updated' : 'created'] += 1;
    }
    recordAudit({
      action: 'fare.copied',
      target: { type: 'zone', id: toZone.id, label: toZone.name },
      description: `Copied fares from ${fromZone.name} to ${toZone.name}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`
    }, { transaction });
    return result;
  });
};

export const previewFares = async ({ zoneId, fareCategory, distanceKm, minutes, seats, roundTrip }) => {
  const zone = await findZone(zoneId);
  const fares = await ZoneVehicleFare.findAll({
    where: { zoneId, fareCategory },
    include: [{ model: VehicleType, as: 'vehicleType' }],
    order: [[{ model: VehicleType, as: 'vehicleType' }, 'sortOrder', 'ASC']]
  });
  return {
    zone: { id: Number(zone.id), name: zone.name },
    input: { fare_category: fareCategory, distance_km: distanceKm, minutes, seats, round_trip: roundTrip },
    results: fares.map((fare) => ({
      vehicle: vehicleLite(fare.vehicleType),
      fare_status: fare.status,
      is_default: Boolean(fare.isDefault),
      breakdown: calculateFare(fare, { distanceMeters: distanceKm * 1000, minutes, seats, roundTrip })
    }))
  };
};

export const listHistory = async ({ zoneId, page }) => {
  const fareWhere = zoneId ? { zoneId } : undefined;
  const { rows, count } = await FareHistory.findAndCountAll({
    include: [
      { model: ZoneVehicleFare, as: 'fare', where: fareWhere, include: [{ model: VehicleType, as: 'vehicleType', attributes: ['id', 'name'] }, { model: Zone, as: 'zone', attributes: ['id', 'name'] }] },
      { model: Admin, as: 'admin', attributes: ['id', 'name', 'email'] }
    ],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: HISTORY_PAGE_LIMIT,
    offset: (page - 1) * HISTORY_PAGE_LIMIT,
    distinct: true
  });
  return {
    history: rows.map((row) => {
      const before = row.oldValues || {};
      const after = row.newValues || {};
      const changed = Object.keys(after).filter((key) => !['id', 'zone_type_id'].includes(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]));
      return {
        id: Number(row.id),
        action: row.action,
        zone: row.fare?.zone ? { id: Number(row.fare.zone.id), name: row.fare.zone.name } : null,
        vehicle: row.fare?.vehicleType ? { id: Number(row.fare.vehicleType.id), name: row.fare.vehicleType.name } : null,
        fare_category: after.fare_category,
        admin: row.admin ? { id: Number(row.admin.id), name: row.admin.name, email: row.admin.email } : null,
        changes: changed.map((key) => ({ field: key, from: row.oldValues ? before[key] ?? null : null, to: after[key] ?? null })),
        created_at: row.createdAt
      };
    }),
    pagination: { page, limit: HISTORY_PAGE_LIMIT, total: count, total_pages: Math.max(1, Math.ceil(count / HISTORY_PAGE_LIMIT)) }
  };
};
