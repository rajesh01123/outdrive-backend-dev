import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Service extends Model {}

Service.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(60), allowNull: false },
    moduleKey: { type: DataTypes.STRING(40), allowNull: false, unique: true, field: 'module_key' },
    shortDescription: { type: DataTypes.STRING(120), allowNull: true, field: 'short_description' },
    description: { type: DataTypes.STRING(500), allowNull: true },
    image: { type: DataTypes.STRING(255), allowNull: true },
    section: { type: DataTypes.ENUM('rides', 'parcel'), allowNull: false, defaultValue: 'rides' },
    transportType: { type: DataTypes.ENUM('taxi', 'delivery'), allowNull: false, defaultValue: 'taxi', field: 'transport_type' },
    serviceType: { type: DataTypes.ENUM('normal', 'shared_ride', 'outstation'), allowNull: false, defaultValue: 'normal', field: 'service_type' },
    iconTypesFor: { type: DataTypes.ENUM('taxi', 'outstation', 'delivery'), allowNull: false, defaultValue: 'taxi', field: 'icon_types_for' },
    cancelPolicyTitle: { type: DataTypes.STRING(120), allowNull: true, field: 'cancel_policy_title' },
    cancelPolicyBody: { type: DataTypes.STRING(1000), allowNull: true, field: 'cancel_policy_body' },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'sort_order' },
    status: { type: DataTypes.ENUM('active', 'coming_soon', 'inactive'), allowNull: false, defaultValue: 'inactive' }
  },
  { sequelize, modelName: 'Service', tableName: 'tbl_services' }
);
