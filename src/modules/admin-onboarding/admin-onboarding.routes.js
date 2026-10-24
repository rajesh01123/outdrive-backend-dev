import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { authorizeAdmin } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createImageUpload, removeStoredUpload, storedUploadPath } from '../../shared/utils/image-upload.js';
import * as slides from './admin-onboarding.service.js';
import * as rules from './admin-onboarding.validation.js';

const router = Router();
const canView = authorizeAdmin('super_admin', 'operations', 'support');
const canManage = authorizeAdmin('super_admin', 'operations');
const imageUpload = createImageUpload({ folder: 'onboarding', field: 'image', maxSizeMb: 2 }).single('image');
const ok = (message, load) => asyncHandler(async (req, res) => success(res, { message, data: await load(req) }));
const image = (req) => storedUploadPath('onboarding', req.file);

router.use(authenticateAdmin);
router.get('/', canView, ok('OK', () => slides.listSlides()));
router.post('/reorder', canManage, validate(rules.reorderSlidesRequest), ok('onboarding_reordered', (req) => slides.reorderSlides(req.body.ids).then((list) => ({ slides: list }))));
router.post('/', canManage, imageUpload, validate(rules.createSlideRequest), asyncHandler(async (req, res) =>
  success(res, { status: 201, message: 'onboarding_slide_created', data: { slide: await slides.createSlide({ body: req.body, image: image(req) }) } })
));
router.post('/:id/update', canManage, imageUpload, validate(rules.updateSlideRequest), ok('onboarding_slide_updated', (req) => slides.updateSlide({ id: req.params.id, body: req.body, image: image(req) }).then((slide) => ({ slide }))));
router.post('/:id/status', canManage, validate(rules.slideStatusRequest), ok('onboarding_slide_status_updated', (req) => slides.updateSlideStatus({ id: req.params.id, status: req.body.status }).then((slide) => ({ slide }))));
router.post('/:id/delete', canManage, validate(rules.slideIdRequest), ok('onboarding_slide_deleted', (req) => slides.deleteSlide(req.params.id).then(() => ({ id: req.params.id }))));

// A request that fails after the upload must not leave an orphaned image on disk.
router.use((error, req, res, next) => {
  if (req.file) removeStoredUpload(image(req));
  next(error);
});

export default router;
