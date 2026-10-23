export const up = async ({ queryInterface, Sequelize }) => {
  const coordinate = { type: Sequelize.DECIMAL(10, 7), allowNull: false };
  const text = (length) => ({ type: Sequelize.STRING(length), allowNull: true });
  await queryInterface.createTable('tbl_recent_searches', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    pick_lat: coordinate,
    pick_lng: coordinate,
    drop_lat: coordinate,
    drop_lng: coordinate,
    pick_address: { type: Sequelize.STRING(255), allowNull: false },
    pick_short_address: text(120),
    drop_address: { type: Sequelize.STRING(255), allowNull: false },
    drop_short_address: text(120),
    // Point-of-contact fields for parcel searches; empty in Phase 1.
    pickup_poc_name: text(80),
    pickup_poc_mobile: text(15),
    pickup_poc_instruction: text(255),
    drop_poc_name: text(80),
    drop_poc_mobile: text(15),
    drop_poc_instruction: text(255),
    total_distance: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
    total_time: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    poly_line: { type: Sequelize.TEXT, allowNull: true },
    transport_type: { type: Sequelize.ENUM('taxi', 'delivery'), allowNull: false, defaultValue: 'taxi' },
    module_key: text(40),
    stops: { type: Sequelize.TEXT, allowNull: true },
    // Last time this route was searched; repeat searches move the row back to the top.
    searched_at: { type: Sequelize.DATE, allowNull: false },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_recent_searches', ['user_id', 'searched_at'], { name: 'idx_tbl_recent_searches_user_time' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_recent_searches');
