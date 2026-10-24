// Banners are now just an image for the user app or the driver app, in admin order.
// Title, subtitle, module, link, status and dates are dropped; down() brings the columns back (empty).
export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.addColumn('tbl_banners', 'type', { type: Sequelize.ENUM('user', 'driver'), allowNull: false, defaultValue: 'user', after: 'image' });
  await queryInterface.removeIndex('tbl_banners', 'idx_tbl_banners_status_order');
  for (const column of ['title', 'subtitle', 'module_key', 'link_type', 'link_value', 'status', 'starts_at', 'ends_at']) {
    await queryInterface.removeColumn('tbl_banners', column);
  }
  await queryInterface.addIndex('tbl_banners', ['type', 'sort_order'], { name: 'idx_tbl_banners_type_order' });
};

export const down = async ({ queryInterface, Sequelize }) => {
  await queryInterface.removeIndex('tbl_banners', 'idx_tbl_banners_type_order');
  await queryInterface.addColumn('tbl_banners', 'title', { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'Banner' });
  await queryInterface.addColumn('tbl_banners', 'subtitle', { type: Sequelize.STRING(120), allowNull: true });
  await queryInterface.addColumn('tbl_banners', 'module_key', { type: Sequelize.STRING(40), allowNull: true });
  await queryInterface.addColumn('tbl_banners', 'link_type', { type: Sequelize.ENUM('none', 'module', 'url'), allowNull: false, defaultValue: 'none' });
  await queryInterface.addColumn('tbl_banners', 'link_value', { type: Sequelize.STRING(500), allowNull: true });
  await queryInterface.addColumn('tbl_banners', 'status', { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' });
  await queryInterface.addColumn('tbl_banners', 'starts_at', { type: Sequelize.DATE, allowNull: true });
  await queryInterface.addColumn('tbl_banners', 'ends_at', { type: Sequelize.DATE, allowNull: true });
  await queryInterface.removeColumn('tbl_banners', 'type');
  await queryInterface.addIndex('tbl_banners', ['status', 'sort_order'], { name: 'idx_tbl_banners_status_order' });
};
