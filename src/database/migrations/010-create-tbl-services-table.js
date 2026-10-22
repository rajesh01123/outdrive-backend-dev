export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_services', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: Sequelize.STRING(60), allowNull: false },
    slug: { type: Sequelize.STRING(40), allowNull: false, unique: true },
    subtitle: { type: Sequelize.STRING(120), allowNull: true },
    image: { type: Sequelize.STRING(255), allowNull: true },
    service_type: { type: Sequelize.ENUM('ride', 'parcel'), allowNull: false, defaultValue: 'ride' },
    sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: { type: Sequelize.ENUM('active', 'coming_soon', 'inactive'), allowNull: false, defaultValue: 'inactive' },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_services', ['status', 'sort_order'], { name: 'idx_tbl_services_status_order' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_services');
