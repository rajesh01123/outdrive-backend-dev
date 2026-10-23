export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_vehicle_types', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: Sequelize.STRING(60), allowNull: false },
    type_key: { type: Sequelize.STRING(40), allowNull: false, unique: true },
    icon: { type: Sequelize.STRING(255), allowNull: true },
    description: { type: Sequelize.STRING(200), allowNull: true },
    capacity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    is_shared: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_vehicle_types');
