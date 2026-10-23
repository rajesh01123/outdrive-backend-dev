export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_faqs', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    question: { type: Sequelize.STRING(255), allowNull: false },
    // Plain text; line breaks are kept when shown.
    answer: { type: Sequelize.TEXT, allowNull: false },
    category: { type: Sequelize.STRING(60), allowNull: false, defaultValue: 'General' },
    audience: { type: Sequelize.ENUM('all', 'user', 'driver'), allowNull: false, defaultValue: 'all' },
    status: { type: Sequelize.ENUM('published', 'draft'), allowNull: false, defaultValue: 'published' },
    sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_faqs', ['status', 'sort_order'], { name: 'idx_tbl_faqs_status_order' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_faqs');
