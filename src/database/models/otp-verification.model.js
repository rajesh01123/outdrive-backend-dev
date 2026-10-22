import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class OtpVerification extends Model {}

OtpVerification.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    mobile: { type: DataTypes.STRING(10), allowNull: false },
    countryCode: { type: DataTypes.STRING(4), allowNull: false, field: 'country_code' },
    purpose: { type: DataTypes.ENUM('login', 'signup', 'delete_account'), allowNull: false },
    otpHash: { type: DataTypes.STRING(255), allowNull: false, field: 'otp_hash' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    attempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    maxAttempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 5, field: 'max_attempts' },
    status: { type: DataTypes.ENUM('pending', 'verified', 'used', 'expired', 'locked'), allowNull: false, defaultValue: 'pending' },
    sentAt: { type: DataTypes.DATE, allowNull: false, field: 'sent_at' },
    verifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'verified_at' },
    consumedAt: { type: DataTypes.DATE, allowNull: true, field: 'consumed_at' },
    deviceToken: { type: DataTypes.STRING(255), allowNull: true, field: 'device_token' }
  },
  { sequelize, modelName: 'OtpVerification', tableName: 'tbl_otp_verifications' }
);
