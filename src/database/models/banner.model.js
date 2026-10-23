import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Banner extends Model {}

Banner.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(80), allowNull: false },
    subtitle: { type: DataTypes.STRING(120), allowNull: true },
    image: { type: DataTypes.STRING(255), allowNull: false },
    moduleKey: { type: DataTypes.STRING(40), allowNull: true, field: 'module_key' },
    linkType: { type: DataTypes.ENUM('none', 'module', 'url'), allowNull: false, defaultValue: 'none', field: 'link_type' },
    linkValue: { type: DataTypes.STRING(500), allowNull: true, field: 'link_value' },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'sort_order' },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    startsAt: { type: DataTypes.DATE, allowNull: true, field: 'starts_at' },
    endsAt: { type: DataTypes.DATE, allowNull: true, field: 'ends_at' }
  },
  { sequelize, modelName: 'Banner', tableName: 'tbl_banners' }
);
