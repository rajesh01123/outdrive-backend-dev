export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_admin_sessions', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    admin_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_admins', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    device_id: { type: Sequelize.STRING(128), allowNull: false },
    device_name: { type: Sequelize.STRING(255), allowNull: true },
    user_agent: { type: Sequelize.STRING(500), allowNull: true },
    ip_address: { type: Sequelize.STRING(64), allowNull: true },
    token_jti: { type: Sequelize.STRING(64), allowNull: false, unique: true },
    token_hash: { type: Sequelize.STRING(64), allowNull: false },
    last_active_at: { type: Sequelize.DATE, allowNull: false },
    expires_at: { type: Sequelize.DATE, allowNull: false },
    revoked_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_admin_sessions', ['admin_id', 'revoked_at', 'expires_at'], { name: 'idx_tbl_admin_sessions_active' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_admin_sessions');
