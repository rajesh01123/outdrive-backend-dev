import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import adminUsersRoutes from './modules/admin-users/admin-users.routes.js';
import adminServicesRoutes from './modules/admin-services/admin-services.routes.js';
import serviceRoutes from './modules/service/service.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/services', serviceRoutes);
router.use('/admin/users', adminUsersRoutes);
router.use('/admin/services', adminServicesRoutes);
router.use('/admin', adminRoutes);

export default router;
