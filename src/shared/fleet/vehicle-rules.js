// Which vehicle may serve which ride module / fare category. One source for mapping, fares and the admin grid.
export const USE_FOR = ['ride', 'parcel', 'both'];
export const WHEELS = [2, 3, 4];

const useForLabel = { ride: 'ride', parcel: 'parcel' };

/** What a module needs from a vehicle: rides or parcels, shared seats, and (for some) a wheel count. */
export const moduleRequirement = (service) => {
  if (service.serviceType === 'shared_ride') return { useFor: 'ride', shared: true, wheels: null };
  if (service.section === 'parcel') {
    const wheels = { parcel_bike: 2, parcel_3wheeler: 3 }[service.moduleKey] ?? null;
    return { useFor: 'parcel', shared: false, wheels };
  }
  if (service.serviceType === 'outstation') return { useFor: 'ride', shared: false, wheels: 4 };
  return { useFor: 'ride', shared: false, wheels: null };
};

const categoryRequirement = {
  city: { useFor: 'ride', shared: false, wheels: null },
  shared: { useFor: 'ride', shared: true, wheels: null },
  outstation: { useFor: 'ride', shared: false, wheels: 4 },
  parcel: { useFor: 'parcel', shared: false, wheels: null }
};

// Returns why the vehicle does not fit, or null when it does.
const mismatch = (vehicle, need, target) => {
  const isShared = Boolean(vehicle.isShared);
  if (need.shared && !isShared) return `${target} only takes shared vehicles`;
  if (!need.shared && isShared) return `shared vehicles only work in Shared Ride`;
  if (vehicle.useFor !== 'both' && vehicle.useFor !== need.useFor) return `${vehicle.name} is a ${useForLabel[vehicle.useFor]} vehicle; ${target} needs a ${need.useFor} vehicle`;
  if (need.wheels && Number(vehicle.wheels) !== need.wheels) return `${target} only takes ${need.wheels}-wheelers`;
  return null;
};

export const vehicleModuleMismatch = (vehicle, service) => mismatch(vehicle, moduleRequirement(service), service.name);

export const vehicleCategoryMismatch = (vehicle, fareCategory) => mismatch(vehicle, categoryRequirement[fareCategory], `the ${fareCategory} fare`);
