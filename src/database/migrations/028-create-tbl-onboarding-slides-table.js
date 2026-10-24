// HOME-09: the slides the app shows on first launch. Hindi text is optional; the app falls back to English.
export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_onboarding_slides', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: Sequelize.STRING(80), allowNull: false },
    description: { type: Sequelize.STRING(200), allowNull: true },
    title_hi: { type: Sequelize.STRING(80), allowNull: true },
    description_hi: { type: Sequelize.STRING(200), allowNull: true },
    image: { type: Sequelize.STRING(255), allowNull: false },
    sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_onboarding_slides', ['status', 'sort_order'], { name: 'idx_onboarding_slides_status_order' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_onboarding_slides');
