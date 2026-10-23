import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class ServiceVehicleType extends Model {}

ServiceVehicleType.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    serviceId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'service_id' },
    vehicleTypeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'vehicle_type_id' }
  },
  { sequelize, modelName: 'ServiceVehicleType', tableName: 'tbl_service_vehicle_types' }
);
