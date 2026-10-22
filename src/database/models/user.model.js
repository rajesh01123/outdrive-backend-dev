import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class User extends Model {}

User.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    mobile: { type: DataTypes.STRING(10), allowNull: false },
    countryCode: { type: DataTypes.STRING(4), allowNull: false, defaultValue: '91', field: 'country_code' },
    profilePicture: { type: DataTypes.STRING(255), allowNull: true, field: 'profile_picture' },
    gender: { type: DataTypes.ENUM('male', 'female', 'others'), allowNull: true },
    mapType: { type: DataTypes.STRING(30), allowNull: true, field: 'map_type' },
    walletBalance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'wallet_balance' },
    emergencyContactName: { type: DataTypes.STRING(80), allowNull: true, field: 'emergency_contact_name' },
    emergencyContactNumber: { type: DataTypes.STRING(15), allowNull: true, field: 'emergency_contact_number' },
    locale: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'en' },
    status: { type: DataTypes.ENUM('active', 'blocked', 'deleted'), allowNull: false, defaultValue: 'active' },
    deleteReason: { type: DataTypes.STRING(500), allowNull: true, field: 'delete_reason' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'tbl_users',
    paranoid: true,
    deletedAt: 'deletedAt'
  }
);
