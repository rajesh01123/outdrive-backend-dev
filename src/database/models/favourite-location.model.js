import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class FavouriteLocation extends Model {}

FavouriteLocation.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    addressName: { type: DataTypes.STRING(40), allowNull: false, field: 'address_name' },
    nameKey: { type: DataTypes.STRING(40), allowNull: false, field: 'name_key' },
    pickLat: { type: DataTypes.DECIMAL(10, 7), allowNull: false, field: 'pick_lat' },
    pickLng: { type: DataTypes.DECIMAL(10, 7), allowNull: false, field: 'pick_lng' },
    pickAddress: { type: DataTypes.STRING(255), allowNull: false, field: 'pick_address' },
    landmark: { type: DataTypes.STRING(120), allowNull: true }
  },
  { sequelize, modelName: 'FavouriteLocation', tableName: 'tbl_favourite_locations' }
);
