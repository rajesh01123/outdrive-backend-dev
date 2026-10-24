import { Op } from 'sequelize';
import { env } from '../../config/env.js';
import { AuditLog } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { currentRequest } from '../../shared/utils/request-context.js';
import { actionLabel, actionModule, AUDIT_ACTIONS, AUDIT_MODULES } from './audit.actions.js';

export const AUDIT_ACTOR_TYPES = ['admin', 'user', 'driver', 'system'];
export const AUDIT_STATUSES = ['success', 'failed'];

// Field names that must never reach a log, even by mistake (password_hash, otp, access_token…).
const SECRET_FIELD = /(^|[^a-z])(password|passcode|otp|token|secret|hash)/i;
const DAY_MS = 24 * 60 * 60 * 1000;
const PRUNE_BATCH = 5000;

const clip = (value, max) => (value === null || value === undefined || value === '' ? null : String(value).slice(0, max));

/** 9977112912 → 99******12 */
export const maskMobile = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length < 6 ? '******' : `${digits.slice(0, 2)}${'*'.repeat(digits.length - 4)}${digits.slice(-2)}`;
};

/** admin@outdrive.local → ad***@outdrive.local */
export const maskEmail = (email) => {
  const [name = '', domain] = String(email || '').split('@');
  return domain ? `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}` : '';
};

// The role name is stored as it is at the time, so renaming or deleting a role never rewrites old logs.
export const adminActor = (admin) => ({ type: 'admin', id: admin.id, name: admin.name || maskEmail(admin.email), role: admin.adminRole?.name || null });
export const userActor = (user) => ({ type: 'user', id: user.id, name: user.name || maskMobile(user.mobile) });

const SYSTEM_ACTOR = { type: 'system', id: null, name: 'System' };

const requestActor = (req) => {
  if (req?.admin) return adminActor(req.admin);
  if (req?.driver) return { type: 'driver', id: req.driver.id, name: req.driver.name || maskMobile(req.driver.mobile) };
  if (req?.user) return userActor(req.user);
  return null;
};

const requestMeta = (req) => (req ? {
  // "::ffff:1.2.3.4" is an IPv4 address seen through IPv6; store the plain form.
  ipAddress: clip(String(req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, ''), 45),
  userAgent: clip(req.get?.('user-agent'), 255),
  device: clip(req.adminAuth?.deviceName || req.body?.device_name, 120)
} : {});

const isNumeric = (value) => (typeof value === 'number' || (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)));
const sameValue = (a, b) => a === b || (isNumeric(a) && isNumeric(b) && Number(a) === Number(b));

const comparable = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'object' ? JSON.stringify(value) : value;
};

// Stored values are cut to 300 characters; the comparison above always uses the full value.
const logValue = (value) => {
  const plain = comparable(value);
  if (plain === null || typeof plain === 'number' || typeof plain === 'boolean') return plain;
  const text = String(plain);
  return text.length > 300 ? `${text.slice(0, 299)}…` : text;
};

/** The listed fields that differ between two payloads, as { field: { from, to } }; null when nothing changed. */
export const diffChanges = (before, after, fields) => {
  const changes = {};
  for (const field of fields) {
    const from = comparable(before?.[field]);
    const to = comparable(after?.[field]);
    if (!sameValue(from, to)) changes[field] = { from: logValue(from), to: logValue(to) };
  }
  return Object.keys(changes).length ? changes : null;
};

/** Names of the changed fields for a description: "name, status". */
export const changedFields = (changes) => Object.keys(changes || {}).map((field) => field.replace(/_/g, ' ')).join(', ');

const safeChanges = (changes) => {
  if (!changes || typeof changes !== 'object') return null;
  const safe = {};
  for (const [field, change] of Object.entries(changes)) {
    if (SECRET_FIELD.test(field)) continue;
    safe[field] = { from: logValue(change?.from), to: logValue(change?.to) };
  }
  return Object.keys(safe).length ? safe : null;
};

let lastSaveError = 0;
const save = (row) => AuditLog.create(row).catch((error) => {
  // Report at most once a minute, so a missing table cannot flood the server log.
  if (Date.now() - lastSaveError < 60_000) return;
  lastSaveError = Date.now();
  console.error(`[audit] could not save "${row.action}": ${error.message}`);
});

/**
 * Records one activity. Never throws and never makes the caller wait: the row is saved in the background.
 * The actor, IP and device come from the current request unless `actor` is given (logins, failed logins).
 * With `transaction`, the row is saved only after that transaction commits, so a rolled-back change is never logged.
 */
