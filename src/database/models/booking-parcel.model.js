import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class BookingParcel extends Model {}

BookingParcel.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    bookingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true, field: 'booking_id' },
    senderName: { type: DataTypes.STRING(80), allowNull: false, field: 'sender_name' },
    senderMobile: { type: DataTypes.STRING(15), allowNull: false, field: 'sender_mobile' },
    receiverName: { type: DataTypes.STRING(80), allowNull: false, field: 'receiver_name' },
    receiverMobile: { type: DataTypes.STRING(15), allowNull: false, field: 'receiver_mobile' },
    goodsDescription: { type: DataTypes.STRING(255), allowNull: false, field: 'goods_description' },
    paidAt: { type: DataTypes.ENUM('sender', 'receiver'), allowNull: false, defaultValue: 'sender', field: 'paid_at' },
    parcelType: { type: DataTypes.ENUM('send', 'receive'), allowNull: false, defaultValue: 'send', field: 'parcel_type' },
    goodsTypeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'goods_type_id' },
    goodsQuantity: { type: DataTypes.STRING(40), allowNull: true, field: 'goods_quantity' },
    receiverInstruction: { type: DataTypes.STRING(255), allowNull: true, field: 'receiver_instruction' }
  },
  { sequelize, modelName: 'BookingParcel', tableName: 'tbl_booking_parcels' }
);
