import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Service, Zone, ZoneService, ZoneVehicleFare } from '../../database/models/index.js';
import { fromGeoJsonPolygon, isSelfIntersecting, polygonArea, polygonBounds, polygonsOverlap, toGeoJsonPolygon } from '../../shared/geo/geo.js';
import { AppError } from '../../shared/utils/app-error.js';
import { checkServiceability, ZONE_CURRENCY } from '../zone/zone.service.js';

const polygonError = (message) => new AppError('validation_error', 422, { errors: { polygon: message } });

const assertValidPolygon = (ring) => {
  // Crossing first: a symmetric "bowtie" also has zero net area, and crossing is the real problem there.
  if (isSelfIntersecting(ring)) throw polygonError('polygon edges must not cross each other');
  if (polygonArea(ring) < 1e-8) throw polygonError('polygon has no area; points must not lie on one line');
};

const polygonColumns = (ring) => ({ polygon: toGeoJsonPolygon(ring), ...polygonBounds(ring) });

const assertUniqueName = async (name, exceptId) => {
  const where = { name };
  if (exceptId) where.id = { [Op.ne]: exceptId };
  if (await Zone.findOne({ where })) throw new AppError('zone_name_exists', 409, { errors: { name: 'another zone already uses this name' } });
};

// Overlap is allowed (priority decides), but the admin is warned about it.
const overlapWarnings = async (ring, exceptId) => {
  const where = { status: 'active' };
  if (exceptId) where.id = { [Op.ne]: exceptId };
  const zones = await Zone.findAll({ where });
  return zones
    .filter((zone) => polygonsOverlap(ring, fromGeoJsonPolygon(zone.polygon)))
    .map((zone) => ({ id: Number(zone.id), name: zone.name, priority: zone.priority }));
};

const zoneModules = async (zoneId) => {
  const [services, links] = await Promise.all([
    Service.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] }),
    ZoneService.findAll({ where: { zoneId } })
  ]);
  const enabled = new Map(links.map((link) => [Number(link.serviceId), link.isEnabled]));
  return services.map((service) => ({
    service_id: Number(service.id),
    module_key: service.moduleKey,
    name: service.name,
    module_status: service.status,
    is_enabled: Boolean(enabled.get(Number(service.id)))
  }));
};

const zonePayload = async (zone) => {
  const modules = await zoneModules(zone.id);
  return {
    id: Number(zone.id),
    name: zone.name,
    polygon: fromGeoJsonPolygon(zone.polygon),
    priority: zone.priority,
    status: zone.status,
    ...ZONE_CURRENCY,
    modules,
    modules_enabled: modules.filter((module) => module.is_enabled).length,
    fares_count: await ZoneVehicleFare.count({ where: { zoneId: zone.id } })
  };
};

const findZone = async (id, options = {}) => {
  const zone = await Zone.findByPk(id, options);
  if (!zone) throw new AppError('zone_not_found', 404);
  return zone;
};

const saveModules = async (zoneId, enabledIds, transaction) => {
  const services = await Service.findAll({ transaction });
  const unknown = enabledIds.filter((id) => !services.some((service) => Number(service.id) === id));
  if (unknown.length) throw new AppError('validation_error', 422, { errors: { enabled_module_ids: `unknown module ids: ${unknown.join(', ')}` } });
  for (const service of services) {
    const isEnabled = enabledIds.includes(Number(service.id));
    const [link] = await ZoneService.findOrCreate({ where: { zoneId, serviceId: service.id }, defaults: { isEnabled }, transaction });
    if (link.isEnabled !== isEnabled) await link.update({ isEnabled }, { transaction });
  }
};

export const listZones = async () => {
  const zones = await Zone.findAll({ order: [['priority', 'DESC'], ['name', 'ASC']] });
  const [links, fares] = await Promise.all([
    ZoneService.findAll({ where: { isEnabled: true }, attributes: ['zoneId'] }),
    ZoneVehicleFare.findAll({ attributes: ['zoneId'] })
  ]);
  const countBy = (rows) => rows.reduce((map, row) => map.set(Number(row.zoneId), (map.get(Number(row.zoneId)) || 0) + 1), new Map());
  const enabledCounts = countBy(links);
  const fareCounts = countBy(fares);
  const totalModules = await Service.count();
  return {
    stats: { total: zones.length, active: zones.filter((zone) => zone.status === 'active').length, inactive: zones.filter((zone) => zone.status === 'inactive').length },
    total_modules: totalModules,
    zones: zones.map((zone) => ({
      id: Number(zone.id),
      name: zone.name,
      priority: zone.priority,
      status: zone.status,
      points: fromGeoJsonPolygon(zone.polygon).length,
      modules_enabled: enabledCounts.get(Number(zone.id)) || 0,
      fares_count: fareCounts.get(Number(zone.id)) || 0
    }))
  };
};

export const getZone = async (id) => zonePayload(await findZone(id));

export const createZone = async (body) => {
  assertValidPolygon(body.polygon);
  await assertUniqueName(body.name);
  const zone = await sequelize.transaction(async (transaction) => {
    const created = await Zone.create({ name: body.name, priority: body.priority, status: body.status, ...polygonColumns(body.polygon) }, { transaction });
    // A new zone gets every module switched on unless the admin chose otherwise.
    const enabledIds = body.enabled_module_ids ?? (await Service.findAll({ attributes: ['id'], transaction })).map((service) => Number(service.id));
    await saveModules(created.id, enabledIds, transaction);
    return created;
  });
  return { zone: await zonePayload(zone), warnings: { overlaps: await overlapWarnings(body.polygon, zone.id) } };
};

export const updateZone = async ({ id, body }) => {
  const zone = await findZone(id);
  if (body.polygon) assertValidPolygon(body.polygon);
  if (body.name !== undefined) await assertUniqueName(body.name, zone.id);
  await sequelize.transaction(async (transaction) => {
    const values = {};
    if (body.name !== undefined) values.name = body.name;
    if (body.priority !== undefined) values.priority = body.priority;
    if (body.status !== undefined) values.status = body.status;
    if (body.polygon) Object.assign(values, polygonColumns(body.polygon));
    if (Object.keys(values).length) await zone.update(values, { transaction });
    if (body.enabled_module_ids) await saveModules(zone.id, body.enabled_module_ids, transaction);
  });
  return { zone: await zonePayload(zone), warnings: { overlaps: await overlapWarnings(fromGeoJsonPolygon(zone.polygon), zone.id) } };
};

export const updateZoneStatus = async ({ id, status }) => {
  const zone = await findZone(id);
  await zone.update({ status });
  return zonePayload(zone);
};

export const setZoneModule = async ({ id, serviceId, isEnabled }) => {
  const zone = await findZone(id);
  if (!(await Service.findByPk(serviceId))) throw new AppError('service_not_found', 404);
  const [link] = await ZoneService.findOrCreate({ where: { zoneId: zone.id, serviceId }, defaults: { isEnabled } });
  if (link.isEnabled !== isEnabled) await link.update({ isEnabled });
  return zonePayload(zone);
};

export const testPoint = async ({ lat, lng, moduleKey }) => {
  const result = await checkServiceability({ lat, lng, moduleKey });
  return {
    is_serviceable: result.isServiceable,
    reason: result.reason,
    zone: result.zone ? { id: Number(result.zone.id), name: result.zone.name, priority: result.zone.priority } : null,
    matched_zones: result.matchedZones.map((zone) => ({ id: Number(zone.id), name: zone.name, priority: zone.priority })),
    module: result.service ? { id: Number(result.service.id), module_key: result.service.moduleKey, name: result.service.name, status: result.service.status } : null
  };
};
