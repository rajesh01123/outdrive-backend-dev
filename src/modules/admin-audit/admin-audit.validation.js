import { validationError } from '../../middleware/validate.js';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../audit/audit.actions.js';
import { AUDIT_ACTOR_TYPES, AUDIT_STATUSES } from '../audit/audit.service.js';

export const AUDIT_PAGE_LIMIT = 20;

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const positiveInteger = (value, fallback, field, max) => {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || (max && number > max)) {
    validationError(field, max ? `${field} must be between 1 and ${max}` : `${field} must be a positive integer`);
  }
  return number;
};

const oneOf = (query, field, allowed, message) => {
  query[field] = text(query[field]);
  if (query[field] && !allowed.includes(query[field])) validationError(field, message);
};

export const listAuditLogsRequest = (req) => {
  const { query } = req;
  query.page = positiveInteger(query.page, 1, 'page');
  query.limit = positiveInteger(query.limit, AUDIT_PAGE_LIMIT, 'limit', 100);
  query.search = text(query.search).slice(0, 100);
  oneOf(query, 'action', Object.keys(AUDIT_ACTIONS), 'action is not a known audit action');
  oneOf(query, 'module', Object.keys(AUDIT_MODULES), 'module is not a known audit module');
  oneOf(query, 'actor_type', AUDIT_ACTOR_TYPES, `actor_type must be ${AUDIT_ACTOR_TYPES.join(', ')}`);
  oneOf(query, 'status', AUDIT_STATUSES, 'status must be success or failed');
  query.date = text(query.date);
  if (query.date && (!/^\d{4}-\d{2}-\d{2}$/.test(query.date) || Number.isNaN(new Date(`${query.date}T00:00:00+05:30`).getTime()))) {
    validationError('date', 'date must be YYYY-MM-DD');
  }
};

export const auditLogIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};
