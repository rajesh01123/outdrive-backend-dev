import { sequelize } from '../../config/database.js';
import { Service } from '../../database/models/index.js';
import { fareCategoryForService } from '../../shared/fare/fare-calculator.js';
import { AppError } from '../../shared/utils/app-error.js';
import { removeStoredUpload } from '../../shared/utils/image-upload.js';
import { publicProfilePictureUrl as publicUploadUrl } from '../../shared/utils/serializers.js';
import { changedFields, diffChanges, recordAudit } from '../audit/audit.service.js';

export const servicePayload = (service) => ({
  id: Number(service.id),
  name: service.name,
  module_key: service.moduleKey,
  short_description: service.shortDescription || '',
  description: service.description || '',
  image: publicUploadUrl(service.image),
  section: service.section,
  transport_type: service.transportType,
  service_type: service.serviceType,
  icon_types_for: service.iconTypesFor,
  fare_category: fareCategoryForService(service),
  cancel_policy_title: service.cancelPolicyTitle || '',
  cancel_policy_body: service.cancelPolicyBody || '',
  sort_order: service.sortOrder,
  status: service.status
});

const serviceTarget = (service) => ({ type: 'service', id: service.id, label: service.name });
const SERVICE_AUDIT_FIELDS = ['name', 'short_description', 'description', 'cancel_policy_title', 'cancel_policy_body', 'status'];

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

const lockedFields = ['module_key', 'slug', 'section', 'transport_type', 'service_type', 'icon_types_for'];

export const updateService = async ({ id, body, image }) => {
  const service = await findService(id);
  const locked = lockedFields.find((field) => body[field] !== undefined);
  if (locked) throw new AppError('service_field_locked', 422, { errors: { [locked]: `${locked} is part of the app contract and cannot be changed` } });

  const before = servicePayload(service);
  const values = {};
  if (body.name !== undefined) values.name = body.name;
  if (body.short_description !== undefined) values.shortDescription = body.short_description || null;
  if (body.description !== undefined) values.description = body.description || null;
  if (body.cancel_policy_title !== undefined) values.cancelPolicyTitle = body.cancel_policy_title || null;
  if (body.cancel_policy_body !== undefined) values.cancelPolicyBody = body.cancel_policy_body || null;
  if (body.status !== undefined) values.status = body.status;
  const previousImage = service.image;
  if (image) values.image = image;
  if (Object.keys(values).length) await service.update(values);
  if (image && previousImage !== image) await removeStoredUpload(previousImage);
  const payload = servicePayload(service);
  const changes = { ...diffChanges(before, payload, SERVICE_AUDIT_FIELDS), ...(image ? { image: { from: previousImage ? 'old image' : null, to: 'new image' } } : {}) };
  if (Object.keys(changes).length) recordAudit({ action: 'service.updated', target: serviceTarget(service), changes, description: `Edited ${service.name}: ${changedFields(changes)}` });
  return payload;
};

export const updateServiceStatus = async ({ id, status }) => {
  const service = await findService(id);
  const previous = service.status;
  await service.update({ status });
  if (previous !== status) {
    recordAudit({ action: 'service.status_changed', target: serviceTarget(service), changes: { status: { from: previous, to: status } }, description: `${service.name} set to ${status}` });
  }
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
    let moved = 0;
    for (const [index, id] of ids.entries()) {
      const service = byId.get(id);
      if (service.sortOrder !== index + 1) { await service.update({ sortOrder: index + 1 }, { transaction }); moved += 1; }
    }
    if (moved) recordAudit({ action: 'services.reordered', description: `New order: ${ids.map((id) => byId.get(id).name).join(', ')}` }, { transaction });
    return ids.map((id) => servicePayload(byId.get(id)));
  });
