import { sequelize } from '../../config/database.js';
import { Admin, CmsPage, Faq, SupportContact } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { contactActionUrl, FAQ_SLUG, pageUrl, SUPPORT_SLUG } from '../cms/cms.service.js';
import { contactValue } from './admin-cms.validation.js';

const ordered = [['sortOrder', 'ASC'], ['id', 'ASC']];

const findOr404 = async (model, id, message) => {
  const row = await model.findByPk(id);
  if (!row) throw new AppError(message, 404);
  return row;
};

const nextOrder = async (model) => ((await model.max('sortOrder')) || 0) + 1;

// Full list in the new order — every row exactly once, so two admins cannot leave gaps or duplicates.
const reorder = (model, ids, toPayload) =>
  sequelize.transaction(async (transaction) => {
    const rows = await model.findAll({ transaction, lock: transaction.LOCK.UPDATE });
    if (rows.length !== ids.length || !rows.every((row) => ids.includes(Number(row.id)))) {
      throw new AppError('validation_error', 422, { errors: { ids: 'ids must contain every item exactly once' } });
    }
    const byId = new Map(rows.map((row) => [Number(row.id), row]));
    for (const [index, id] of ids.entries()) {
      const row = byId.get(id);
      if (row.sortOrder !== index + 1) await row.update({ sortOrder: index + 1 }, { transaction });
    }
    return ids.map((id) => toPayload(byId.get(id)));
  });

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
  return reloadPage(page.id);
};

export const updatePage = async ({ id, body, adminId }) => {
  const page = await findOr404(CmsPage, id, 'page_not_found');
  if (body.slug !== undefined && body.slug !== page.slug) throw new AppError('page_slug_locked', 422, { errors: { slug: 'the slug is part of the app URL and cannot be changed' } });
  await page.update({ ...pick(body, { title: 'title', content: 'content', audience: 'audience', status: 'status' }), updatedBy: adminId });
  return reloadPage(page.id);
};

export const setPageStatus = async ({ id, status, adminId }) => {
  const page = await findOr404(CmsPage, id, 'page_not_found');
  await page.update({ status, updatedBy: adminId });
  return reloadPage(page.id);
};

export const reorderPages = (ids) => reorder(CmsPage, ids, pagePayload);
export const deletePage = async (id) => (await findOr404(CmsPage, id, 'page_not_found')).destroy();

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
export const createFaq = async (body) => faqPayload(await Faq.create({ ...pick(body, { question: 'question', answer: 'answer', category: 'category', audience: 'audience', status: 'status' }), sortOrder: await nextOrder(Faq) }));
export const updateFaq = async ({ id, body }) => faqPayload(await (await findOr404(Faq, id, 'faq_not_found')).update(pick(body, { question: 'question', answer: 'answer', category: 'category', audience: 'audience', status: 'status' })));
export const setFaqStatus = async ({ id, status }) => faqPayload(await (await findOr404(Faq, id, 'faq_not_found')).update({ status }));
export const reorderFaqs = (ids) => reorder(Faq, ids, faqPayload);
export const deleteFaq = async (id) => (await findOr404(Faq, id, 'faq_not_found')).destroy();

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
export const createContact = async (body) => contactPayload(await SupportContact.create({ ...pick(body, contactColumns), sortOrder: await nextOrder(SupportContact) }));
export const updateContact = async ({ id, body }) => {
  const contact = await findOr404(SupportContact, id, 'support_contact_not_found');
  // A changed type must still fit the stored value, and a changed value the stored type.
  contactValue({ type: body.type ?? contact.type, value: body.value ?? contact.value });
  return contactPayload(await contact.update(pick(body, contactColumns)));
};
export const setContactStatus = async ({ id, status }) => contactPayload(await (await findOr404(SupportContact, id, 'support_contact_not_found')).update({ status }));
export const reorderContacts = (ids) => reorder(SupportContact, ids, contactPayload);
export const deleteContact = async (id) => (await findOr404(SupportContact, id, 'support_contact_not_found')).destroy();
