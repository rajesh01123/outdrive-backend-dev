import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Service, ServiceVehicleType, VehicleType, Zone, ZoneService, ZoneVehicleFare } from '../models/index.js';
import { polygonBounds, toGeoJsonPolygon } from '../../shared/geo/geo.js';
import { uploadDirectory } from '../../shared/utils/image-upload.js';

// Starter data so HOME → ZONE → ETA works out of the box.
// Every step only fills what is missing, so re-running never overwrites admin changes.

const assetsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'vehicles');

const vehicles = [
  { typeKey: 'bike', name: 'Bike', description: 'Affordable bike ride', capacity: 1, isShared: false },
  { typeKey: 'auto', name: 'Auto', description: '3 wheeler auto', capacity: 3, isShared: false },
  { typeKey: 'hatchback', name: 'Hatchback', description: 'Compact car', capacity: 4, isShared: false },
  { typeKey: 'sedan', name: 'Sedan', description: 'Comfortable sedan', capacity: 4, isShared: false },
  { typeKey: 'suv', name: 'SUV', description: 'Spacious SUV', capacity: 6, isShared: false },
  { typeKey: 'premium', name: 'Premium', description: 'Premium / luxury car', capacity: 4, isShared: false },
  { typeKey: 'shared_car', name: 'Shared Car', description: 'Pay per seat', capacity: 4, isShared: true },
  { typeKey: 'three_wheeler', name: '3 Wheeler', description: 'Cargo 3 wheeler for parcels', capacity: 1, isShared: false }
];

// Which vehicles each module offers (ETA spec table).
const mapping = {
  one_way: ['bike', 'auto', 'hatchback', 'sedan', 'suv', 'premium'],
  scheduled: ['bike', 'auto', 'hatchback', 'sedan', 'suv', 'premium'],
  shared: ['shared_car'],
  outstation: ['sedan', 'suv', 'premium'],
  round_trip: ['sedan', 'suv', 'premium'],
  parcel_bike: ['bike'],
  parcel_3wheeler: ['three_wheeler']
};

const indore = {
  name: 'Indore City',
  priority: 0,
  ring: [[22.84, 75.72], [22.84, 76.0], [22.6, 76.0], [22.6, 75.72]]
};

// [base, base_km, per_km, free_min, per_min, min_fare, tax%, free_wait, wait/min, is_default]
const fares = {
  city: {
    bike: [25, 6, 8, 18, 1, 30, 0, 5, 2, true],
    auto: [40, 3, 12, 15, 1, 50, 0, 5, 2, false],
    hatchback: [60, 4, 13, 10, 1.5, 100, 5, 5, 2, false],
    sedan: [60, 4, 14, 10, 1.5, 100, 5, 5, 2, false],
    suv: [90, 4, 18, 10, 2, 150, 5, 5, 3, false],
    premium: [150, 4, 25, 10, 3, 250, 5, 5, 4, false]
  },
  shared: { shared_car: [30, 4, 7, 15, 0.5, 40, 5, 3, 1, true] },
  outstation: {
    sedan: [300, 20, 12, 0, 0, 300, 5, 15, 2, true],
    suv: [400, 20, 16, 0, 0, 400, 5, 15, 3, false],
    premium: [600, 20, 22, 0, 0, 600, 5, 15, 4, false]
  },
  parcel: {
    bike: [30, 5, 9, 20, 1, 40, 0, 5, 2, true],
    // One default per zone + category: the parcel default is the bike.
    three_wheeler: [80, 4, 16, 15, 1.5, 120, 0, 10, 2, false]
  }
};

// Counts rows created in this run, so a no-op run can say so.
let createdCount = 0;
const created = (message) => { createdCount += 1; console.info(`  ${message}`); };

const copyIcon = async (typeKey) => {
  const fileName = `${crypto.randomUUID()}.webp`;
  await fs.mkdir(uploadDirectory('vehicles'), { recursive: true });
  await fs.copyFile(path.join(assetsDir, `${typeKey}.webp`), path.join(uploadDirectory('vehicles'), fileName));
  return `uploads/vehicles/${fileName}`;
};

const seedVehicles = async () => {
  const byKey = {};
  for (const [index, vehicle] of vehicles.entries()) {
    let row = await VehicleType.findOne({ where: { typeKey: vehicle.typeKey } });
    if (!row) {
      row = await VehicleType.create({ ...vehicle, icon: await copyIcon(vehicle.typeKey), sortOrder: index + 1, status: 'active' });
      created(`Seeded vehicle ${vehicle.typeKey}.`);
    }
    byKey[vehicle.typeKey] = row;
  }
  return byKey;
};

const seedMapping = async (vehicleByKey) => {
  for (const [moduleKey, typeKeys] of Object.entries(mapping)) {
    const service = await Service.findOne({ where: { moduleKey } });
    if (!service) { console.warn(`  Module ${moduleKey} missing — skipped its vehicle mapping.`); continue; }
    // A module the admin already configured is left alone.
    if (await ServiceVehicleType.count({ where: { serviceId: service.id } })) continue;
    await ServiceVehicleType.bulkCreate(typeKeys.map((key) => ({ serviceId: service.id, vehicleTypeId: vehicleByKey[key].id })));
    created(`Mapped ${moduleKey} → ${typeKeys.join(', ')}.`);
  }
};

const seedZone = async () => {
  let zone = await Zone.findOne({ where: { name: indore.name } });
  if (!zone) {
    zone = await Zone.create({ name: indore.name, priority: indore.priority, status: 'active', polygon: toGeoJsonPolygon(indore.ring), ...polygonBounds(indore.ring) });
    created(`Seeded zone ${indore.name}.`);
  }
  for (const service of await Service.findAll()) {
    await ZoneService.findOrCreate({ where: { zoneId: zone.id, serviceId: service.id }, defaults: { isEnabled: true } });
  }
  return zone;
};

const seedFares = async (zone, vehicleByKey) => {
  for (const [fareCategory, rows] of Object.entries(fares)) {
    for (const [typeKey, [basePrice, baseDistanceKm, pricePerKm, freeMinutes, pricePerMin, minFare, taxPercent, freeWaitingMins, waitingChargePerMin, isDefault]] of Object.entries(rows)) {
      const where = { zoneId: zone.id, vehicleTypeId: vehicleByKey[typeKey].id, fareCategory };
      const [, isNew] = await ZoneVehicleFare.findOrCreate({
        where,
        defaults: { basePrice, baseDistanceKm, pricePerKm, freeMinutes, pricePerMin, minFare, taxPercent, freeWaitingMins, waitingChargePerMin, isDefault, paymentTypes: 'cash,wallet,online', status: 'active' }
      });
      if (isNew) created(`Seeded ${fareCategory} fare for ${typeKey}.`);
    }
  }
};

// Needs the ride modules, so it runs after seedServices.
export const seedRideSetup = async () => {
  createdCount = 0;
  const vehicleByKey = await seedVehicles();
  await seedMapping(vehicleByKey);
  const zone = await seedZone();
  await seedFares(zone, vehicleByKey);
  if (!createdCount) console.info('  Vehicles, mapping, zone and fares already set up.');
};
