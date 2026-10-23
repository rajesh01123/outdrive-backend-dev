export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_zone_services', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    zone_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_zones', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    service_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_services', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    is_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_zone_services', ['zone_id', 'service_id'], { unique: true, name: 'uniq_tbl_zone_services_zone_service' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_zone_services');
