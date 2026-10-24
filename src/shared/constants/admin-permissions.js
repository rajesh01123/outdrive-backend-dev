// Every checkbox on the admin Roles page. Each module has "view" and, where something can be changed, "manage".
// "manage" covers every change in that module (add, edit, on/off, reorder, delete) and always includes "view".
// A role stores the keys it was given ("zones.manage"); the Super Admin role stores ALL_PERMISSIONS instead,
// so it also gets every module added here later.
export const ALL_PERMISSIONS = '*';

export const PERMISSION_GROUPS = [
  { key: 'bookings', label: 'Bookings & parcels', view: 'See bookings, parcels and their details', manage: 'Cancel bookings and edit parcel goods types' },
  { key: 'users', label: 'Users', view: 'See customers and their details', manage: 'Edit, block and delete customers' },
  { key: 'services', label: 'Services', view: 'See the ride modules', manage: 'Edit modules, switch them on/off and reorder' },
  { key: 'zones', label: 'Zones', view: 'See zones on the map', manage: 'Add and edit zones, switch zones and their services on/off' },
  { key: 'vehicles', label: 'Vehicles', view: 'See vehicle types and module mapping', manage: 'Add and edit vehicle types, icons, order and mapping' },
  { key: 'fares', label: 'Fares', view: 'See fares, history and the fare calculator', manage: 'Set, copy and switch fares on/off' },
  { key: 'banners', label: 'Banners', view: 'See banners', manage: 'Add, edit, reorder and delete banners' },
  { key: 'content', label: 'Content', view: 'See pages, FAQs, support contacts and onboarding slides', manage: 'Add, edit, reorder and delete content' },
  { key: 'coupons', label: 'Coupons', view: 'See coupons and how often they were used', manage: 'Add, edit, switch off and delete coupons' },
  { key: 'staff', label: 'Staff', view: 'See admin staff', manage: 'Add and edit staff, block them, reset passwords and delete' },
  { key: 'roles', label: 'Roles', view: 'See roles and their permissions', manage: 'Add, edit, switch off and delete roles' },
  { key: 'audit', label: 'Audit logs', view: 'See who did what in the admin panel and the app', manage: null }
];

const groupKeys = (group) => [`${group.key}.view`, ...(group.manage ? [`${group.key}.manage`] : [])];

/** Every permission key, in checkbox order. */
export const PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(groupKeys);

const viewOf = (key) => key.replace(/\.manage$/, '.view');

/** True when the list grants `permission`; "x.manage" also grants "x.view". */
export const hasPermission = (permissions, permission) => {
  if (!Array.isArray(permissions)) return false;
  if (permissions.includes(ALL_PERMISSIONS) || permissions.includes(permission)) return true;
  return permission.endsWith('.view') && permissions.includes(permission.replace(/\.view$/, '.manage'));
};

/** Known keys only, each "manage" together with its "view", in checkbox order. */
export const normalizePermissions = (keys) => {
  const given = new Set(keys);
  for (const key of keys) if (key.endsWith('.manage')) given.add(viewOf(key));
  return PERMISSION_KEYS.filter((key) => given.has(key));
};

/** Every key the list grants: "*" becomes the full list. */
export const expandPermissions = (permissions) =>
  (permissions?.includes(ALL_PERMISSIONS) ? [...PERMISSION_KEYS] : normalizePermissions(permissions || []));

/** True when `granted` covers everything in `wanted`, so nobody can hand out more access than they have. */
export const coversPermissions = (granted, wanted) => {
  if (wanted?.includes(ALL_PERMISSIONS)) return Boolean(granted?.includes(ALL_PERMISSIONS));
  return (wanted || []).every((key) => hasPermission(granted, key));
};

/** "zones.manage" → "Zones: manage", for audit log descriptions. */
export const permissionLabel = (key) => {
  const [module, action] = key.split('.');
  const group = PERMISSION_GROUPS.find((item) => item.key === module);
  return `${group?.label || module}: ${action}`;
};

/** The checkbox list for the Roles page. */
export const permissionGroupsPayload = () => PERMISSION_GROUPS.map((group) => ({
  key: group.key,
  label: group.label,
  view: { key: `${group.key}.view`, description: group.view },
  manage: group.manage ? { key: `${group.key}.manage`, description: group.manage } : null
}));
