// Admin roles become rows with a permission list (Roles page) instead of the fixed super_admin / operations / support ENUM.
// The three old roles are created here with the access they had, so every existing admin keeps the same rights.
// Permission keys are copied as they are today on purpose: a migration must not change when the code changes.
const OPERATIONS = [
  'bookings.view', 'bookings.manage', 'users.view', 'users.manage', 'services.view', 'services.manage',
  'zones.view', 'zones.manage', 'vehicles.view', 'vehicles.manage', 'fares.view',
  'banners.view', 'banners.manage', 'content.view', 'content.manage', 'coupons.view', 'coupons.manage'
];
const SUPPORT = ['bookings.view', 'users.view', 'services.view', 'zones.view', 'vehicles.view', 'fares.view', 'banners.view', 'content.view', 'coupons.view'];
const ROLE_IDS = { super_admin: 1, operations: 2, support: 3 };

export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_admin_roles', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: Sequelize.STRING(60), allowNull: false, unique: true },
    description: { type: Sequelize.STRING(200), allowNull: true },
    // JSON array of permission keys ("zones.manage"); ["*"] = everything (Super Admin).
    permissions: { type: Sequelize.TEXT, allowNull: false },
    // The Super Admin role: it cannot be edited, switched off or deleted.
    is_system: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'tbl_admins', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });

  const now = new Date();
  await queryInterface.bulkInsert('tbl_admin_roles', [
    { id: ROLE_IDS.super_admin, name: 'Super Admin', description: 'Full access to everything, including staff and roles.', permissions: JSON.stringify(['*']), is_system: true, status: 'active', created_at: now, updated_at: now },
    { id: ROLE_IDS.operations, name: 'Operations', description: 'Runs day-to-day operations. Can view fares but not change them.', permissions: JSON.stringify(OPERATIONS), is_system: false, status: 'active', created_at: now, updated_at: now },
    { id: ROLE_IDS.support, name: 'Support', description: 'Helps customers. Can view everything but change nothing.', permissions: JSON.stringify(SUPPORT), is_system: false, status: 'active', created_at: now, updated_at: now }
  ]);

  await queryInterface.addColumn('tbl_admins', 'role_id', { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, after: 'profile_picture' });
  await queryInterface.sequelize.query(
    `UPDATE tbl_admins SET role_id = CASE role WHEN 'super_admin' THEN ${ROLE_IDS.super_admin} WHEN 'operations' THEN ${ROLE_IDS.operations} ELSE ${ROLE_IDS.support} END`
  );
  await queryInterface.sequelize.query('ALTER TABLE tbl_admins MODIFY role_id BIGINT UNSIGNED NOT NULL');
  // A role that still has staff cannot be deleted.
  await queryInterface.addConstraint('tbl_admins', {
    fields: ['role_id'], type: 'foreign key', name: 'fk_tbl_admins_role_id',
    references: { table: 'tbl_admin_roles', field: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE'
  });
  await queryInterface.removeColumn('tbl_admins', 'role');

  await queryInterface.addColumn('tbl_admins', 'address', { type: Sequelize.STRING(255), allowNull: true, after: 'role_id' });
  // Set when an admin creates the account or resets its password: the staff member must choose their own at next sign-in.
  await queryInterface.addColumn('tbl_admins', 'must_change_password', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'password_changed_at' });
};

export const down = async ({ queryInterface, Sequelize }) => {
  await queryInterface.removeColumn('tbl_admins', 'must_change_password');
  await queryInterface.removeColumn('tbl_admins', 'address');
  await queryInterface.addColumn('tbl_admins', 'role', { type: Sequelize.ENUM('super_admin', 'operations', 'support'), allowNull: false, defaultValue: 'operations', after: 'profile_picture' });
  // Roles added on the Roles page fall back to support, the role with the least access.
  await queryInterface.sequelize.query(
    `UPDATE tbl_admins SET role = CASE role_id WHEN ${ROLE_IDS.super_admin} THEN 'super_admin' WHEN ${ROLE_IDS.operations} THEN 'operations' ELSE 'support' END`
  );
  await queryInterface.removeConstraint('tbl_admins', 'fk_tbl_admins_role_id');
  await queryInterface.removeColumn('tbl_admins', 'role_id');
  await queryInterface.dropTable('tbl_admin_roles');
};
