// BOOK-01 fields: promo amounts, the fare the app showed, round-trip return, pickup instruction, booking for
// someone else; and for parcels the goods type, quantity and receiver instruction.
export const up = async ({ queryInterface, Sequelize }) => {
  const bookingColumns = {
    coupon_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'tbl_coupons', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    // Fare before the promo; estimated_amount stays the payable fare after it.
    subtotal_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
    promo_discount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    // What the app showed from ETA; kept to look into fare questions later.
    request_eta_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
    return_at: { type: Sequelize.DATE, allowNull: true },
    pickup_instruction: { type: Sequelize.STRING(255), allowNull: true },
    book_for_other: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    other_contact_name: { type: Sequelize.STRING(80), allowNull: true },
    other_contact_mobile: { type: Sequelize.STRING(15), allowNull: true }
  };
  for (const [column, definition] of Object.entries(bookingColumns)) await queryInterface.addColumn('tbl_bookings', column, definition);

  const parcelColumns = {
    parcel_type: { type: Sequelize.ENUM('send', 'receive'), allowNull: false, defaultValue: 'send' },
    goods_type_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true, references: { model: 'tbl_goods_types', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    goods_quantity: { type: Sequelize.STRING(40), allowNull: true },
    receiver_instruction: { type: Sequelize.STRING(255), allowNull: true }
  };
  for (const [column, definition] of Object.entries(parcelColumns)) await queryInterface.addColumn('tbl_booking_parcels', column, definition);
};

export const down = async ({ queryInterface }) => {
  for (const column of ['receiver_instruction', 'goods_quantity', 'goods_type_id', 'parcel_type']) await queryInterface.removeColumn('tbl_booking_parcels', column);
  for (const column of ['other_contact_mobile', 'other_contact_name', 'book_for_other', 'pickup_instruction', 'return_at', 'request_eta_amount', 'promo_discount', 'subtotal_amount', 'coupon_id']) {
    await queryInterface.removeColumn('tbl_bookings', column);
  }
};
