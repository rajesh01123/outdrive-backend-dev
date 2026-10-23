import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class VehicleType extends Model {}

VehicleType.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(60), allowNull: false },
    typeKey: { type: DataTypes.STRING(40), allowNull: false, unique: true, field: 'type_key' },
    icon: { type: DataTypes.STRING(255), allowNull: true },
    description: { type: DataTypes.STRING(200), allowNull: true },
    capacity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    isShared: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_shared' },
    useFor: { type: DataTypes.ENUM('ride', 'parcel', 'both'), allowNull: false, defaultValue: 'ride', field: 'use_for' },
    wheels: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 4 },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'sort_order' },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' }
  },
  { sequelize, modelName: 'VehicleType', tableName: 'tbl_vehicle_types' }
);
