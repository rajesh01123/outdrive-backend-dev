import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class UserSession extends Model {}

UserSession.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    deviceToken: { type: DataTypes.STRING(255), allowNull: false, field: 'device_token' },
    loginBy: { type: DataTypes.ENUM('android', 'ios'), allowNull: false, field: 'login_by' },
    tokenJti: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'token_jti' },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, field: 'token_hash' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    revokedAt: { type: DataTypes.DATE, allowNull: true, field: 'revoked_at' }
  },
  { sequelize, modelName: 'UserSession', tableName: 'tbl_user_sessions' }
);
