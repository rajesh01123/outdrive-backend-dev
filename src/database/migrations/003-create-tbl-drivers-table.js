export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_drivers', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: Sequelize.STRING(80), allowNull: false },
    mobile: { type: Sequelize.STRING(10), allowNull: false },
    country_code: { type: Sequelize.STRING(4), allowNull: false, defaultValue: '91' },
    profile_picture: { type: Sequelize.STRING(255), allowNull: true },
    status: { type: Sequelize.ENUM('active', 'blocked', 'inactive'), allowNull: false, defaultValue: 'inactive' },
    approval_status: { type: Sequelize.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
    is_online: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    deleted_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_drivers', ['country_code', 'mobile'], { unique: true, name: 'uniq_tbl_drivers_country_mobile' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_drivers');
