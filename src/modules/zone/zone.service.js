import { Op } from 'sequelize';
import { Service, Zone, ZoneService } from '../../database/models/index.js';
import { fromGeoJsonPolygon, pointInPolygon } from '../../shared/geo/geo.js';

export const ZONE_CURRENCY = { currency: 'INR', currency_symbol: '₹', distance_unit: 'km' };

// Active zones containing the point, best match first (highest priority, then oldest).
export const findZonesForPoint = async ({ lat, lng }) => {
  const candidates = await Zone.findAll({
    where: {
      status: 'active',
      minLat: { [Op.lte]: lat },
      maxLat: { [Op.gte]: lat },
      minLng: { [Op.lte]: lng },
      maxLng: { [Op.gte]: lng }
    },
    order: [['priority', 'DESC'], ['id', 'ASC']]
  });
  return candidates.filter((zone) => pointInPolygon([lat, lng], fromGeoJsonPolygon(zone.polygon)));
};

/**
 * Shared by ZONE-01 and the admin "test location" tool, so both always agree.
 * reason: available | unknown_module | module_inactive | module_coming_soon | out_of_service_area | module_disabled_in_zone
 */
export const checkServiceability = async ({ lat, lng, moduleKey }) => {
  const service = await Service.findOne({ where: { moduleKey } });
  const zones = await findZonesForPoint({ lat, lng });
  const zone = zones[0] || null;
  const result = (reason) => ({ isServiceable: reason === 'available', reason, zone, service, matchedZones: zones });

  if (!service) return result('unknown_module');
  if (service.status === 'inactive') return result('module_inactive');
  if (service.status === 'coming_soon') return result('module_coming_soon');
  if (!zone) return result('out_of_service_area');
  const link = await ZoneService.findOne({ where: { zoneId: zone.id, serviceId: service.id } });
  if (!link?.isEnabled) return result('module_disabled_in_zone');
  return result('available');
};
