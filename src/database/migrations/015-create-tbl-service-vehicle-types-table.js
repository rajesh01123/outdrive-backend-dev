export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_service_vehicle_types', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    service_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_services', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    vehicle_type_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_vehicle_types', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_service_vehicle_types', ['service_id', 'vehicle_type_id'], { unique: true, name: 'uniq_tbl_service_vehicle_types' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_service_vehicle_types');
