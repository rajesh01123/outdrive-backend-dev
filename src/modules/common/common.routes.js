import { Op } from 'sequelize';
import { Router } from 'express';
import { Service } from '../../database/models/index.js';
import { optionalAuthenticate } from '../../middleware/optional-authenticate.js';
import { validate, validationError } from '../../middleware/validate.js';
import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { publicProfilePictureUrl as publicUploadUrl } from '../../shared/utils/serializers.js';
import { checkServiceability, ZONE_CURRENCY } from '../zone/zone.service.js';
import { cancelPolicyRequest, serviceAvailabilityRequest } from './common.validation.js';

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

export default router;
