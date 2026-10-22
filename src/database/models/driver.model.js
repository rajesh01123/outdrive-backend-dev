import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Driver extends Model {}

Driver.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    mobile: { type: DataTypes.STRING(10), allowNull: false },
    countryCode: { type: DataTypes.STRING(4), allowNull: false, defaultValue: '91', field: 'country_code' },
    profilePicture: { type: DataTypes.STRING(255), allowNull: true, field: 'profile_picture' },
    status: { type: DataTypes.ENUM('active', 'blocked', 'inactive'), allowNull: false, defaultValue: 'inactive' },
    approvalStatus: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending', field: 'approval_status' },
    isOnline: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_online' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' }
  },
  { sequelize, modelName: 'Driver', tableName: 'tbl_drivers', paranoid: true, deletedAt: 'deletedAt' }
);
