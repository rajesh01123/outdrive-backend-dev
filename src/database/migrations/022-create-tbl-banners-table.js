export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_banners', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: Sequelize.STRING(80), allowNull: false },
    subtitle: { type: Sequelize.STRING(120), allowNull: true },
    image: { type: Sequelize.STRING(255), allowNull: false },
    // Empty = a general home banner; otherwise the banner belongs to one ride module.
    module_key: { type: Sequelize.STRING(40), allowNull: true },
    link_type: { type: Sequelize.ENUM('none', 'module', 'url'), allowNull: false, defaultValue: 'none' },
    link_value: { type: Sequelize.STRING(500), allowNull: true },
    sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    starts_at: { type: Sequelize.DATE, allowNull: true },
    ends_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_banners', ['status', 'sort_order'], { name: 'idx_tbl_banners_status_order' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_banners');
