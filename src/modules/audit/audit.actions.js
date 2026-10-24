// Every action the audit log records: key → [module, label]. The admin filter lists these, grouped by module.
export const AUDIT_MODULES = {
  auth: 'Admin login & security',
  profile: 'Admin profile',
  users: 'Users',
  services: 'Services',
  zones: 'Zones',
  vehicles: 'Vehicles',
  fares: 'Fares',
  bookings: 'Bookings',
  banners: 'Banners',
  content: 'Content',
  coupons: 'Coupons',
  app: 'User app'
};

export const AUDIT_ACTIONS = {
  'admin.login': ['auth', 'Admin login'],
  'admin.login_failed': ['auth', 'Admin login failed'],
  'admin.logout': ['auth', 'Admin logout'],
  'admin.password_reset_requested': ['auth', 'Password reset requested'],
  'admin.password_reset': ['auth', 'Password reset'],
  'admin.password_changed': ['profile', 'Password changed'],
  'admin.profile_updated': ['profile', 'Profile updated'],
  'admin.2fa_enabled': ['profile', 'Two-factor enabled'],
  'admin.2fa_disabled': ['profile', 'Two-factor disabled'],

  'user.updated': ['users', 'User updated'],
  'user.status_changed': ['users', 'User status changed'],
  'user.deleted': ['users', 'User deleted'],

  'service.updated': ['services', 'Service updated'],
  'service.status_changed': ['services', 'Service status changed'],
  'services.reordered': ['services', 'Services reordered'],

  'zone.created': ['zones', 'Zone created'],
  'zone.updated': ['zones', 'Zone updated'],
  'zone.status_changed': ['zones', 'Zone status changed'],
  'zone.service_changed': ['zones', 'Zone service changed'],

  'vehicle.created': ['vehicles', 'Vehicle created'],
  'vehicle.updated': ['vehicles', 'Vehicle updated'],
  'vehicle.status_changed': ['vehicles', 'Vehicle status changed'],
  'vehicles.reordered': ['vehicles', 'Vehicles reordered'],
  'vehicles.mapping_saved': ['vehicles', 'Vehicle mapping saved'],

  'fare.saved': ['fares', 'Fare saved'],
  'fare.copied': ['fares', 'Fares copied'],
  'fare.status_changed': ['fares', 'Fare status changed'],

  'booking.cancelled': ['bookings', 'Booking cancelled'],

  'banner.created': ['banners', 'Banner created'],
  'banner.updated': ['banners', 'Banner updated'],
  'banner.status_changed': ['banners', 'Banner status changed'],
  'banners.reordered': ['banners', 'Banners reordered'],
  'banner.deleted': ['banners', 'Banner deleted'],

  'page.created': ['content', 'Page created'],
  'page.updated': ['content', 'Page updated'],
  'page.status_changed': ['content', 'Page status changed'],
  'pages.reordered': ['content', 'Pages reordered'],
  'page.deleted': ['content', 'Page deleted'],
  'faq.created': ['content', 'FAQ created'],
  'faq.updated': ['content', 'FAQ updated'],
  'faq.status_changed': ['content', 'FAQ status changed'],
  'faqs.reordered': ['content', 'FAQs reordered'],
  'faq.deleted': ['content', 'FAQ deleted'],
  'support_contact.created': ['content', 'Support contact created'],
  'support_contact.updated': ['content', 'Support contact updated'],
  'support_contact.status_changed': ['content', 'Support contact status changed'],
  'support_contacts.reordered': ['content', 'Support contacts reordered'],
  'support_contact.deleted': ['content', 'Support contact deleted'],
  'onboarding.created': ['content', 'Onboarding slide created'],
  'onboarding.updated': ['content', 'Onboarding slide updated'],
  'onboarding.status_changed': ['content', 'Onboarding slide status changed'],
  'onboarding.reordered': ['content', 'Onboarding slides reordered'],
  'onboarding.deleted': ['content', 'Onboarding slide deleted'],

  'coupon.created': ['coupons', 'Coupon created'],
  'coupon.updated': ['coupons', 'Coupon updated'],
  'coupon.status_changed': ['coupons', 'Coupon status changed'],
  'coupon.deleted': ['coupons', 'Coupon deleted'],

  'app.user_registered': ['app', 'User signed up'],
  'app.user_login': ['app', 'User login'],
  'app.user_login_failed': ['app', 'User login failed'],
  'app.user_logout': ['app', 'User logout'],
  'app.profile_updated': ['app', 'User profile updated'],
  'app.account_deleted': ['app', 'User deleted account']
};

export const actionModule = (action) => AUDIT_ACTIONS[action]?.[0];
export const actionLabel = (action) => AUDIT_ACTIONS[action]?.[1] || action;
