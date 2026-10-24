import { sequelize } from '../../config/database.js';
import { Admin, CmsPage, Faq, SupportContact } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { contactActionUrl, FAQ_SLUG, pageUrl, SUPPORT_SLUG } from '../cms/cms.service.js';
import { htmlText } from '../cms/cms.sanitize.js';
import { changedFields, diffChanges, recordAudit } from '../audit/audit.service.js';
import { contactValue } from './admin-cms.validation.js';

const ordered = [['sortOrder', 'ASC'], ['id', 'ASC']];

const findOr404 = async (model, id, message) => {
  const row = await model.findByPk(id);
  if (!row) throw new AppError(message, 404);
  return row;
};

const nextOrder = async (model) => ((await model.max('sortOrder')) || 0) + 1;

// Full list in the new order — every row exactly once, so two admins cannot leave gaps or duplicates.
const reorder = (model, ids, toPayload, { action, nameOf }) =>
  sequelize.transaction(async (transaction) => {
    const rows = await model.findAll({ transaction, lock: transaction.LOCK.UPDATE });
    if (rows.length !== ids.length || !rows.every((row) => ids.includes(Number(row.id)))) {
      throw new AppError('validation_error', 422, { errors: { ids: 'ids must contain every item exactly once' } });
    }
    const byId = new Map(rows.map((row) => [Number(row.id), row]));
    let moved = 0;
    for (const [index, id] of ids.entries()) {
      const row = byId.get(id);
      if (row.sortOrder !== index + 1) { await row.update({ sortOrder: index + 1 }, { transaction }); moved += 1; }
    }
    if (moved) recordAudit({ action, description: `New order: ${ids.map((id) => nameOf(byId.get(id))).join(', ')}` }, { transaction });
    return ids.map((id) => toPayload(byId.get(id)));
  });

// The audit log keeps page text out: only how long the content is before and after.
const pageAuditView = (page) => ({ title: page.title, audience: page.audience, status: page.status, content: `${htmlText(page.content).length} characters` });
const pageTarget = (page) => ({ type: 'page', id: page.id, label: `${page.title} (/${page.slug})` });
const faqTarget = (faq) => ({ type: 'faq', id: faq.id, label: faq.question });
const contactTarget = (contact) => ({ type: 'support_contact', id: contact.id, label: `${contact.label} (${contact.type})` });

const pick = (body, map) => Object.fromEntries(Object.entries(map).filter(([key]) => body[key] !== undefined).map(([key, column]) => [column, body[key]]));

// ---------- Pages ----------
const pagePayload = (page) => ({
  id: Number(page.id),
  title: page.title,
  slug: page.slug,
  content: page.content,
  audience: page.audience,
  status: page.status,
  sort_order: page.sortOrder,
  url: pageUrl(page.slug),
  updated_at: page.updatedAt,
  updated_by: page.editor ? { id: Number(page.editor.id), name: page.editor.name } : null
});
const withEditor = { include: [{ model: Admin, as: 'editor', attributes: ['id', 'name'] }] };
const reloadPage = async (id) => pagePayload(await CmsPage.findByPk(id, withEditor));

export const listPages = async () => {
  const pages = await CmsPage.findAll({ ...withEditor, order: ordered });
  return {
    stats: { total: pages.length, published: pages.filter((page) => page.status === 'published').length, draft: pages.filter((page) => page.status === 'draft').length },
    // Built from the FAQ and support tables; shown so the admin can copy these URLs too.
    built_in: [{ slug: FAQ_SLUG, title: 'FAQs', url: pageUrl(FAQ_SLUG) }, { slug: SUPPORT_SLUG, title: 'Help & Support', url: pageUrl(SUPPORT_SLUG) }],
    pages: pages.map(pagePayload)
  };
};

export const createPage = async ({ body, adminId }) => {
  if (await CmsPage.findOne({ where: { slug: body.slug } })) throw new AppError('page_slug_exists', 409, { errors: { slug: 'another page already uses this slug' } });
  const page = await CmsPage.create({ title: body.title, slug: body.slug, content: body.content, audience: body.audience, status: body.status, sortOrder: await nextOrder(CmsPage), updatedBy: adminId });
  recordAudit({ action: 'page.created', target: pageTarget(page), description: `Created page "${page.title}" as ${page.status}` });
  return reloadPage(page.id);
};

export const updatePage = async ({ id, body, adminId }) => {
  const page = await findOr404(CmsPage, id, 'page_not_found');
  if (body.slug !== undefined && body.slug !== page.slug) throw new AppError('page_slug_locked', 422, { errors: { slug: 'the slug is part of the app URL and cannot be changed' } });
  const before = pageAuditView(page);
  const contentBefore = page.content;
  await page.update({ ...pick(body, { title: 'title', content: 'content', audience: 'audience', status: 'status' }), updatedBy: adminId });
  const changes = diffChanges(before, pageAuditView(page), ['title', 'audience', 'status', 'content']) || {};
  if (!changes.content && contentBefore !== page.content) changes.content = { from: before.content, to: `${pageAuditView(page).content} (edited)` };
  if (Object.keys(changes).length) recordAudit({ action: 'page.updated', target: pageTarget(page), changes, description: `Edited page "${page.title}": ${changedFields(changes)}` });
  return reloadPage(page.id);
};

export const setPageStatus = async ({ id, status, adminId }) => {
  const page = await findOr404(CmsPage, id, 'page_not_found');
  const previous = page.status;
  await page.update({ status, updatedBy: adminId });
  if (previous !== status) {
    recordAudit({ action: 'page.status_changed', target: pageTarget(page), changes: { status: { from: previous, to: status } }, description: `Page "${page.title}" set to ${status}` });
  }
  return reloadPage(page.id);
};

