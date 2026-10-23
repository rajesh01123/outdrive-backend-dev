// Turns the simple services table into the app-contract "ride modules" (HOME-01).
const modules = {
  one_way: { section: 'rides', transport_type: 'taxi', service_type: 'normal', icon_types_for: 'taxi', short_description: 'City ride', description: 'Point to point city ride', sort_order: 1 },
  shared: { section: 'rides', transport_type: 'taxi', service_type: 'shared_ride', icon_types_for: 'taxi', short_description: 'Share seats', description: 'Share seats, lower fare', sort_order: 2 },
  outstation: { section: 'rides', transport_type: 'taxi', service_type: 'outstation', icon_types_for: 'outstation', short_description: 'Intercity', description: 'City to city one way', sort_order: 3 },
  round_trip: { section: 'rides', transport_type: 'taxi', service_type: 'outstation', icon_types_for: 'outstation', short_description: 'Go & return', description: 'Outstation go and return', sort_order: 4 },
  scheduled: { section: 'rides', transport_type: 'taxi', service_type: 'normal', icon_types_for: 'taxi', short_description: 'Book for later', description: 'Schedule city ride', sort_order: 5 },
  parcel_bike: { section: 'parcel', transport_type: 'delivery', service_type: 'normal', icon_types_for: 'delivery', short_description: 'Light parcels', description: 'Send parcel on bike', sort_order: 10 },
  parcel_3wheeler: { section: 'parcel', transport_type: 'delivery', service_type: 'normal', icon_types_for: 'delivery', short_description: 'Bigger parcels', description: 'Send parcel on 3 wheeler / auto', sort_order: 11 }
};

export const up = async ({ queryInterface, Sequelize }) => {
  const table = 'tbl_services';
  const query = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });

  await queryInterface.renameColumn(table, 'slug', 'module_key');
  await queryInterface.renameColumn(table, 'subtitle', 'short_description');

  await queryInterface.addColumn(table, 'section', { type: Sequelize.ENUM('rides', 'parcel'), allowNull: false, defaultValue: 'rides' });
  await query("UPDATE tbl_services SET section = IF(service_type = 'parcel', 'parcel', 'rides')");
  await queryInterface.removeColumn(table, 'service_type');

  await queryInterface.addColumn(table, 'transport_type', { type: Sequelize.ENUM('taxi', 'delivery'), allowNull: false, defaultValue: 'taxi' });
  await queryInterface.addColumn(table, 'service_type', { type: Sequelize.ENUM('normal', 'shared_ride', 'outstation'), allowNull: false, defaultValue: 'normal' });
  await queryInterface.addColumn(table, 'icon_types_for', { type: Sequelize.ENUM('taxi', 'outstation', 'delivery'), allowNull: false, defaultValue: 'taxi' });
  await queryInterface.addColumn(table, 'description', { type: Sequelize.STRING(500), allowNull: true });
  await queryInterface.addColumn(table, 'cancel_policy_title', { type: Sequelize.STRING(120), allowNull: true });
  await queryInterface.addColumn(table, 'cancel_policy_body', { type: Sequelize.STRING(1000), allowNull: true });

  // Old keys from the first services seeder.
  await query("UPDATE tbl_services SET module_key = 'shared' WHERE module_key = 'shared_ride'");
  await query("UPDATE tbl_services SET module_key = 'parcel_bike', name = 'Parcel on Bike' WHERE module_key = 'parcel'");

  for (const [moduleKey, values] of Object.entries(modules)) {
    await query(
      `UPDATE tbl_services SET section = :section, transport_type = :transport_type, service_type = :service_type,
        icon_types_for = :icon_types_for, short_description = :short_description, description = :description, sort_order = :sort_order
       WHERE module_key = :moduleKey`,
      { ...values, moduleKey }
    );
  }

  // Upgrading an install that had the old single parcel module: add the new 3-wheeler module next to it,
  // with the same status. A fresh install has no modules yet, and the seeder creates all seven.
  const [existing] = await query("SELECT id FROM tbl_services WHERE module_key = 'parcel_3wheeler'");
  const [bike] = await query("SELECT status FROM tbl_services WHERE module_key = 'parcel_bike'");
  if (!existing.length && bike.length) {
    const now = new Date();
    await queryInterface.bulkInsert(table, [{
      name: 'Parcel on 3 Wheeler',
      module_key: 'parcel_3wheeler',
      ...modules.parcel_3wheeler,
      status: bike[0].status,
      created_at: now,
      updated_at: now
    }]);
  }
};

export const down = async ({ queryInterface, Sequelize }) => {
  const table = 'tbl_services';
  const query = (sql) => queryInterface.sequelize.query(sql);
  await query("DELETE FROM tbl_services WHERE module_key = 'parcel_3wheeler'");
  await query("UPDATE tbl_services SET module_key = 'parcel', name = 'Parcel' WHERE module_key = 'parcel_bike'");
  await query("UPDATE tbl_services SET module_key = 'shared_ride' WHERE module_key = 'shared'");
  for (const column of ['cancel_policy_body', 'cancel_policy_title', 'description', 'icon_types_for', 'service_type', 'transport_type']) {
    await queryInterface.removeColumn(table, column);
  }
  await queryInterface.addColumn(table, 'service_type', { type: Sequelize.ENUM('ride', 'parcel'), allowNull: false, defaultValue: 'ride' });
  await query("UPDATE tbl_services SET service_type = IF(section = 'parcel', 'parcel', 'ride')");
  await queryInterface.removeColumn(table, 'section');
  await queryInterface.renameColumn(table, 'short_description', 'subtitle');
  await queryInterface.renameColumn(table, 'module_key', 'slug');
};
