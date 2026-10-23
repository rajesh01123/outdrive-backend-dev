import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { jsonColumn } from './json-column.js';

export class FareHistory extends Model {}

FareHistory.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    fareId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'fare_id' },
    adminId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'admin_id' },
    action: { type: DataTypes.ENUM('created', 'updated', 'copied', 'status_changed'), allowNull: false },
    oldValues: jsonColumn('oldValues', { field: 'old_values', allowNull: true }),
    newValues: jsonColumn('newValues', { field: 'new_values' })
  },
  { sequelize, modelName: 'FareHistory', tableName: 'tbl_fare_histories' }
);
