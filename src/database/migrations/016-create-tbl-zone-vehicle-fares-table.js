export const up = async ({ queryInterface, Sequelize }) => {
  const money = { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 };
  await queryInterface.createTable('tbl_zone_vehicle_fares', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    zone_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_zones', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    vehicle_type_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_vehicle_types', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    fare_category: { type: Sequelize.ENUM('city', 'shared', 'outstation', 'parcel'), allowNull: false },
    base_price: money,
    base_distance_km: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
    price_per_km: money,
    free_minutes: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    price_per_min: money,
    min_fare: money,
    tax_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    free_waiting_mins: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    waiting_charge_per_min: money,
    payment_types: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'cash,wallet,online' },
    is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_zone_vehicle_fares', ['zone_id', 'vehicle_type_id', 'fare_category'], { unique: true, name: 'uniq_tbl_zone_vehicle_fares' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_zone_vehicle_fares');
