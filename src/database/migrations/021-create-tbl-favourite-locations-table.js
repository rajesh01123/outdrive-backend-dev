export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_favourite_locations', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'tbl_users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    address_name: { type: Sequelize.STRING(40), allowNull: false },
    // Lower-cased name: "Home" and "home" are the same favourite (upsert key).
    name_key: { type: Sequelize.STRING(40), allowNull: false },
    pick_lat: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
    pick_lng: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
    pick_address: { type: Sequelize.STRING(255), allowNull: false },
    landmark: { type: Sequelize.STRING(120), allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_favourite_locations', ['user_id', 'name_key'], { unique: true, name: 'uniq_tbl_favourite_locations_user_name' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_favourite_locations');
