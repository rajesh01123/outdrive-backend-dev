import { Op } from 'sequelize';
import { env } from '../../config/env.js';
import { CmsPage, Faq, SupportContact } from '../../database/models/index.js';

// These two pages are built from their own tables, so no CMS page may use their slugs.
export const FAQ_SLUG = 'faq';
export const SUPPORT_SLUG = 'help-and-support';
export const RESERVED_SLUGS = [FAQ_SLUG, SUPPORT_SLUG];

export const pageUrl = (slug) => `${env.appUrl}/pages/${slug}`;

// "user" sees items for users and everyone; no audience = everything.
const audienceWhere = (audience) => (audience ? { audience: { [Op.in]: ['all', audience] } } : {});
const ordered = [['sortOrder', 'ASC'], ['id', 'ASC']];

const digits = (value) => String(value).replace(/\D/g, '');
// Indian 10-digit numbers get the country code so tel: and wa.me work from the app.
const withCountryCode = (value) => {
  const number = digits(value);
  return number.length === 10 ? `91${number}` : number;
};

export const contactActionUrl = (contact) => {
  switch (contact.type) {
    case 'phone': return `tel:+${withCountryCode(contact.value)}`;
    case 'whatsapp': return `https://wa.me/${withCountryCode(contact.value)}`;
    case 'email': return `mailto:${contact.value}`;
    case 'address': return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.value)}`;
    case 'website': return contact.value;
    default: return '';
  }
};

export const publicContactPayload = (contact) => ({ type: contact.type, label: contact.label, value: contact.value, action_url: contactActionUrl(contact) });
export const publicFaqPayload = (faq) => ({ id: `faq_${faq.id}`, question: faq.question, answer: faq.answer, category: faq.category });

export const listPublishedFaqs = (audience) => Faq.findAll({ where: { status: 'published', ...audienceWhere(audience) }, order: ordered });
export const listActiveContacts = (audience) => SupportContact.findAll({ where: { status: 'active', ...audienceWhere(audience) }, order: ordered });
export const findPublishedPage = (slug) => CmsPage.findOne({ where: { slug, status: 'published' } });

// App menu: every published page plus FAQ and Help & Support when they have something to show.
export const listPublicPages = async (audience) => {
  const [pages, faqs, contacts] = await Promise.all([
    CmsPage.findAll({ where: { status: 'published', ...audienceWhere(audience) }, order: ordered }),
    listPublishedFaqs(audience),
    listActiveContacts(audience)
  ]);
  const latest = (rows) => rows.reduce((max, row) => (row.updatedAt > max ? row.updatedAt : max), rows[0].updatedAt);
  const list = pages.map((page) => ({ slug: page.slug, title: page.title, type: 'page', url: pageUrl(page.slug), updated_at: page.updatedAt }));
  if (faqs.length) list.push({ slug: FAQ_SLUG, title: 'FAQs', type: 'faq', url: pageUrl(FAQ_SLUG), updated_at: latest(faqs) });
  if (contacts.length) list.push({ slug: SUPPORT_SLUG, title: 'Help & Support', type: 'support', url: pageUrl(SUPPORT_SLUG), updated_at: latest(contacts) });
  return list;
};
