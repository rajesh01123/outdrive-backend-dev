export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_zones', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: Sequelize.STRING(80), allowNull: false, unique: true },
    // GeoJSON Polygon stored as text so it works on both MySQL and MariaDB.
    polygon: { type: Sequelize.TEXT, allowNull: false },
    // Bounding box of the polygon, used to shortlist zones before the exact point-in-polygon test.
    min_lat: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
    max_lat: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
    min_lng: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
    max_lng: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
    priority: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
  await queryInterface.addIndex('tbl_zones', ['status', 'min_lat', 'max_lat'], { name: 'idx_tbl_zones_status_lat' });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_zones');
