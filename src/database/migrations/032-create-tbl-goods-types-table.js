// What a parcel holds (Documents, Electronics…). The app's parcel screen lists the active ones (GET /common/goods-types).
export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_goods_types', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: Sequelize.STRING(60), allowNull: false, unique: true },
    icon: { type: Sequelize.STRING(255), allowNull: true },
    sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_goods_types', ['status', 'sort_order'], { name: 'idx_goods_types_status_order' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_goods_types');
