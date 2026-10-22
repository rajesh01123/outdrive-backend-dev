import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class AdminOtpVerification extends Model {}

AdminOtpVerification.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    adminId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'admin_id' },
    email: { type: DataTypes.STRING(150), allowNull: false },
    purpose: { type: DataTypes.ENUM('login_2fa', 'enable_2fa', 'disable_2fa', 'forgot_password'), allowNull: false },
    otpHash: { type: DataTypes.STRING(255), allowNull: false, field: 'otp_hash' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    attempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    maxAttempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 5, field: 'max_attempts' },
    status: { type: DataTypes.ENUM('pending', 'used', 'expired', 'locked'), allowNull: false, defaultValue: 'pending' },
    usedAt: { type: DataTypes.DATE, allowNull: true, field: 'used_at' }
  },
  { sequelize, modelName: 'AdminOtpVerification', tableName: 'tbl_admin_otp_verifications' }
);
