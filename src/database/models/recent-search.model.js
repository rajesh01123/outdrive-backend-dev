import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { jsonColumn } from './json-column.js';

export class RecentSearch extends Model {}

const coordinate = (field) => ({ type: DataTypes.DECIMAL(10, 7), allowNull: false, field });
const text = (length, field) => ({ type: DataTypes.STRING(length), allowNull: true, field });

RecentSearch.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    pickLat: coordinate('pick_lat'),
    pickLng: coordinate('pick_lng'),
    dropLat: coordinate('drop_lat'),
    dropLng: coordinate('drop_lng'),
    pickAddress: { type: DataTypes.STRING(255), allowNull: false, field: 'pick_address' },
    pickShortAddress: text(120, 'pick_short_address'),
    dropAddress: { type: DataTypes.STRING(255), allowNull: false, field: 'drop_address' },
    dropShortAddress: text(120, 'drop_short_address'),
    pickupPocName: text(80, 'pickup_poc_name'),
    pickupPocMobile: text(15, 'pickup_poc_mobile'),
    pickupPocInstruction: text(255, 'pickup_poc_instruction'),
    dropPocName: text(80, 'drop_poc_name'),
    dropPocMobile: text(15, 'drop_poc_mobile'),
    dropPocInstruction: text(255, 'drop_poc_instruction'),
    totalDistance: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'total_distance' },
    totalTime: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'total_time' },
    polyLine: { type: DataTypes.TEXT, allowNull: true, field: 'poly_line' },
    transportType: { type: DataTypes.ENUM('taxi', 'delivery'), allowNull: false, defaultValue: 'taxi', field: 'transport_type' },
    moduleKey: text(40, 'module_key'),
    stops: jsonColumn('stops', { allowNull: true }),
    searchedAt: { type: DataTypes.DATE, allowNull: false, field: 'searched_at' }
  },
  { sequelize, modelName: 'RecentSearch', tableName: 'tbl_recent_searches' }
);
