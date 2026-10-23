import { sequelize } from '../../config/database.js';
import { Service, ServiceVehicleType, VehicleType, ZoneVehicleFare } from '../../database/models/index.js';
import { vehicleCategoryMismatch, vehicleModuleMismatch } from '../../shared/fleet/vehicle-rules.js';
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
  use_for: vehicle.useFor,
  wheels: vehicle.wheels,
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
    useFor: body.use_for,
    wheels: body.wheels,
    status: body.status,
    sortOrder: lastOrder + 1
  });
  return vehiclePayload(vehicle);
};

// Changing shared / use for / wheels must not break the modules and active fares the vehicle already has.
const assertStillFits = async (vehicle, body) => {
  const next = {
    name: body.name ?? vehicle.name,
    isShared: body.is_shared ?? Boolean(vehicle.isShared),
    useFor: body.use_for ?? vehicle.useFor,
    wheels: body.wheels ?? vehicle.wheels
  };
  if (next.isShared === Boolean(vehicle.isShared) && next.useFor === vehicle.useFor && Number(next.wheels) === Number(vehicle.wheels)) return;
  const [services, fares] = await Promise.all([
    vehicle.getServices(),
    ZoneVehicleFare.findAll({ where: { vehicleTypeId: vehicle.id, status: 'active' }, attributes: ['fareCategory'] })
  ]);
  const badModules = services.filter((service) => vehicleModuleMismatch(next, service)).map((service) => service.name);
  const badFares = [...new Set(fares.filter((fare) => vehicleCategoryMismatch(next, fare.fareCategory)).map((fare) => fare.fareCategory))];
  if (!badModules.length && !badFares.length) return;
  const parts = [];
  if (badModules.length) parts.push(`remove it from ${badModules.join(', ')} (Module mapping)`);
  if (badFares.length) parts.push(`switch off its ${badFares.join(', ')} fares (Fare settings)`);
  throw new AppError('vehicle_type_in_use', 422, { errors: { use_for: `This change does not fit where the vehicle is used — first ${parts.join(' and ')}.` } });
};

export const updateVehicleType = async ({ id, body, icon }) => {
  const vehicle = await findVehicle(id);
  if (body.type_key !== undefined && body.type_key !== vehicle.typeKey) {
    throw new AppError('vehicle_type_key_locked', 422, { errors: { type_key: 'type_key cannot be changed after the vehicle is created' } });
  }
  await assertStillFits(vehicle, body);
  const values = {};
  if (body.name !== undefined) values.name = body.name;
  if (body.description !== undefined) values.description = body.description || null;
  if (body.capacity !== undefined) values.capacity = body.capacity;
  if (body.is_shared !== undefined) values.isShared = body.is_shared;
  if (body.use_for !== undefined) values.useFor = body.use_for;
  if (body.wheels !== undefined) values.wheels = body.wheels;
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
  // blocked[serviceId][vehicleId] = why that vehicle cannot be ticked for that module (the grid disables it).
  const blocked = Object.fromEntries(services.map((service) => [
    Number(service.id),
    Object.fromEntries(vehicles.map((vehicle) => [Number(vehicle.id), vehicleModuleMismatch(vehicle, service)]).filter(([, reason]) => reason))
  ]));
  return {
    services: services.map((service) => ({ id: Number(service.id), name: service.name, module_key: service.moduleKey, service_type: service.serviceType, section: service.section, status: service.status })),
    vehicles: vehicles.map(vehiclePayload),
    mapping,
    blocked
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
      const reasons = vehicleIds.map((id) => vehicleModuleMismatch(vehicleById.get(id), service)).filter(Boolean);
      if (reasons.length) errors[`mapping.${serviceId}`] = [...new Set(reasons)].join('; ');
    }
    if (Object.keys(errors).length) throw new AppError('validation_error', 422, { errors });

    for (const [serviceId, vehicleIds] of Object.entries(mapping)) {
      await ServiceVehicleType.destroy({ where: { serviceId: Number(serviceId) }, transaction });
      if (vehicleIds.length) {
        await ServiceVehicleType.bulkCreate(vehicleIds.map((vehicleTypeId) => ({ serviceId: Number(serviceId), vehicleTypeId })), { transaction });
      }
    }
  }).then(getMapping);
