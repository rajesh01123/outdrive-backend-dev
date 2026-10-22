export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_devices', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'tbl_users', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    device_token: { type: Sequelize.STRING(255), allowNull: false, unique: true },
    platform: { type: Sequelize.ENUM('android', 'ios'), allowNull: false },
    last_seen_at: { type: Sequelize.DATE, allowNull: false },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_devices', ['user_id', 'platform'], { name: 'idx_tbl_devices_user_platform' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_devices');
