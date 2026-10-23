import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { renderDocument, renderFaqBody, renderNotFound, renderSupportBody } from './cms.render.js';
import { contactActionUrl, FAQ_SLUG, findPublishedPage, listActiveContacts, listPublishedFaqs, SUPPORT_SLUG } from './cms.service.js';

const router = Router();

// The pages contain no scripts at all; this header makes sure nothing else can run inside the app's WebView.
const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=60',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff'
};

const latest = (rows) => rows.reduce((max, row) => (row.updatedAt > max ? row.updatedAt : max), rows[0]?.updatedAt || null);

// GET /pages/:slug?theme=dark&header=0&audience=driver — the URL the rider/driver app opens in a WebView.
router.get('/:slug', asyncHandler(async (req, res) => {
  const theme = req.query.theme === 'dark' ? 'dark' : 'light';
  const header = req.query.header !== '0';
  // FAQ and Help & Support default to rider content; the driver app passes audience=driver.
  const audience = req.query.audience === 'driver' ? 'driver' : 'user';
  const slug = String(req.params.slug || '').toLowerCase();
  res.set(PAGE_HEADERS);

  if (slug === FAQ_SLUG) {
    const faqs = await listPublishedFaqs(audience);
    return res.send(renderDocument({ title: 'FAQs', bodyHtml: renderFaqBody(faqs), updatedAt: latest(faqs), theme, header }));
  }
  if (slug === SUPPORT_SLUG) {
    const contacts = await listActiveContacts(audience);
    return res.send(renderDocument({ title: 'Help & Support', bodyHtml: renderSupportBody(contacts, contactActionUrl), updatedAt: latest(contacts), theme, header }));
  }
  const page = await findPublishedPage(slug);
  if (!page) return res.status(404).send(renderNotFound({ theme }));
  return res.send(renderDocument({ title: page.title, bodyHtml: page.content, updatedAt: page.updatedAt, theme, header }));
}));

export default router;
