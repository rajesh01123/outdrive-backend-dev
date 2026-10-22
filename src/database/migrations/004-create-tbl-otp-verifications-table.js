export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_otp_verifications', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    mobile: { type: Sequelize.STRING(10), allowNull: false },
    country_code: { type: Sequelize.STRING(4), allowNull: false },
    purpose: { type: Sequelize.ENUM('login', 'signup', 'delete_account'), allowNull: false },
    otp_hash: { type: Sequelize.STRING(255), allowNull: false },
    expires_at: { type: Sequelize.DATE, allowNull: false },
    attempts: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    max_attempts: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 5 },
    status: { type: Sequelize.ENUM('pending', 'verified', 'used', 'expired', 'locked'), allowNull: false, defaultValue: 'pending' },
    sent_at: { type: Sequelize.DATE, allowNull: false },
    verified_at: { type: Sequelize.DATE, allowNull: true },
    consumed_at: { type: Sequelize.DATE, allowNull: true },
    device_token: { type: Sequelize.STRING(255), allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_otp_verifications', ['country_code', 'mobile', 'purpose', 'created_at'], { name: 'idx_tbl_otp_mobile_purpose_created' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_otp_verifications');
