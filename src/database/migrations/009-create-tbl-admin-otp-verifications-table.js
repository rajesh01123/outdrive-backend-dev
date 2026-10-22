export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_admin_otp_verifications', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    admin_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_admins', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    email: { type: Sequelize.STRING(150), allowNull: false },
    purpose: { type: Sequelize.ENUM('login_2fa', 'enable_2fa', 'disable_2fa', 'forgot_password'), allowNull: false },
    otp_hash: { type: Sequelize.STRING(255), allowNull: false },
    expires_at: { type: Sequelize.DATE, allowNull: false },
    attempts: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    max_attempts: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 5 },
    status: { type: Sequelize.ENUM('pending', 'used', 'expired', 'locked'), allowNull: false, defaultValue: 'pending' },
    used_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_admin_otp_verifications', ['admin_id', 'purpose', 'created_at'], { name: 'idx_tbl_admin_otp_purpose' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_admin_otp_verifications');
