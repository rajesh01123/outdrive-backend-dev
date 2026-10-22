import { Op } from 'sequelize';
import { Router } from 'express';
import { Service } from '../../database/models/index.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { servicePayload } from '../admin-services/admin-services.service.js';

const router = Router();

// Public: the rider app shows these on its home screen, before or after login.
router.get('/', asyncHandler(async (req, res) => {
  const services = await Service.findAll({
    where: { status: { [Op.in]: ['active', 'coming_soon'] } },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']]
  });
  const data = services.map((service) => {
    const { sort_order: _sortOrder, ...payload } = servicePayload(service);
    return { ...payload, is_bookable: service.status === 'active' };
  });
  return success(res, { message: 'OK', data: { services: data } });
}));

export default router;
