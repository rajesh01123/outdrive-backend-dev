// Read-only activity history: who did what, when and from where. No foreign keys, so a log stays readable
// after the admin, user or record it mentions is deleted.
export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_audit_logs', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    actor_type: { type: Sequelize.ENUM('admin', 'user', 'driver', 'system'), allowNull: false },
    actor_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    // Name and role as they were at the time of the action.
    actor_name: { type: Sequelize.STRING(120), allowNull: true },
    actor_role: { type: Sequelize.STRING(40), allowNull: true },
    action: { type: Sequelize.STRING(60), allowNull: false },
    module: { type: Sequelize.STRING(40), allowNull: false },
    target_type: { type: Sequelize.STRING(40), allowNull: true },
    target_id: { type: Sequelize.STRING(64), allowNull: true },
    target_label: { type: Sequelize.STRING(160), allowNull: true },
    description: { type: Sequelize.STRING(255), allowNull: false },
    // JSON { field: { from, to } } of the fields that changed; never passwords, OTPs or tokens.
    changes: { type: Sequelize.TEXT, allowNull: true },
    status: { type: Sequelize.ENUM('success', 'failed'), allowNull: false, defaultValue: 'success' },
    ip_address: { type: Sequelize.STRING(45), allowNull: true },
    user_agent: { type: Sequelize.STRING(255), allowNull: true },
    device: { type: Sequelize.STRING(120), allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_audit_logs', ['created_at'], { name: 'idx_audit_logs_created_at' });
  await queryInterface.addIndex('tbl_audit_logs', ['actor_type', 'actor_id', 'created_at'], { name: 'idx_audit_logs_actor' });
  await queryInterface.addIndex('tbl_audit_logs', ['action', 'created_at'], { name: 'idx_audit_logs_action' });
  await queryInterface.addIndex('tbl_audit_logs', ['module', 'created_at'], { name: 'idx_audit_logs_module' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_audit_logs');
