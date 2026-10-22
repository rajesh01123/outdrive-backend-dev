export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_user_sessions', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    device_token: { type: Sequelize.STRING(255), allowNull: false },
    login_by: { type: Sequelize.ENUM('android', 'ios'), allowNull: false },
    token_jti: { type: Sequelize.STRING(64), allowNull: false, unique: true },
    token_hash: { type: Sequelize.STRING(64), allowNull: false },
    expires_at: { type: Sequelize.DATE, allowNull: false },
    revoked_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_user_sessions', ['user_id', 'device_token', 'revoked_at'], { name: 'idx_tbl_sessions_user_device' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_user_sessions');
