export const up = async ({ queryInterface, Sequelize }) => {
  const coordinate = { type: Sequelize.DECIMAL(10, 7), allowNull: false };
  await queryInterface.createTable('tbl_bookings', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    service_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_services', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    zone_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_zones', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    zone_fare_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_zone_vehicle_fares', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    vehicle_type_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_vehicle_types', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    driver_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'tbl_drivers', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    // Snapshots, so later admin edits never change an existing booking.
    module_key: { type: Sequelize.STRING(40), allowNull: false },
    vehicle_name: { type: Sequelize.STRING(60), allowNull: false },
    status: {
      type: Sequelize.ENUM('searching', 'scheduled', 'accepted', 'arrived', 'on_trip', 'completed', 'cancelled', 'no_driver_found'),
      allowNull: false,
      defaultValue: 'searching'
    },
    payment_opt: { type: Sequelize.ENUM('cash', 'wallet', 'online'), allowNull: false },
    pick_lat: coordinate,
    pick_lng: coordinate,
    pick_address: { type: Sequelize.STRING(255), allowNull: false },
    drop_lat: coordinate,
    drop_lng: coordinate,
    drop_address: { type: Sequelize.STRING(255), allowNull: false },
    distance_meters: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    duration_minutes: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    polyline: { type: Sequelize.TEXT, allowNull: true },
    is_out_station: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    is_round_trip: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    is_later: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    scheduled_at: { type: Sequelize.DATE, allowNull: true },
    shared_ride: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    seats_taken: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    promo_code: { type: Sequelize.STRING(40), allowNull: true },
    estimated_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
    currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'INR' },
    fare_breakdown: { type: Sequelize.TEXT, allowNull: false },
    cancelled_by: { type: Sequelize.ENUM('user', 'admin', 'driver', 'system'), allowNull: true },
    cancel_reason: { type: Sequelize.STRING(500), allowNull: true },
    cancelled_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_bookings', ['user_id', 'status'], { name: 'idx_tbl_bookings_user_status' });
  await queryInterface.addIndex('tbl_bookings', ['status', 'created_at'], { name: 'idx_tbl_bookings_status_created' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_bookings');
