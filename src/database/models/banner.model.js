import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

// A banner is an image for the user app or the driver app, shown in admin order.
export class Banner extends Model {}

Banner.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    image: { type: DataTypes.STRING(255), allowNull: false },
    type: { type: DataTypes.ENUM('user', 'driver'), allowNull: false, defaultValue: 'user' },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'sort_order' }
  },
  { sequelize, modelName: 'Banner', tableName: 'tbl_banners' }
);
