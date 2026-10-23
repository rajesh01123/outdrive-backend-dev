export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_cms_pages', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: Sequelize.STRING(120), allowNull: false },
    // Part of the public URL (/pages/<slug>); locked after create so links in the app never break.
    slug: { type: Sequelize.STRING(80), allowNull: false, unique: true },
    // Sanitized HTML from the admin rich-text editor.
    content: { type: Sequelize.TEXT('medium'), allowNull: false },
    audience: { type: Sequelize.ENUM('all', 'user', 'driver'), allowNull: false, defaultValue: 'all' },
    status: { type: Sequelize.ENUM('published', 'draft'), allowNull: false, defaultValue: 'draft' },
    sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    updated_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'tbl_admins', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_cms_pages');
