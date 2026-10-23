export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_fare_histories', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    fare_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_zone_vehicle_fares', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    admin_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'tbl_admins', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    action: { type: Sequelize.ENUM('created', 'updated', 'copied', 'status_changed'), allowNull: false },
    old_values: { type: Sequelize.TEXT, allowNull: true },
    new_values: { type: Sequelize.TEXT, allowNull: false },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_fare_histories', ['fare_id', 'created_at'], { name: 'idx_tbl_fare_histories_fare' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_fare_histories');
