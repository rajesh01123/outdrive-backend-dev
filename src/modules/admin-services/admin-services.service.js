import { sequelize } from '../../config/database.js';
import { Service } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { removeStoredUpload } from '../../shared/utils/image-upload.js';
import { publicProfilePictureUrl as publicUploadUrl } from '../../shared/utils/serializers.js';

export const servicePayload = (service) => ({
  id: Number(service.id),
  name: service.name,
  slug: service.slug,
  subtitle: service.subtitle || '',
  image: publicUploadUrl(service.image),
  service_type: service.serviceType,
  sort_order: service.sortOrder,
  status: service.status
});

const findService = async (id, options = {}) => {
  const service = await Service.findByPk(id, options);
  if (!service) throw new AppError('service_not_found', 404);
  return service;
};

export const listServices = async () => {
  const services = await Service.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
  const count = (status) => services.filter((service) => service.status === status).length;
  return {
    stats: { total: services.length, active: count('active'), coming_soon: count('coming_soon'), inactive: count('inactive') },
    services: services.map(servicePayload)
  };
};

export const createService = async ({ body, image }) => {
  if (await Service.findOne({ where: { slug: body.slug } })) throw new AppError('service_slug_exists', 409, { errors: { slug: 'slug is already used by another service' } });
  // New services go to the end of the app home list.
  const lastOrder = (await Service.max('sortOrder')) || 0;
  const service = await Service.create({
    name: body.name,
    slug: body.slug,
    subtitle: body.subtitle || null,
    image,
    serviceType: body.service_type,
    status: body.status,
    sortOrder: lastOrder + 1
  });
  return servicePayload(service);
};

export const updateService = async ({ id, body, image }) => {
  const service = await findService(id);
  if (body.slug !== undefined && body.slug !== service.slug) throw new AppError('service_slug_locked', 422, { errors: { slug: 'slug cannot be changed after the service is created' } });
  const values = {};
  if (body.name !== undefined) values.name = body.name;
  if (body.subtitle !== undefined) values.subtitle = body.subtitle || null;
  if (body.service_type !== undefined) values.serviceType = body.service_type;
  if (body.status !== undefined) values.status = body.status;
  const previousImage = service.image;
  if (image) values.image = image;
  if (Object.keys(values).length) await service.update(values);
  if (image && previousImage !== image) await removeStoredUpload(previousImage);
  return servicePayload(service);
};

export const updateServiceStatus = async ({ id, status }) => {
  const service = await findService(id);
  await service.update({ status });
  return servicePayload(service);
};

export const reorderServices = (ids) =>
  sequelize.transaction(async (transaction) => {
    const services = await Service.findAll({ transaction, lock: transaction.LOCK.UPDATE });
    // Require the full list so two admins reordering at once cannot leave gaps or duplicates.
    if (services.length !== ids.length || !services.every((service) => ids.includes(Number(service.id)))) {
      throw new AppError('validation_error', 422, { errors: { ids: 'ids must contain every service exactly once' } });
    }
    const byId = new Map(services.map((service) => [Number(service.id), service]));
    for (const [index, id] of ids.entries()) {
      const service = byId.get(id);
      if (service.sortOrder !== index + 1) await service.update({ sortOrder: index + 1 }, { transaction });
    }
    return ids.map((id) => servicePayload(byId.get(id)));
  });
