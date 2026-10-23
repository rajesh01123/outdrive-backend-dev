import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import commonRoutes from './modules/common/common.routes.js';
import requestRoutes from './modules/request/request.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import adminUsersRoutes from './modules/admin-users/admin-users.routes.js';
import adminServicesRoutes from './modules/admin-services/admin-services.routes.js';
import adminZonesRoutes from './modules/admin-zones/admin-zones.routes.js';
import adminVehiclesRoutes from './modules/admin-vehicles/admin-vehicles.routes.js';
import adminFaresRoutes from './modules/admin-fares/admin-fares.routes.js';
import adminBookingsRoutes from './modules/admin-bookings/admin-bookings.routes.js';
import adminBannersRoutes from './modules/admin-banners/admin-banners.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/common', commonRoutes);
router.use('/request', requestRoutes);
router.use('/admin/users', adminUsersRoutes);
router.use('/admin/services', adminServicesRoutes);
router.use('/admin/zones', adminZonesRoutes);
router.use('/admin/vehicle-types', adminVehiclesRoutes);
router.use('/admin/fares', adminFaresRoutes);
router.use('/admin/bookings', adminBookingsRoutes);
router.use('/admin/banners', adminBannersRoutes);
router.use('/admin', adminRoutes);

export default router;
