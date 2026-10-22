import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Device extends Model {}

Device.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'user_id' },
    deviceToken: { type: DataTypes.STRING(255), allowNull: false, unique: true, field: 'device_token' },
    platform: { type: DataTypes.ENUM('android', 'ios'), allowNull: false },
    lastSeenAt: { type: DataTypes.DATE, allowNull: false, field: 'last_seen_at' }
  },
  { sequelize, modelName: 'Device', tableName: 'tbl_devices' }
);
