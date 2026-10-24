import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { jsonColumn } from './json-column.js';

export class AdminRole extends Model {}

AdminRole.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(200), allowNull: true },
    permissions: jsonColumn('permissions'),
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_system' },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'created_by' }
  },
  { sequelize, modelName: 'AdminRole', tableName: 'tbl_admin_roles' }
);
