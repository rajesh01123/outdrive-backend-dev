export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_users', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: Sequelize.STRING(80), allowNull: false },
    mobile: { type: Sequelize.STRING(10), allowNull: false },
    country_code: { type: Sequelize.STRING(4), allowNull: false, defaultValue: '91' },
    profile_picture: { type: Sequelize.STRING(255), allowNull: true },
    gender: { type: Sequelize.ENUM('male', 'female', 'others'), allowNull: true },
    map_type: { type: Sequelize.STRING(30), allowNull: true },
    wallet_balance: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    emergency_contact_name: { type: Sequelize.STRING(80), allowNull: true },
    emergency_contact_number: { type: Sequelize.STRING(15), allowNull: true },
    locale: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'en' },
    status: { type: Sequelize.ENUM('active', 'blocked', 'deleted'), allowNull: false, defaultValue: 'active' },
    delete_reason: { type: Sequelize.STRING(500), allowNull: true },
    deleted_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_users', ['country_code', 'mobile'], { unique: true, name: 'uniq_tbl_users_country_mobile' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_users');
