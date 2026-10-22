import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Service extends Model {}

Service.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(60), allowNull: false },
    slug: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    subtitle: { type: DataTypes.STRING(120), allowNull: true },
    image: { type: DataTypes.STRING(255), allowNull: true },
    serviceType: { type: DataTypes.ENUM('ride', 'parcel'), allowNull: false, defaultValue: 'ride', field: 'service_type' },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'sort_order' },
    status: { type: DataTypes.ENUM('active', 'coming_soon', 'inactive'), allowNull: false, defaultValue: 'inactive' }
  },
  { sequelize, modelName: 'Service', tableName: 'tbl_services' }
);
