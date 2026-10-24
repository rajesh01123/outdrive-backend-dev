import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { requirePermission } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createImageUpload, removeStoredUpload, storedUploadPath } from '../../shared/utils/image-upload.js';
import * as goodsTypes from './admin-goods-types.service.js';
import * as rules from './admin-goods-types.validation.js';

const router = Router();
// Goods types belong to "Bookings & parcels" on the Roles page.
const canView = requirePermission('bookings.view');
const canManage = requirePermission('bookings.manage');
const iconUpload = createImageUpload({ folder: 'goods-types', field: 'icon', maxSizeMb: 1 }).single('icon');
const ok = (message, load) => asyncHandler(async (req, res) => success(res, { message, data: await load(req) }));
const icon = (req) => storedUploadPath('goods-types', req.file);

router.use(authenticateAdmin);
router.get('/', canView, ok('OK', () => goodsTypes.listGoodsTypes()));
router.post('/reorder', canManage, validate(rules.reorderGoodsTypesRequest), ok('goods_types_reordered', (req) => goodsTypes.reorderGoodsTypes(req.body.ids)));
router.post('/', canManage, iconUpload, validate(rules.createGoodsTypeRequest), asyncHandler(async (req, res) =>
  success(res, { status: 201, message: 'goods_type_created', data: { goods_type: await goodsTypes.createGoodsType({ body: req.body, icon: icon(req) }) } })
));
router.post('/:id/update', canManage, iconUpload, validate(rules.updateGoodsTypeRequest), ok('goods_type_updated', (req) => goodsTypes.updateGoodsType({ id: req.params.id, body: req.body, icon: icon(req) }).then((goodsType) => ({ goods_type: goodsType }))));
router.post('/:id/status', canManage, validate(rules.goodsTypeStatusRequest), ok('goods_type_status_updated', (req) => goodsTypes.updateGoodsTypeStatus({ id: req.params.id, status: req.body.status }).then((goodsType) => ({ goods_type: goodsType }))));
router.post('/:id/delete', canManage, validate(rules.goodsTypeIdRequest), ok('goods_type_deleted', (req) => goodsTypes.deleteGoodsType(req.params.id).then(() => ({ id: req.params.id }))));

// A request that fails after the upload must not leave an orphaned icon on disk.
router.use((error, req, res, next) => {
  if (req.file) removeStoredUpload(icon(req));
  next(error);
});

export default router;
