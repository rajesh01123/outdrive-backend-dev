// HOME-10 promo codes, applied through ETA-01. How often a code was used is counted from tbl_bookings.promo_code.
export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_coupons', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
    title: { type: Sequelize.STRING(80), allowNull: false },
    description: { type: Sequelize.STRING(200), allowNull: true },
    discount_type: { type: Sequelize.ENUM('flat', 'percent'), allowNull: false },
    // ₹ for flat, % for percent.
    discount_value: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
    min_trip_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    // Cap for percent coupons; a flat coupon's cap is its own value.
    max_discount_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
    uses_per_user: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    // 0 = no overall limit.
    total_uses_limit: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    // JSON arrays; empty = every module / every zone.
    module_keys: { type: Sequelize.TEXT, allowNull: true },
    zone_ids: { type: Sequelize.TEXT, allowNull: true },
    starts_at: { type: Sequelize.DATE, allowNull: true },
    ends_at: { type: Sequelize.DATE, allowNull: true },
    status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_coupons', ['status', 'starts_at', 'ends_at'], { name: 'idx_coupons_status_dates' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_coupons');
