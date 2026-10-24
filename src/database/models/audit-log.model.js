import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { jsonColumn } from './json-column.js';

export class AuditLog extends Model {}
AuditLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    actorType: { type: DataTypes.ENUM('admin', 'user', 'driver', 'system'), allowNull: false, field: 'actor_type' },
    actorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'actor_id' },
    actorName: { type: DataTypes.STRING(120), allowNull: true, field: 'actor_name' },
    actorRole: { type: DataTypes.STRING(40), allowNull: true, field: 'actor_role' },
    action: { type: DataTypes.STRING(60), allowNull: false },
    module: { type: DataTypes.STRING(40), allowNull: false },
    targetType: { type: DataTypes.STRING(40), allowNull: true, field: 'target_type' },
    targetId: { type: DataTypes.STRING(64), allowNull: true, field: 'target_id' },
    targetLabel: { type: DataTypes.STRING(160), allowNull: true, field: 'target_label' },
    description: { type: DataTypes.STRING(255), allowNull: false },
    changes: jsonColumn('changes', { allowNull: true }),
    status: { type: DataTypes.ENUM('success', 'failed'), allowNull: false, defaultValue: 'success' },
    ipAddress: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_address' },
    userAgent: { type: DataTypes.STRING(255), allowNull: true, field: 'user_agent' },
    device: { type: DataTypes.STRING(120), allowNull: true }
  },
  // Logs are never edited, so there is no updated_at.
  { sequelize, modelName: 'AuditLog', tableName: 'tbl_audit_logs', updatedAt: false }
);
