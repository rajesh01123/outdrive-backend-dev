import { sequelize } from '../../config/database.js';
import { Service, ServiceVehicleType, VehicleType } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { removeStoredUpload } from '../../shared/utils/image-upload.js';
import { publicProfilePictureUrl as publicUploadUrl } from '../../shared/utils/serializers.js';

export const vehiclePayload = (vehicle) => ({
  id: Number(vehicle.id),
  name: vehicle.name,
  type_key: vehicle.typeKey,
  icon: publicUploadUrl(vehicle.icon),
  description: vehicle.description || '',
  capacity: vehicle.capacity,
  is_shared: Boolean(vehicle.isShared),
  sort_order: vehicle.sortOrder,
  status: vehicle.status
});

const findVehicle = async (id, options = {}) => {
  const vehicle = await VehicleType.findByPk(id, options);
  if (!vehicle) throw new AppError('vehicle_type_not_found', 404);
  return vehicle;
};

export const listVehicleTypes = async () => {
  const vehicles = await VehicleType.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
  const active = vehicles.filter((vehicle) => vehicle.status === 'active').length;
  return {
    stats: { total: vehicles.length, active, inactive: vehicles.length - active, shared: vehicles.filter((vehicle) => vehicle.isShared).length },
    vehicles: vehicles.map(vehiclePayload)
  };
};

export const createVehicleType = async ({ body, icon }) => {
  if (await VehicleType.findOne({ where: { typeKey: body.type_key } })) {
    throw new AppError('vehicle_type_key_exists', 409, { errors: { type_key: 'type_key is already used by another vehicle' } });
  }
  const lastOrder = (await VehicleType.max('sortOrder')) || 0;
  const vehicle = await VehicleType.create({
    name: body.name,
    typeKey: body.type_key,
    icon,
    description: body.description || null,
    capacity: body.capacity,
    isShared: Boolean(body.is_shared),
    status: body.status,
    sortOrder: lastOrder + 1
  });
  return vehiclePayload(vehicle);
};

export const updateVehicleType = async ({ id, body, icon }) => {
  const vehicle = await findVehicle(id);
  if (body.type_key !== undefined && body.type_key !== vehicle.typeKey) {
    throw new AppError('vehicle_type_key_locked', 422, { errors: { type_key: 'type_key cannot be changed after the vehicle is created' } });
  }
  if (body.is_shared !== undefined && body.is_shared !== Boolean(vehicle.isShared)) {
    // Flipping shared would silently break the module mapping rules below.
    const mapped = await ServiceVehicleType.count({ where: { vehicleTypeId: vehicle.id } });
    if (mapped) throw new AppError('vehicle_type_in_use', 422, { errors: { is_shared: 'remove this vehicle from all modules before changing is_shared' } });
  }
  const values = {};
  if (body.name !== undefined) values.name = body.name;
  if (body.description !== undefined) values.description = body.description || null;
  if (body.capacity !== undefined) values.capacity = body.capacity;
  if (body.is_shared !== undefined) values.isShared = body.is_shared;
  if (body.status !== undefined) values.status = body.status;
  const previousIcon = vehicle.icon;
  if (icon) values.icon = icon;
  if (Object.keys(values).length) await vehicle.update(values);
  if (icon && previousIcon !== icon) await removeStoredUpload(previousIcon);
  return vehiclePayload(vehicle);
};

export const updateVehicleStatus = async ({ id, status }) => {
  const vehicle = await findVehicle(id);
  await vehicle.update({ status });
  return vehiclePayload(vehicle);
};

export const reorderVehicleTypes = (ids) =>
  sequelize.transaction(async (transaction) => {
    const vehicles = await VehicleType.findAll({ transaction, lock: transaction.LOCK.UPDATE });
    if (vehicles.length !== ids.length || !vehicles.every((vehicle) => ids.includes(Number(vehicle.id)))) {
      throw new AppError('validation_error', 422, { errors: { ids: 'ids must contain every vehicle exactly once' } });
    }
    const byId = new Map(vehicles.map((vehicle) => [Number(vehicle.id), vehicle]));
    for (const [index, id] of ids.entries()) {
      const vehicle = byId.get(id);
      if (vehicle.sortOrder !== index + 1) await vehicle.update({ sortOrder: index + 1 }, { transaction });
    }
    return ids.map((id) => vehiclePayload(byId.get(id)));
  });

export const getMapping = async () => {
  const [services, vehicles, links] = await Promise.all([
    Service.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] }),
    VehicleType.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] }),
    ServiceVehicleType.findAll()
  ]);
  const mapping = Object.fromEntries(services.map((service) => [Number(service.id), []]));
  for (const link of links) mapping[Number(link.serviceId)]?.push(Number(link.vehicleTypeId));
  return {
    services: services.map((service) => ({ id: Number(service.id), name: service.name, module_key: service.moduleKey, service_type: service.serviceType, section: service.section, status: service.status })),
    vehicles: vehicles.map(vehiclePayload),
    mapping
  };
};

// Full replace: whatever the admin saves is exactly what each module offers.
export const saveMapping = (mapping) =>
  sequelize.transaction(async (transaction) => {
    const [services, vehicles] = await Promise.all([Service.findAll({ transaction }), VehicleType.findAll({ transaction })]);
    const serviceById = new Map(services.map((service) => [Number(service.id), service]));
    const vehicleById = new Map(vehicles.map((vehicle) => [Number(vehicle.id), vehicle]));
    const errors = {};
    for (const [serviceId, vehicleIds] of Object.entries(mapping)) {
      const service = serviceById.get(Number(serviceId));
      if (!service) { errors[`mapping.${serviceId}`] = 'unknown module'; continue; }
      const unknown = vehicleIds.filter((id) => !vehicleById.has(id));
      if (unknown.length) { errors[`mapping.${serviceId}`] = `unknown vehicle ids: ${unknown.join(', ')}`; continue; }
      // Shared modules sell seats, so they only take shared vehicles — and other modules never do.
      const wantsShared = service.serviceType === 'shared_ride';
      const wrong = vehicleIds.map((id) => vehicleById.get(id)).filter((vehicle) => Boolean(vehicle.isShared) !== wantsShared);
      if (wrong.length) {
        errors[`mapping.${serviceId}`] = wantsShared
          ? `${service.name} accepts only shared vehicles (not ${wrong.map((vehicle) => vehicle.name).join(', ')})`
          : `${service.name} cannot use shared vehicles (${wrong.map((vehicle) => vehicle.name).join(', ')})`;
      }
    }
    if (Object.keys(errors).length) throw new AppError('validation_error', 422, { errors });

    for (const [serviceId, vehicleIds] of Object.entries(mapping)) {
      await ServiceVehicleType.destroy({ where: { serviceId: Number(serviceId) }, transaction });
      if (vehicleIds.length) {
        await ServiceVehicleType.bulkCreate(vehicleIds.map((vehicleTypeId) => ({ serviceId: Number(serviceId), vehicleTypeId })), { transaction });
      }
    }
  }).then(getMapping);
