export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.changeColumn('tbl_admins', 'name', { type: Sequelize.STRING(120), allowNull: false });
  await queryInterface.addColumn('tbl_admins', 'profile_picture', { type: Sequelize.STRING(500), allowNull: true });
  await queryInterface.sequelize.query("UPDATE tbl_admins SET role = 'operations' WHERE role = 'admin'");
  await queryInterface.changeColumn('tbl_admins', 'role', { type: Sequelize.ENUM('super_admin', 'operations', 'support'), allowNull: false, defaultValue: 'operations' });
  await queryInterface.changeColumn('tbl_admins', 'status', { type: Sequelize.ENUM('active', 'inactive', 'blocked'), allowNull: false, defaultValue: 'active' });
  await queryInterface.addColumn('tbl_admins', 'two_factor_enabled', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
  await queryInterface.addColumn('tbl_admins', 'two_factor_method', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'email' });
  await queryInterface.addColumn('tbl_admins', 'password_changed_at', { type: Sequelize.DATE, allowNull: true });
};

export const down = async ({ queryInterface, Sequelize }) => {
  await queryInterface.removeColumn('tbl_admins', 'password_changed_at');
  await queryInterface.removeColumn('tbl_admins', 'two_factor_method');
  await queryInterface.removeColumn('tbl_admins', 'two_factor_enabled');
  await queryInterface.removeColumn('tbl_admins', 'profile_picture');
  await queryInterface.changeColumn('tbl_admins', 'role', { type: Sequelize.ENUM('super_admin', 'admin', 'support'), allowNull: false, defaultValue: 'admin' });
  await queryInterface.changeColumn('tbl_admins', 'status', { type: Sequelize.ENUM('active', 'blocked'), allowNull: false, defaultValue: 'active' });
};
