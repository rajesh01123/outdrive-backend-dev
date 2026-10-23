// Adds "use for" (ride / parcel / both) and wheel count to vehicle types, then removes module mappings
// and switches off fares that break the new rules. The rule logic is copied here on purpose so this
// migration keeps behaving the same even if the app rules change later.
const seedValues = {
  bike: ['both', 2],
  auto: ['ride', 3],
  three_wheeler: ['parcel', 3]
};

const requirementForModule = (service) => {
  if (service.service_type === 'shared_ride') return { useFor: 'ride', shared: true, wheels: null };
  if (service.section === 'parcel') return { useFor: 'parcel', shared: false, wheels: { parcel_bike: 2, parcel_3wheeler: 3 }[service.module_key] ?? null };
  if (service.service_type === 'outstation') return { useFor: 'ride', shared: false, wheels: 4 };
  return { useFor: 'ride', shared: false, wheels: null };
};
const requirementForCategory = {
  city: { useFor: 'ride', shared: false, wheels: null },
  shared: { useFor: 'ride', shared: true, wheels: null },
  outstation: { useFor: 'ride', shared: false, wheels: 4 },
  parcel: { useFor: 'parcel', shared: false, wheels: null }
};
const fits = (vehicle, need) =>
  Boolean(vehicle.is_shared) === need.shared
  && (vehicle.use_for === 'both' || vehicle.use_for === need.useFor)
  && (!need.wheels || Number(vehicle.wheels) === need.wheels);

export const up = async ({ queryInterface, Sequelize }) => {
  const query = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });
  await queryInterface.addColumn('tbl_vehicle_types', 'use_for', { type: Sequelize.ENUM('ride', 'parcel', 'both'), allowNull: false, defaultValue: 'ride' });
  await queryInterface.addColumn('tbl_vehicle_types', 'wheels', { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 4 });
  for (const [typeKey, [useFor, wheels]] of Object.entries(seedValues)) {
    await query('UPDATE tbl_vehicle_types SET use_for = :useFor, wheels = :wheels WHERE type_key = :typeKey', { useFor, wheels, typeKey });
  }

  const [vehicles] = await query('SELECT id, name, type_key, is_shared, use_for, wheels FROM tbl_vehicle_types');
  const [services] = await query('SELECT id, name, module_key, section, service_type FROM tbl_services');
  const vehicleById = new Map(vehicles.map((vehicle) => [Number(vehicle.id), vehicle]));
  const serviceById = new Map(services.map((service) => [Number(service.id), service]));

  const [links] = await query('SELECT id, service_id, vehicle_type_id FROM tbl_service_vehicle_types');
  for (const link of links) {
    const vehicle = vehicleById.get(Number(link.vehicle_type_id));
    const service = serviceById.get(Number(link.service_id));
    if (!vehicle || !service || fits(vehicle, requirementForModule(service))) continue;
    await query('DELETE FROM tbl_service_vehicle_types WHERE id = :id', { id: link.id });
    console.log(`  Removed ${vehicle.name} from ${service.name} (does not fit the module).`);
  }

  // Fares are referenced by bookings, so a misfit fare is switched off instead of deleted.
  const [fares] = await query("SELECT id, vehicle_type_id, fare_category FROM tbl_zone_vehicle_fares WHERE status = 'active'");
  for (const fare of fares) {
    const vehicle = vehicleById.get(Number(fare.vehicle_type_id));
    if (!vehicle || fits(vehicle, requirementForCategory[fare.fare_category])) continue;
    await query("UPDATE tbl_zone_vehicle_fares SET status = 'inactive' WHERE id = :id", { id: fare.id });
    console.log(`  Switched off the ${fare.fare_category} fare #${fare.id} for ${vehicle.name}.`);
  }
};

export const down = async ({ queryInterface }) => {
  await queryInterface.removeColumn('tbl_vehicle_types', 'wheels');
  await queryInterface.removeColumn('tbl_vehicle_types', 'use_for');
};
