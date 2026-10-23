import { validationError } from '../../middleware/validate.js';
import { htmlText, sanitizeCmsHtml } from '../cms/cms.sanitize.js';
import { RESERVED_SLUGS } from '../cms/cms.service.js';

export const AUDIENCES = ['all', 'user', 'driver'];
export const CONTACT_TYPES = ['phone', 'whatsapp', 'email', 'address', 'website', 'hours'];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const oneLine = (value) => text(value).replace(/\s+/g, ' ');
export const slugFromTitle = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');

const lengthField = (body, key, { min = 1, max, required, multiline = false }) => {
  if (!required && body[key] === undefined) return;
  body[key] = multiline ? text(body[key]) : oneLine(body[key]);
  if (body[key].length < min || body[key].length > max) validationError(key, `${key} must be between ${min} and ${max} characters`);
};
const enumField = (body, key, values, fallback, required) => {
  if (!required && body[key] === undefined) return;
  body[key] = text(body[key]) || fallback;
  if (!values.includes(body[key])) validationError(key, `${key} must be one of ${values.join(', ')}`);
};

export const idRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

export const reorderRequest = (req) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length || !ids.every((id) => Number.isInteger(id) && id > 0)) validationError('ids', 'ids must be a non-empty array of ids');
  if (new Set(ids).size !== ids.length) validationError('ids', 'ids must not contain duplicates');
};

// ---------- Pages ----------
const pageFields = (body, creating) => {
  lengthField(body, 'title', { min: 2, max: 120, required: creating });
  if (creating || body.content !== undefined) {
    body.content = sanitizeCmsHtml(body.content);
    if (!htmlText(body.content)) validationError('content', 'content is required');
    if (body.content.length > 200000) validationError('content', 'content is too long');
  }
  enumField(body, 'audience', AUDIENCES, 'all', creating);
  enumField(body, 'status', ['published', 'draft'], 'draft', creating);
};

export const createPageRequest = (req) => {
  const { body } = req;
  pageFields(body, true);
  body.slug = text(body.slug) ? text(body.slug).toLowerCase() : slugFromTitle(body.title);
  if (!slugPattern.test(body.slug) || body.slug.length > 80) validationError('slug', 'slug may contain lowercase letters, numbers and single hyphens (max 80)');
  if (RESERVED_SLUGS.includes(body.slug)) validationError('slug', `${body.slug} is used by the built-in page; choose another slug`);
};

export const updatePageRequest = (req) => { idRequest(req); pageFields(req.body, false); };
export const pageStatusRequest = (req) => { idRequest(req); enumField(req.body, 'status', ['published', 'draft'], '', true); };

// ---------- FAQs ----------
const faqFields = (body, creating) => {
  lengthField(body, 'question', { min: 5, max: 255, required: creating });
  lengthField(body, 'answer', { min: 1, max: 5000, required: creating, multiline: true });
  if (creating || body.category !== undefined) { body.category = oneLine(body.category) || 'General'; if (body.category.length > 60) validationError('category', 'category must not exceed 60 characters'); }
  enumField(body, 'audience', AUDIENCES, 'all', creating);
  enumField(body, 'status', ['published', 'draft'], 'published', creating);
};
export const createFaqRequest = (req) => faqFields(req.body, true);
export const updateFaqRequest = (req) => { idRequest(req); faqFields(req.body, false); };
export const faqStatusRequest = (req) => { idRequest(req); enumField(req.body, 'status', ['published', 'draft'], '', true); };

// ---------- Support contacts ----------
const contactValue = (body) => {
  const value = body.value;
  const fail = (message) => validationError('value', message);
  switch (body.type) {
    case 'phone':
    case 'whatsapp': {
      if (!/^\+?[\d\s-]+$/.test(value)) fail('use digits only, e.g. +91 98765 43210');
      const count = value.replace(/\D/g, '').length;
      if (count < 10 || count > 15) fail('phone numbers need 10 to 15 digits');
      break;
    }
    case 'email': if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail('enter a valid email address'); break;
    case 'website': if (!/^https?:\/\/\S+$/i.test(value)) fail('enter a full http(s):// URL'); break;
    default: break;
  }
};
// When an edit omits type, the service checks the value against the stored type instead.
const contactFields = (body, creating) => {
  enumField(body, 'type', CONTACT_TYPES, '', creating);
  lengthField(body, 'label', { min: 1, max: 60, required: creating });
  lengthField(body, 'value', { min: 1, max: 255, required: creating });
  if (body.value !== undefined && body.type !== undefined) contactValue(body);
  enumField(body, 'audience', AUDIENCES, 'all', creating);
  enumField(body, 'status', ['active', 'inactive'], 'active', creating);
};
export const createContactRequest = (req) => contactFields(req.body, true);
export const updateContactRequest = (req) => { idRequest(req); contactFields(req.body, false); };
export const contactStatusRequest = (req) => { idRequest(req); enumField(req.body, 'status', ['active', 'inactive'], '', true); };
export { contactValue };
