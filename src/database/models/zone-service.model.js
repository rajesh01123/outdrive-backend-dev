import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class ZoneService extends Model {}

ZoneService.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    zoneId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'zone_id' },
    serviceId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'service_id' },
    isEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_enabled' }
  },
  { sequelize, modelName: 'ZoneService', tableName: 'tbl_zone_services' }
);
