import { Op } from 'sequelize';
import { Router } from 'express';
import { Service } from '../../database/models/index.js';
import { optionalAuthenticate } from '../../middleware/optional-authenticate.js';
import { validate, validationError } from '../../middleware/validate.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { publicProfilePictureUrl as publicUploadUrl } from '../../shared/utils/serializers.js';
import { listLiveBanners } from '../admin-banners/admin-banners.service.js';
import { publicBannersRequest } from '../admin-banners/admin-banners.validation.js';
import { listLiveSlides } from '../admin-onboarding/admin-onboarding.service.js';
import { listActiveGoodsTypes } from '../admin-goods-types/admin-goods-types.service.js';
import { publicOnboardingRequest } from '../admin-onboarding/admin-onboarding.validation.js';
import { checkServiceability, ZONE_CURRENCY } from '../zone/zone.service.js';
import { listActiveContacts, listPublicPages, listPublishedFaqs, findPublishedPage, pageUrl, publicContactPayload, publicFaqPayload, RESERVED_SLUGS } from '../cms/cms.service.js';
import { cancelPolicyRequest, cmsAudienceRequest, serviceAvailabilityRequest } from './common.validation.js';

const router = Router();

// HOME-01 — public; inactive modules are hidden, coming-soon ones are shown but not bookable.
router.get('/ride_modules', asyncHandler(async (req, res) => {
  const services = await Service.findAll({
    where: { status: { [Op.in]: ['active', 'coming_soon'] } },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']]
  });
  const data = services.map((service) => ({
    id: `m_${service.moduleKey}`,
    name: service.name,
    short_description: service.shortDescription || '',
    description: service.description || '',
    transport_type: service.transportType,
    service_type: service.serviceType,
    module_key: service.moduleKey,
    section: service.section,
    menu_icon: publicUploadUrl(service.image),
    icon_types_for: service.iconTypesFor,
    order_by: service.sortOrder,
    is_active: true,
    coming_soon: service.status === 'coming_soon'
  }));
  return success(res, { message: 'OK', data });
}));

// ZONE-01 — same check as the admin "test location" tool.
router.post('/service-availability', optionalAuthenticate, validate(serviceAvailabilityRequest), asyncHandler(async (req, res) => {
  const { pick_lat: lat, pick_lng: lng, module_key: moduleKey } = req.body;
  const result = await checkServiceability({ lat, lng, moduleKey });
  if (result.reason === 'unknown_module') validationError('module_key', 'module_key is not a valid ride module');

  const notBookable = ['module_inactive', 'module_coming_soon'].includes(result.reason);
  const message = result.isServiceable ? 'service_available' : notBookable ? 'module_not_available' : 'out_of_service_area';
  return success(res, {
    message,
    data: {
      is_serviceable: result.isServiceable,
      zone_id: result.isServiceable ? `z_${result.zone.id}` : '',
      zone_name: result.isServiceable ? result.zone.name : '',
      ...ZONE_CURRENCY
    }
  });
}));

// ETA-02 — public or Bearer; empty body means the admin has not written a policy (the app can hide it).
router.get('/cancel-policy', validate(cancelPolicyRequest), asyncHandler(async (req, res) => {
  const service = await Service.findOne({ where: { moduleKey: req.query.module_key } });
  if (!service) validationError('module_key', 'module_key is not a valid ride module');
  return success(res, {
    message: 'OK',
    data: { title: service.cancelPolicyTitle || 'Cancellation policy', body: service.cancelPolicyBody || '' }
  });
}));

// Home banners — token optional; only active banners inside their date window, in admin order.
router.get('/banners', optionalAuthenticate, validate(publicBannersRequest), asyncHandler(async (req, res) => {
  const data = await listLiveBanners({ limit: req.query.limit, type: req.query.type });
  return success(res, { message: 'OK', data });
}));

// Parcel screen — public; the active goods types in admin order (goods_type_id in BOOK-01).
router.get('/goods-types', asyncHandler(async (req, res) => success(res, { message: 'OK', data: await listActiveGoodsTypes() })));

// HOME-09 — public; active slides in admin order. An empty list means the app shows its built-in slides.
router.get('/on-boarding', validate(publicOnboardingRequest), asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: await listLiveSlides({ locale: req.query.locale }) })
));

// CMS — the app's menu of WebView pages (no hard-coded URLs), plus FAQ / support data as JSON.
router.get('/pages', validate(cmsAudienceRequest), asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: await listPublicPages(req.query.audience) })
));

router.get('/pages/:slug', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const page = RESERVED_SLUGS.includes(slug) ? null : await findPublishedPage(slug);
  if (!page) return res.status(404).json({ success: false, message: 'page_not_found', data: {} });
  return success(res, { message: 'OK', data: { slug: page.slug, title: page.title, content: page.content, url: pageUrl(page.slug), updated_at: page.updatedAt } });
}));

router.get('/faqs', validate(cmsAudienceRequest), asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: (await listPublishedFaqs(req.query.audience)).map(publicFaqPayload) })
));

router.get('/support-contacts', validate(cmsAudienceRequest), asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: (await listActiveContacts(req.query.audience)).map(publicContactPayload) })
));

export default router;
