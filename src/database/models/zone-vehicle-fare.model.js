import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class ZoneVehicleFare extends Model {}

const money = (field) => ({ type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field });

ZoneVehicleFare.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    zoneId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'zone_id' },
    vehicleTypeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'vehicle_type_id' },
    fareCategory: { type: DataTypes.ENUM('city', 'shared', 'outstation', 'parcel'), allowNull: false, field: 'fare_category' },
    basePrice: money('base_price'),
    baseDistanceKm: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'base_distance_km' },
    pricePerKm: money('price_per_km'),
    freeMinutes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'free_minutes' },
    pricePerMin: money('price_per_min'),
    minFare: money('min_fare'),
    taxPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, field: 'tax_percent' },
    freeWaitingMins: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'free_waiting_mins' },
    waitingChargePerMin: money('waiting_charge_per_min'),
    paymentTypes: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'cash,wallet,online', field: 'payment_types' },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_default' },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' }
  },
  { sequelize, modelName: 'ZoneVehicleFare', tableName: 'tbl_zone_vehicle_fares' }
);
