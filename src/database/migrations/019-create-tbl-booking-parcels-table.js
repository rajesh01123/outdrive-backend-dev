export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('tbl_booking_parcels', {
    id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    booking_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true, references: { model: 'tbl_bookings', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    sender_name: { type: Sequelize.STRING(80), allowNull: false },
    sender_mobile: { type: Sequelize.STRING(15), allowNull: false },
    receiver_name: { type: Sequelize.STRING(80), allowNull: false },
    receiver_mobile: { type: Sequelize.STRING(15), allowNull: false },
    goods_description: { type: Sequelize.STRING(255), allowNull: false },
    paid_at: { type: Sequelize.ENUM('sender', 'receiver'), allowNull: false, defaultValue: 'sender' },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
};

export const down = (queryInterface) => queryInterface.dropTable('tbl_booking_parcels');
