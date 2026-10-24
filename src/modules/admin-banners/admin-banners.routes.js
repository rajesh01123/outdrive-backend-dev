import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { authorizeAdmin } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import { createImageUpload, removeStoredUpload, storedUploadPath } from '../../shared/utils/image-upload.js';
import * as controller from './admin-banners.controller.js';
import { bannerIdRequest, createBannerRequest, reorderBannersRequest, updateBannerRequest } from './admin-banners.validation.js';

const router = Router();
const canView = authorizeAdmin('super_admin', 'operations', 'support');
const canManage = authorizeAdmin('super_admin', 'operations');
const imageUpload = createImageUpload({ folder: 'banners', field: 'image', maxSizeMb: 2 }).single('image');

router.use(authenticateAdmin);
router.get('/', canView, controller.list);
router.post('/reorder', canManage, validate(reorderBannersRequest), controller.reorder);
router.post('/', canManage, imageUpload, validate(createBannerRequest), controller.create);
router.post('/:id/update', canManage, imageUpload, validate(updateBannerRequest), controller.update);
router.post('/:id/delete', canManage, validate(bannerIdRequest), controller.destroy);

// A request that fails after the upload must not leave an orphaned image on disk.
router.use((error, req, res, next) => {
  if (req.file) removeStoredUpload(storedUploadPath('banners', req.file));
  next(error);
});

export default router;
