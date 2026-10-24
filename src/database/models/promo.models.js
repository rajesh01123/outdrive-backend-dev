import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { jsonColumn } from './json-column.js';

export class OnboardingSlide extends Model {}
OnboardingSlide.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(80), allowNull: false },
    description: { type: DataTypes.STRING(200), allowNull: true },
    titleHi: { type: DataTypes.STRING(80), allowNull: true, field: 'title_hi' },
    descriptionHi: { type: DataTypes.STRING(200), allowNull: true, field: 'description_hi' },
    image: { type: DataTypes.STRING(255), allowNull: false },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'sort_order' },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' }
  },
  { sequelize, modelName: 'OnboardingSlide', tableName: 'tbl_onboarding_slides' }
);

export class Coupon extends Model {}
Coupon.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(80), allowNull: false },
    description: { type: DataTypes.STRING(200), allowNull: true },
    discountType: { type: DataTypes.ENUM('flat', 'percent'), allowNull: false, field: 'discount_type' },
    discountValue: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'discount_value' },
    minTripAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'min_trip_amount' },
    maxDiscountAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'max_discount_amount' },
    usesPerUser: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1, field: 'uses_per_user' },
    totalUsesLimit: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'total_uses_limit' },
    moduleKeys: jsonColumn('moduleKeys', { field: 'module_keys', allowNull: true }),
    zoneIds: jsonColumn('zoneIds', { field: 'zone_ids', allowNull: true }),
    startsAt: { type: DataTypes.DATE, allowNull: true, field: 'starts_at' },
    endsAt: { type: DataTypes.DATE, allowNull: true, field: 'ends_at' },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' }
  },
  { sequelize, modelName: 'Coupon', tableName: 'tbl_coupons' }
);