export const recordAudit = ({ action, actor, target, description, changes, status = 'success', device }, { transaction } = {}) => {
  try {
    const req = currentRequest();
    const who = actor || requestActor(req) || SYSTEM_ACTOR;
    const row = {
      actorType: who.type,
      actorId: who.id ?? null,
      actorName: clip(who.name, 120),
      actorRole: clip(who.role, 40),
      action,
      module: actionModule(action) || 'other',
      targetType: clip(target?.type, 40),
      targetId: clip(target?.id, 64),
      targetLabel: clip(target?.label, 160),
      description: clip(description || actionLabel(action), 255),
      changes: safeChanges(changes),
      status,
      ...requestMeta(req),
      ...(device ? { device: clip(device, 120) } : {})
    };
    if (transaction) transaction.afterCommit(() => { save(row); });
    else save(row);
  } catch (error) {
    console.error(`[audit] could not record "${action}": ${error.message}`);
  }
};

const logPayload = (log) => ({
  id: Number(log.id),
  action: log.action,
  action_label: actionLabel(log.action),
  module: log.module,
  module_label: AUDIT_MODULES[log.module] || log.module,
  status: log.status,
  actor: { type: log.actorType, id: log.actorId === null ? null : Number(log.actorId), name: log.actorName || '', role: log.actorRole || '' },
  target: log.targetType ? { type: log.targetType, id: log.targetId, label: log.targetLabel || '' } : null,
  description: log.description,
  changes: log.changes || null,
  ip_address: log.ipAddress || '',
  user_agent: log.userAgent || '',
  device: log.device || '',
  created_at: log.createdAt
});

export const auditFilterOptions = () => ({
  modules: Object.entries(AUDIT_MODULES).map(([key, label]) => ({ key, label })),
  actions: Object.entries(AUDIT_ACTIONS).map(([key, [module, label]]) => ({ key, module, label })),
  actor_types: AUDIT_ACTOR_TYPES,
  statuses: AUDIT_STATUSES
});

const istDayStart = (date) => new Date(`${date}T00:00:00+05:30`);

export const listAuditLogs = async ({ page, limit, search, action, module, actorType, status, date }) => {
  const where = {};
  if (action) where.action = action;
  if (module) where.module = module;
  if (actorType) where.actorType = actorType;
  if (status) where.status = status;
  if (date) where.createdAt = { [Op.gte]: istDayStart(date), [Op.lt]: new Date(istDayStart(date).getTime() + DAY_MS) };
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    where[Op.or] = [{ actorName: { [Op.like]: like } }, { description: { [Op.like]: like } }, { targetLabel: { [Op.like]: like } }];
  }

  const todayStart = istDayStart(new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [{ rows, count }, today, failedToday] = await Promise.all([
    AuditLog.findAndCountAll({ where, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit, offset: (page - 1) * limit }),
    AuditLog.count({ where: { createdAt: { [Op.gte]: todayStart } } }),
    AuditLog.count({ where: { createdAt: { [Op.gte]: todayStart }, status: 'failed' } })
  ]);
  return {
    stats: { today, failed_today: failedToday, retention_days: env.auditLogRetentionDays },
    logs: rows.map(logPayload),
    pagination: { page, limit, total: count, total_pages: Math.max(1, Math.ceil(count / limit)) },
    filters: auditFilterOptions()
  };
};

export const getAuditLog = async (id) => {
  const log = await AuditLog.findByPk(id);
  if (!log) throw new AppError('audit_log_not_found', 404);
  return logPayload(log);
};

/** Deletes logs older than the retention period in small batches, so each DELETE stays short. */
export const pruneAuditLogs = async (days = env.auditLogRetentionDays) => {
  if (!days || days < 1) return 0;
  const cutoff = new Date(Date.now() - days * DAY_MS);
  let removed = 0;
  let batch;
  do {
    batch = await AuditLog.destroy({ where: { createdAt: { [Op.lt]: cutoff } }, limit: PRUNE_BATCH });
    removed += batch;
  } while (batch === PRUNE_BATCH);
  return removed;
};

/** Removes expired logs a minute after start and then once a day. AUDIT_LOG_RETENTION_DAYS=0 keeps everything. */
export const startAuditRetention = () => {
  if (!env.auditLogRetentionDays) return;
  const run = () => pruneAuditLogs()
    .then((removed) => { if (removed) console.info(`[audit] removed ${removed} logs older than ${env.auditLogRetentionDays} days`); })
    .catch((error) => console.error(`[audit] cleanup failed: ${error.message}`));
  setTimeout(run, 60_000).unref();
  setInterval(run, DAY_MS).unref();
};
