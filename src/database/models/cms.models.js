import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

const audience = { type: DataTypes.ENUM('all', 'user', 'driver'), allowNull: false, defaultValue: 'all' };
const sortOrder = { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'sort_order' };

export class CmsPage extends Model {}
CmsPage.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(120), allowNull: false },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    content: { type: DataTypes.TEXT('medium'), allowNull: false },
    audience,
    status: { type: DataTypes.ENUM('published', 'draft'), allowNull: false, defaultValue: 'draft' },
    sortOrder,
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'updated_by' }
  },
  { sequelize, modelName: 'CmsPage', tableName: 'tbl_cms_pages' }
);

export class Faq extends Model {}
Faq.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    question: { type: DataTypes.STRING(255), allowNull: false },
    answer: { type: DataTypes.TEXT, allowNull: false },
    category: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'General' },
    audience,
    status: { type: DataTypes.ENUM('published', 'draft'), allowNull: false, defaultValue: 'published' },
    sortOrder
  },
  { sequelize, modelName: 'Faq', tableName: 'tbl_faqs' }
);

export class SupportContact extends Model {}
SupportContact.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    type: { type: DataTypes.ENUM('phone', 'whatsapp', 'email', 'address', 'website', 'hours'), allowNull: false },
    label: { type: DataTypes.STRING(60), allowNull: false },
    value: { type: DataTypes.STRING(255), allowNull: false },
    audience,
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    sortOrder
  },
  { sequelize, modelName: 'SupportContact', tableName: 'tbl_support_contacts' }
);
