import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { authorizeAdmin } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import * as cms from './admin-cms.service.js';
import * as rules from './admin-cms.validation.js';

const router = Router();
const canView = authorizeAdmin('super_admin', 'operations', 'support');
const canManage = authorizeAdmin('super_admin', 'operations');
const ok = (message, load) => asyncHandler(async (req, res) => success(res, { message, data: await load(req) }));
const created = (message, load) => asyncHandler(async (req, res) => success(res, { status: 201, message, data: await load(req) }));

router.use(authenticateAdmin);

// Pages (tbl_cms_pages)
router.get('/pages', canView, ok('OK', () => cms.listPages()));
router.post('/pages', canManage, validate(rules.createPageRequest), created('page_created', (req) => cms.createPage({ body: req.body, adminId: req.admin.id }).then((page) => ({ page }))));
router.post('/pages/reorder', canManage, validate(rules.reorderRequest), ok('pages_reordered', (req) => cms.reorderPages(req.body.ids).then((pages) => ({ pages }))));
router.post('/pages/:id/update', canManage, validate(rules.updatePageRequest), ok('page_updated', (req) => cms.updatePage({ id: req.params.id, body: req.body, adminId: req.admin.id }).then((page) => ({ page }))));
router.post('/pages/:id/status', canManage, validate(rules.pageStatusRequest), ok('page_status_updated', (req) => cms.setPageStatus({ id: req.params.id, status: req.body.status, adminId: req.admin.id }).then((page) => ({ page }))));
router.post('/pages/:id/delete', canManage, validate(rules.idRequest), ok('page_deleted', (req) => cms.deletePage(req.params.id).then(() => ({ id: req.params.id }))));

// FAQs (tbl_faqs)
router.get('/faqs', canView, ok('OK', () => cms.listFaqs()));
router.post('/faqs', canManage, validate(rules.createFaqRequest), created('faq_created', (req) => cms.createFaq(req.body).then((faq) => ({ faq }))));
router.post('/faqs/reorder', canManage, validate(rules.reorderRequest), ok('faqs_reordered', (req) => cms.reorderFaqs(req.body.ids).then((faqs) => ({ faqs }))));
router.post('/faqs/:id/update', canManage, validate(rules.updateFaqRequest), ok('faq_updated', (req) => cms.updateFaq({ id: req.params.id, body: req.body }).then((faq) => ({ faq }))));
router.post('/faqs/:id/status', canManage, validate(rules.faqStatusRequest), ok('faq_status_updated', (req) => cms.setFaqStatus({ id: req.params.id, status: req.body.status }).then((faq) => ({ faq }))));
router.post('/faqs/:id/delete', canManage, validate(rules.idRequest), ok('faq_deleted', (req) => cms.deleteFaq(req.params.id).then(() => ({ id: req.params.id }))));

// Support contacts (tbl_support_contacts)
router.get('/support-contacts', canView, ok('OK', () => cms.listContacts()));
router.post('/support-contacts', canManage, validate(rules.createContactRequest), created('support_contact_created', (req) => cms.createContact(req.body).then((contact) => ({ contact }))));
router.post('/support-contacts/reorder', canManage, validate(rules.reorderRequest), ok('support_contacts_reordered', (req) => cms.reorderContacts(req.body.ids).then((contacts) => ({ contacts }))));
router.post('/support-contacts/:id/update', canManage, validate(rules.updateContactRequest), ok('support_contact_updated', (req) => cms.updateContact({ id: req.params.id, body: req.body }).then((contact) => ({ contact }))));
router.post('/support-contacts/:id/status', canManage, validate(rules.contactStatusRequest), ok('support_contact_status_updated', (req) => cms.setContactStatus({ id: req.params.id, status: req.body.status }).then((contact) => ({ contact }))));
router.post('/support-contacts/:id/delete', canManage, validate(rules.idRequest), ok('support_contact_deleted', (req) => cms.deleteContact(req.params.id).then(() => ({ id: req.params.id }))));

export default router;
