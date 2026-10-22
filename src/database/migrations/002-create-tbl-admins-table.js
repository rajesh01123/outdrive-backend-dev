export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_admins', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: Sequelize.STRING(80), allowNull: false },
    email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
    mobile: { type: Sequelize.STRING(10), allowNull: true, unique: true },
    password_hash: { type: Sequelize.STRING(255), allowNull: false },
    role: { type: Sequelize.ENUM('super_admin', 'admin', 'support'), allowNull: false, defaultValue: 'admin' },
    status: { type: Sequelize.ENUM('active', 'blocked'), allowNull: false, defaultValue: 'active' },
    last_login_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_admins');
