import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

// What a parcel holds; parcel bookings keep the goods type id and a copy of its name.
export class GoodsType extends Model {}

GoodsType.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    icon: { type: DataTypes.STRING(255), allowNull: true },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'sort_order' },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' }
  },
  { sequelize, modelName: 'GoodsType', tableName: 'tbl_goods_types' }
);
