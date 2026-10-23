export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_support_contacts', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    // Decides the action button: call, WhatsApp chat, email, map, website, or plain text (hours).
    type: { type: Sequelize.ENUM('phone', 'whatsapp', 'email', 'address', 'website', 'hours'), allowNull: false },
    label: { type: Sequelize.STRING(60), allowNull: false },
    value: { type: Sequelize.STRING(255), allowNull: false },
    audience: { type: Sequelize.ENUM('all', 'user', 'driver'), allowNull: false, defaultValue: 'all' },
    status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_support_contacts');
