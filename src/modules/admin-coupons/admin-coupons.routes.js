import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/authenticate-admin.js';
import { authorizeAdmin } from '../../middleware/authorize-admin.js';
import { validate } from '../../middleware/validate.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import * as coupons from './admin-coupons.service.js';
import * as rules from './admin-coupons.validation.js';

const router = Router();
const canView = authorizeAdmin('super_admin', 'operations', 'support');
const canManage = authorizeAdmin('super_admin', 'operations');
const ok = (message, load) => asyncHandler(async (req, res) => success(res, { message, data: await load(req) }));

router.use(authenticateAdmin);
router.get('/', canView, ok('OK', () => coupons.listCoupons()));
router.post('/', canManage, validate(rules.createCouponRequest), asyncHandler(async (req, res) =>
  success(res, { status: 201, message: 'coupon_created', data: { coupon: await coupons.createCoupon(req.body) } })
));
router.post('/:id/update', canManage, validate(rules.updateCouponRequest), ok('coupon_updated', (req) => coupons.updateCoupon({ id: req.params.id, body: req.body }).then((coupon) => ({ coupon }))));
router.post('/:id/status', canManage, validate(rules.couponStatusRequest), ok('coupon_status_updated', (req) => coupons.updateCouponStatus({ id: req.params.id, status: req.body.status }).then((coupon) => ({ coupon }))));
router.post('/:id/delete', canManage, validate(rules.couponIdRequest), ok('coupon_deleted', (req) => coupons.deleteCoupon(req.params.id).then(() => ({ id: req.params.id }))));

export default router;
