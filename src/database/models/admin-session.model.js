import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class AdminSession extends Model {}

AdminSession.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    adminId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'admin_id' },
    deviceId: { type: DataTypes.STRING(128), allowNull: false, field: 'device_id' },
    deviceName: { type: DataTypes.STRING(255), allowNull: true, field: 'device_name' },
    userAgent: { type: DataTypes.STRING(500), allowNull: true, field: 'user_agent' },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true, field: 'ip_address' },
    tokenJti: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'token_jti' },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, field: 'token_hash' },
    lastActiveAt: { type: DataTypes.DATE, allowNull: false, field: 'last_active_at' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    revokedAt: { type: DataTypes.DATE, allowNull: true, field: 'revoked_at' }
  },
  { sequelize, modelName: 'AdminSession', tableName: 'tbl_admin_sessions' }
);
