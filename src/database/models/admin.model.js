import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Admin extends Model {}

Admin.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    mobile: { type: DataTypes.STRING(10), allowNull: true, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
    profilePicture: { type: DataTypes.STRING(500), allowNull: true, field: 'profile_picture' },
    role: { type: DataTypes.ENUM('super_admin', 'operations', 'support'), allowNull: false, defaultValue: 'operations' },
    status: { type: DataTypes.ENUM('active', 'inactive', 'blocked'), allowNull: false, defaultValue: 'active' },
    twoFactorEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'two_factor_enabled' },
    twoFactorMethod: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'email', field: 'two_factor_method' },
    passwordChangedAt: { type: DataTypes.DATE, allowNull: true, field: 'password_changed_at' },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' }
  },
  { sequelize, modelName: 'Admin', tableName: 'tbl_admins' }
);