export const reorderPages = (ids) => reorder(CmsPage, ids, pagePayload, { action: 'pages.reordered', nameOf: (page) => page.title });
export const deletePage = async (id) => {
  const page = await findOr404(CmsPage, id, 'page_not_found');
  await page.destroy();
  recordAudit({ action: 'page.deleted', target: pageTarget(page), description: `Deleted page "${page.title}" (/${page.slug})` });
};

// ---------- FAQs ----------
const faqPayload = (faq) => ({ id: Number(faq.id), question: faq.question, answer: faq.answer, category: faq.category, audience: faq.audience, status: faq.status, sort_order: faq.sortOrder, updated_at: faq.updatedAt });

export const listFaqs = async () => {
  const faqs = await Faq.findAll({ order: ordered });
  return {
    stats: { total: faqs.length, published: faqs.filter((faq) => faq.status === 'published').length, categories: new Set(faqs.map((faq) => faq.category)).size },
    url: pageUrl(FAQ_SLUG),
    faqs: faqs.map(faqPayload)
  };
};
const faqColumns = { question: 'question', answer: 'answer', category: 'category', audience: 'audience', status: 'status' };

export const createFaq = async (body) => {
  const faq = await Faq.create({ ...pick(body, faqColumns), sortOrder: await nextOrder(Faq) });
  recordAudit({ action: 'faq.created', target: faqTarget(faq), description: `Added FAQ "${faq.question}" in ${faq.category}` });
  return faqPayload(faq);
};
export const updateFaq = async ({ id, body }) => {
  const faq = await findOr404(Faq, id, 'faq_not_found');
  const before = faqPayload(faq);
  await faq.update(pick(body, faqColumns));
  const changes = diffChanges(before, faqPayload(faq), Object.keys(faqColumns));
  if (changes) recordAudit({ action: 'faq.updated', target: faqTarget(faq), changes, description: `Edited FAQ "${faq.question}": ${changedFields(changes)}` });
  return faqPayload(faq);
};
export const setFaqStatus = async ({ id, status }) => {
  const faq = await findOr404(Faq, id, 'faq_not_found');
  const previous = faq.status;
  await faq.update({ status });
  if (previous !== status) recordAudit({ action: 'faq.status_changed', target: faqTarget(faq), changes: { status: { from: previous, to: status } }, description: `FAQ "${faq.question}" set to ${status}` });
  return faqPayload(faq);
};
export const reorderFaqs = (ids) => reorder(Faq, ids, faqPayload, { action: 'faqs.reordered', nameOf: (faq) => faq.question });
export const deleteFaq = async (id) => {
  const faq = await findOr404(Faq, id, 'faq_not_found');
  await faq.destroy();
  recordAudit({ action: 'faq.deleted', target: faqTarget(faq), description: `Deleted FAQ "${faq.question}"` });
};

// ---------- Support contacts ----------
const contactPayload = (contact) => ({ id: Number(contact.id), type: contact.type, label: contact.label, value: contact.value, action_url: contactActionUrl(contact), audience: contact.audience, status: contact.status, sort_order: contact.sortOrder, updated_at: contact.updatedAt });
const contactColumns = { type: 'type', label: 'label', value: 'value', audience: 'audience', status: 'status' };

export const listContacts = async () => {
  const contacts = await SupportContact.findAll({ order: ordered });
  return {
    stats: { total: contacts.length, active: contacts.filter((contact) => contact.status === 'active').length },
    url: pageUrl(SUPPORT_SLUG),
    contacts: contacts.map(contactPayload)
  };
};
export const createContact = async (body) => {
  const contact = await SupportContact.create({ ...pick(body, contactColumns), sortOrder: await nextOrder(SupportContact) });
  recordAudit({ action: 'support_contact.created', target: contactTarget(contact), description: `Added support contact ${contact.label}: ${contact.value}` });
  return contactPayload(contact);
};
export const updateContact = async ({ id, body }) => {
  const contact = await findOr404(SupportContact, id, 'support_contact_not_found');
  // A changed type must still fit the stored value, and a changed value the stored type.
  contactValue({ type: body.type ?? contact.type, value: body.value ?? contact.value });
  const before = contactPayload(contact);
  await contact.update(pick(body, contactColumns));
  const changes = diffChanges(before, contactPayload(contact), Object.keys(contactColumns));
  if (changes) recordAudit({ action: 'support_contact.updated', target: contactTarget(contact), changes, description: `Edited support contact ${contact.label}: ${changedFields(changes)}` });
  return contactPayload(contact);
};
export const setContactStatus = async ({ id, status }) => {
  const contact = await findOr404(SupportContact, id, 'support_contact_not_found');
  const previous = contact.status;
  await contact.update({ status });
  if (previous !== status) recordAudit({ action: 'support_contact.status_changed', target: contactTarget(contact), changes: { status: { from: previous, to: status } }, description: `Support contact ${contact.label} set to ${status}` });
  return contactPayload(contact);
};
export const reorderContacts = (ids) => reorder(SupportContact, ids, contactPayload, { action: 'support_contacts.reordered', nameOf: (contact) => contact.label });
export const deleteContact = async (id) => {
  const contact = await findOr404(SupportContact, id, 'support_contact_not_found');
  await contact.destroy();
  recordAudit({ action: 'support_contact.deleted', target: contactTarget(contact), description: `Deleted support contact ${contact.label}` });
};
