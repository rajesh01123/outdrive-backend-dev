import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { jsonColumn } from './json-column.js';

export class Zone extends Model {}

Zone.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    polygon: jsonColumn('polygon'),
    minLat: { type: DataTypes.DECIMAL(10, 7), allowNull: false, field: 'min_lat' },
    maxLat: { type: DataTypes.DECIMAL(10, 7), allowNull: false, field: 'max_lat' },
    minLng: { type: DataTypes.DECIMAL(10, 7), allowNull: false, field: 'min_lng' },
    maxLng: { type: DataTypes.DECIMAL(10, 7), allowNull: false, field: 'max_lng' },
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' }
  },
  { sequelize, modelName: 'Zone', tableName: 'tbl_zones' }
);
