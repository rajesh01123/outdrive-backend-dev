import { env } from './env.js';

const json = (schema, example) => ({
  content: { 'application/json': { schema, ...(example ? { example } : {}) } }
});

const success = (message, data) => ({
  type: 'object',
  required: ['success', 'message', 'data'],
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    data: { type: 'object', example: data }
  }
});

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'OutDrive User API',
    version: '1.0.0',
    description: 'Customer authentication and profile APIs. Google/Apple social login is intentionally not included in this phase.'
  },
  servers: [{ url: `${env.appUrl}${env.apiPrefix}`, description: 'Current environment' }],
  tags: [
    { name: 'Auth', description: 'Mobile OTP authentication' },
    { name: 'User', description: 'Authenticated customer profile APIs' }
  ],
  paths: {
    '/auth/validate-mobile': {
      post: {
        tags: ['Auth'], summary: 'AUTH-01 — check whether a mobile is registered',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MobileDeviceInput' } } } },
        responses: {
          200: json(success('mobile_exists', { is_existing_user: true }), { success: true, message: 'mobile_exists', data: { is_existing_user: true } }),
          422: { $ref: '#/components/responses/ValidationError' }
        }
      }
    },
    '/auth/send-otp': {
      post: {
        tags: ['Auth'], summary: 'AUTH-02 — send OTP',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SendOtpInput' } } } },
        responses: {
          200: json(success('otp_sent', { otp: '123456', expires_in_sec: 300, resend_after_sec: 30 }), { success: true, message: 'otp_sent', data: { otp: '123456', expires_in_sec: 300, resend_after_sec: 30 } }),
          404: { $ref: '#/components/responses/UserNotFoundUseRegister' },
          409: { $ref: '#/components/responses/MobileAlreadyRegistered' },
          422: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/OtpRateLimited' },
          503: { $ref: '#/components/responses/SmsUnavailable' }
        }
      }
    },
    '/auth/verify-otp': {
      post: {
        tags: ['Auth'], summary: 'AUTH-03 — validate latest OTP and receive optional OTP proof',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OtpVerifyInput' } } } },
        responses: {
          200: json(success('otp_valid', { otp_token: 'short-lived-otp-proof' }), { success: true, message: 'otp_valid', data: { otp_token: 'short-lived-otp-proof' } }),
          400: { $ref: '#/components/responses/OtpInvalid' },
          422: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/OtpAttemptsExceeded' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'AUTH-04 — log in an existing user with mobile OTP',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OtpVerifyInput' } } } },
        responses: {
          200: json(success('login_success', { access_token: 'eyJhbGciOi...', token_type: 'Bearer', is_new_user: false, profile_complete: true, user: { id: 'u_123', name: 'Rahul', mobile: '9977112912', country_code: '91', profile_picture: '' } }), { success: true, message: 'login_success', data: { access_token: 'eyJhbGciOi...', token_type: 'Bearer', is_new_user: false, profile_complete: true, user: { id: 'u_123', name: 'Rahul', mobile: '9977112912', country_code: '91', profile_picture: '' } } }),
          400: { $ref: '#/components/responses/OtpInvalid' },
          403: { $ref: '#/components/responses/UserBlocked' },
          404: { $ref: '#/components/responses/UserNotFoundUseRegister' },
          422: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/OtpAttemptsExceeded' }
        }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'AUTH-05 — register a new user; name is mandatory',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } },
            'multipart/form-data': { schema: { $ref: '#/components/schemas/RegisterMultipartInput' } }
          }
        },
        responses: {
          201: json(success('register_success', { access_token: 'eyJhbGciOi...', token_type: 'Bearer', is_new_user: true, profile_complete: true, user: { id: 'u_124', name: 'Rahul Sharma', mobile: '9977112912', country_code: '91', profile_picture: '' } }), { success: true, message: 'register_success', data: { access_token: 'eyJhbGciOi...', token_type: 'Bearer', is_new_user: true, profile_complete: true, user: { id: 'u_124', name: 'Rahul Sharma', mobile: '9977112912', country_code: '91', profile_picture: '' } } }),
          400: { $ref: '#/components/responses/OtpInvalid' },
          409: { $ref: '#/components/responses/MobileAlreadyRegistered' },
          422: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/OtpAttemptsExceeded' }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'], summary: 'AUTH-08 — revoke the current device session', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LogoutInput' } } } },
        responses: {
          200: json(success('logged_out', {}), { success: true, message: 'logged_out', data: {} }),
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/UserBlocked' },
          422: { $ref: '#/components/responses/ValidationError' }
        }
      }
    },
    '/user': {
      get: {
        tags: ['User'], summary: 'AUTH-07 — get authenticated user', security: [{ bearerAuth: [] }],
        responses: {
          200: json(success('OK', { id: 'u_123', name: 'Rahul', mobile: '9977112912', country_code: '91', gender: '', map_type: '', profile_picture: '', wallet_balance: 0, emergency_contact_name: '', emergency_contact_number: '', locale: 'en' }), { success: true, message: 'OK', data: { id: 'u_123', name: 'Rahul', mobile: '9977112912', country_code: '91', gender: '', map_type: '', profile_picture: '', wallet_balance: 0, emergency_contact_name: '', emergency_contact_number: '', locale: 'en' } }),
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/UserBlocked' }
        }
      }
    },
    '/user/profile': {
      post: {
        tags: ['User'], summary: 'AUTH-06 — update profile', security: [{ bearerAuth: [] }],
        requestBody: { required: false, content: { 'multipart/form-data': { schema: { $ref: '#/components/schemas/ProfileUpdateInput' } }, 'application/json': { schema: { $ref: '#/components/schemas/ProfileUpdateInput' } } } },
        responses: {
          200: json(success('profile_updated', { user: { id: 'u_123', name: 'Rahul Sharma', mobile: '9977112912', country_code: '91', gender: 'male', map_type: 'google_map', profile_picture: '', wallet_balance: 0, emergency_contact_name: '', emergency_contact_number: '', locale: 'en' } }), { success: true, message: 'profile_updated', data: { user: { id: 'u_123', name: 'Rahul Sharma', mobile: '9977112912', country_code: '91', gender: 'male', map_type: 'google_map', profile_picture: '', wallet_balance: 0, emergency_contact_name: '', emergency_contact_number: '', locale: 'en' } } }),
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/UserBlocked' },
          422: { $ref: '#/components/responses/ValidationError' }
        }
      }
    },
    '/user/delete-account': {
      post: {
        tags: ['User'], summary: 'AUTH-09 — soft delete account after delete-account OTP', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteAccountInput' } } } },
        responses: {
          200: json(success('account_deleted', {}), { success: true, message: 'account_deleted', data: {} }),
          400: { $ref: '#/components/responses/OtpInvalid' },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/OtpAttemptsExceeded' }
        }
      }
    }
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      MobileDeviceInput: {
        type: 'object', required: ['mobile', 'country_code', 'device_token', 'login_by'],
        properties: { mobile: { type: 'string', example: '9977112912' }, country_code: { type: 'string', example: '91' }, device_token: { type: 'string', example: 'stable-device-id-or-fcm' }, login_by: { type: 'string', enum: ['android', 'ios'], example: 'android' } }
      },
      SendOtpInput: {
        allOf: [{ $ref: '#/components/schemas/MobileDeviceInput' }, { type: 'object', required: ['purpose'], properties: { purpose: { type: 'string', enum: ['login', 'signup', 'delete_account'], example: 'login' } } }]
      },
      OtpVerifyInput: {
        allOf: [{ $ref: '#/components/schemas/MobileDeviceInput' }, { type: 'object', required: ['otp'], properties: { otp: { type: 'string', pattern: '^\\d{6}$', example: '123456' } } }]
      },
      RegisterInput: {
        allOf: [{ $ref: '#/components/schemas/OtpVerifyInput' }, { type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 2, maxLength: 80, example: 'Rahul Sharma' } } }]
      },
      RegisterMultipartInput: {
        allOf: [{ $ref: '#/components/schemas/RegisterInput' }, { type: 'object', properties: { profile_picture: { type: 'string', format: 'binary', description: 'JPEG, PNG, or WebP; maximum 5 MB' } } }]
      },
      LogoutInput: { type: 'object', required: ['device_token'], properties: { device_token: { type: 'string', example: 'stable-device-id-or-fcm' } } },
      ProfileUpdateInput: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 80, example: 'Rahul Sharma' },
          mobile: { type: 'string', description: 'May be submitted only if unchanged; mobile changes need a future verification flow.', example: '9977112912' },
          country_code: { type: 'string', example: '91' },
          gender: { type: 'string', enum: ['male', 'female', 'others'], example: 'male' },
          map_type: { type: 'string', enum: ['google_map'], example: 'google_map' },
          profile_picture: { type: 'string', format: 'binary', description: 'JPEG, PNG, or WebP; maximum 5 MB' }
        }
      },
      DeleteAccountInput: { type: 'object', required: ['otp'], properties: { otp: { type: 'string', pattern: '^\\d{6}$', example: '123456' }, reason: { type: 'string', maxLength: 500, example: 'No longer need the service' } } },
      ErrorResponse: { type: 'object', required: ['success', 'message', 'data'], properties: { success: { type: 'boolean', example: false }, message: { type: 'string', example: 'validation_error' }, data: { type: 'object' } } }
    },
    responses: {
      ValidationError: { description: 'Invalid input', ...json({ $ref: '#/components/schemas/ErrorResponse' }, { success: false, message: 'validation_error', data: { errors: { mobile: 'mobile must contain exactly 10 digits' } } }) },
      Unauthorized: { description: 'Missing, invalid, expired, or revoked bearer token', ...json({ $ref: '#/components/schemas/ErrorResponse' }, { success: false, message: 'invalid_or_expired_token', data: {} }) },
      UserBlocked: { description: 'The account is blocked', ...json({ $ref: '#/components/schemas/ErrorResponse' }, { success: false, message: 'user_blocked', data: {} }) },
      UserNotFoundUseRegister: { description: 'Mobile has no registered active account', ...json({ $ref: '#/components/schemas/ErrorResponse' }, { success: false, message: 'user_not_found_use_register', data: { is_new_user: true, next: 'register' } }) },
      MobileAlreadyRegistered: { description: 'Mobile already belongs to an account', ...json({ $ref: '#/components/schemas/ErrorResponse' }, { success: false, message: 'mobile_already_registered', data: {} }) },
      OtpInvalid: { description: 'OTP not found, invalid, expired, or already used', ...json({ $ref: '#/components/schemas/ErrorResponse' }, { success: false, message: 'invalid_otp', data: { remaining_attempts: 4 } }) },
      OtpAttemptsExceeded: { description: 'OTP has exceeded its five permitted attempts', ...json({ $ref: '#/components/schemas/ErrorResponse' }, { success: false, message: 'otp_attempts_exceeded', data: {} }) },
      OtpRateLimited: { description: 'Resend cooldown or daily OTP cap reached', ...json({ $ref: '#/components/schemas/ErrorResponse' }, { success: false, message: 'otp_resend_not_allowed', data: { resend_after_sec: 18 } }) },
      SmsUnavailable: { description: 'Production SMS adapter is not configured', ...json({ $ref: '#/components/schemas/ErrorResponse' }, { success: false, message: 'sms_provider_not_configured', data: {} }) }
    }
  }
};

const adminBearer = [{ adminBearerAuth: [] }];
const adminJsonBody = (schema) => ({ required: true, content: { 'application/json': { schema } } });
const adminSuccess = (message, data) => json(success(message, data), { success: true, message, data });

openApiSpec.tags.push({ name: 'Admin auth', description: 'Single-device admin login, profile, password and 2FA APIs' });
openApiSpec.components.securitySchemes.adminBearerAuth = { type: 'http', scheme: 'bearer', bearerFormat: 'Admin JWT' };
Object.assign(openApiSpec.paths, {
  '/admin/auth/login': { post: { tags: ['Admin auth'], summary: 'Admin login; returns a single-device conflict or 2FA challenge when needed', requestBody: adminJsonBody({ type: 'object', required: ['email', 'password', 'device_id'], properties: { email: { type: 'string', example: 'admin@outdrive.local' }, password: { type: 'string', example: 'ChangeMe123!' }, device_id: { type: 'string', example: 'browser-device-uuid' }, device_name: { type: 'string', example: 'Chrome on Windows' } } }), responses: { 200: adminSuccess('admin_login_success', { access_token: 'eyJ...', token_type: 'Bearer', admin: { id: 'a_1', name: 'OutDrive Admin', role: 'super_admin' } }), 401: { description: 'Invalid credentials' }, 403: { description: 'Blocked or inactive admin' }, 409: { description: 'Another active device; use confirm-new-device-login', content: { 'application/json': { example: { success: false, message: 'admin_active_session_exists', data: { login_challenge_token: 'short-lived-token', active_device: 'Chrome on Windows' } } } } } } } },
  '/admin/auth/verify-2fa': { post: { tags: ['Admin auth'], summary: 'Verify login 2FA OTP', requestBody: adminJsonBody({ type: 'object', required: ['two_factor_challenge_token', 'otp'], properties: { two_factor_challenge_token: { type: 'string' }, otp: { type: 'string', example: '123456' } } }), responses: { 200: adminSuccess('admin_login_success', { access_token: 'eyJ...' }), 400: { description: 'Invalid or expired OTP' }, 409: { description: 'Another active device' } } } },
  '/admin/auth/confirm-new-device-login': { post: { tags: ['Admin auth'], summary: 'Logout the other device and complete this admin login', requestBody: adminJsonBody({ type: 'object', required: ['login_challenge_token'], properties: { login_challenge_token: { type: 'string' } } }), responses: { 200: adminSuccess('admin_login_success', { access_token: 'eyJ...' }), 401: { description: 'Expired challenge' } } } },
  '/admin/auth/me': { get: { tags: ['Admin auth'], summary: 'Get logged-in admin', security: adminBearer, responses: { 200: adminSuccess('OK', { admin: { id: 'a_1', name: 'OutDrive Admin', email: 'admin@outdrive.local', role: 'super_admin', two_factor_enabled: false } }), 401: { description: 'Admin token/session invalid or revoked' } } } },
  '/admin/auth/logout': { post: { tags: ['Admin auth'], summary: 'Logout current admin device', security: adminBearer, responses: { 200: adminSuccess('admin_logged_out', {}), 401: { description: 'Admin token/session invalid or revoked' } } } },
  '/admin/auth/forgot-password': { post: { tags: ['Admin auth'], summary: 'Send password reset email OTP', requestBody: adminJsonBody({ type: 'object', required: ['email'], properties: { email: { type: 'string', example: 'admin@outdrive.local' } } }), responses: { 200: adminSuccess('password_reset_otp_sent', { otp: '123456', expires_in_sec: 300 }) } } },
  '/admin/auth/reset-password': { post: { tags: ['Admin auth'], summary: 'Reset password using email OTP; logs out all sessions', requestBody: adminJsonBody({ type: 'object', required: ['email', 'otp', 'new_password', 'confirm_password'], properties: { email: { type: 'string' }, otp: { type: 'string', example: '123456' }, new_password: { type: 'string', example: 'NewPassword123!' }, confirm_password: { type: 'string', example: 'NewPassword123!' } } }), responses: { 200: adminSuccess('password_reset_success_relogin_required', {}), 400: { description: 'OTP/current input invalid' } } } },
  '/admin/profile': { get: { tags: ['Admin auth'], summary: 'Get own admin profile', security: adminBearer, responses: { 200: adminSuccess('OK', { admin: { id: 'a_1', name: 'OutDrive Admin' } }) } }, post: { tags: ['Admin auth'], summary: 'Update name, mobile or profile picture', security: adminBearer, requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { name: { type: 'string' }, mobile: { type: 'string' }, profile_picture: { type: 'string', format: 'binary' } } } } } }, responses: { 200: adminSuccess('admin_profile_updated', { admin: { id: 'a_1', name: 'OutDrive Admin' } }) } } },
  '/admin/change-password': { post: { tags: ['Admin auth'], summary: 'Change password and revoke all admin sessions', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['current_password', 'new_password', 'confirm_password'], properties: { current_password: { type: 'string' }, new_password: { type: 'string' }, confirm_password: { type: 'string' } } }), responses: { 200: adminSuccess('password_changed_relogin_required', {}), 400: { description: 'Current password invalid' } } } },
  '/admin/2fa/send-enable-otp': { post: { tags: ['Admin auth'], summary: 'Send email OTP to enable 2FA', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['current_password'], properties: { current_password: { type: 'string' } } }), responses: { 200: adminSuccess('two_factor_enable_otp_sent', { otp: '123456', expires_in_sec: 300 }) } } },
  '/admin/2fa/verify-enable-otp': { post: { tags: ['Admin auth'], summary: 'Enable 2FA', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['otp'], properties: { otp: { type: 'string', example: '123456' } } }), responses: { 200: adminSuccess('two_factor_enabled', { admin: { two_factor_enabled: true } }) } } },
  '/admin/2fa/send-disable-otp': { post: { tags: ['Admin auth'], summary: 'Send email OTP to disable 2FA', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['current_password'], properties: { current_password: { type: 'string' } } }), responses: { 200: adminSuccess('two_factor_disable_otp_sent', { otp: '123456', expires_in_sec: 300 }) } } },
  '/admin/2fa/verify-disable-otp': { post: { tags: ['Admin auth'], summary: 'Disable 2FA', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['otp'], properties: { otp: { type: 'string', example: '123456' } } }), responses: { 200: adminSuccess('two_factor_disabled', { admin: { two_factor_enabled: false } }) } } }
});

const adminUserExample = { id: 12, name: 'Rahul Sharma', mobile: '9876543210', country_code: '91', profile_picture: '', gender: 'male', wallet_balance: 0, emergency_contact_name: 'Asha Sharma', emergency_contact_number: '9876500000', locale: 'en', status: 'active', joined_at: '2026-10-22T08:00:00.000Z' };
const adminUserId = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 12 } }];

openApiSpec.tags.push({ name: 'Admin users', description: 'Customer management for the admin panel. View: all roles; edit/status: super_admin, operations; delete: super_admin' });
Object.assign(openApiSpec.paths, {
  '/admin/users/stats': { get: { tags: ['Admin users'], summary: 'User counts for the stats cards', security: adminBearer, responses: { 200: adminSuccess('OK', { stats: { total: 45, active: 41, inactive: 4, new_this_week: 6 } }), 401: { description: 'Admin token/session invalid or revoked' } } } },
  '/admin/users': { get: { tags: ['Admin users'], summary: 'List users, 10 per page, newest first', security: adminBearer, parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, example: 1 } }, { name: 'search', in: 'query', description: 'Matches name or mobile', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive'] } }], responses: { 200: adminSuccess('OK', { users: [adminUserExample], pagination: { page: 1, limit: 10, total: 45, total_pages: 5 } }), 422: { description: 'Invalid page or status' } } } },
  '/admin/users/{id}': { get: { tags: ['Admin users'], summary: 'Get one user', security: adminBearer, parameters: adminUserId, responses: { 200: adminSuccess('OK', { user: adminUserExample }), 404: { description: 'user_not_found' } } } },
  '/admin/users/{id}/update': { post: { tags: ['Admin users'], summary: 'Edit name, gender and emergency contact', security: adminBearer, parameters: adminUserId, requestBody: adminJsonBody({ type: 'object', properties: { name: { type: 'string', example: 'Rahul Sharma' }, gender: { type: 'string', enum: ['male', 'female', 'others', ''] }, emergency_contact_name: { type: 'string', example: 'Asha Sharma' }, emergency_contact_number: { type: 'string', example: '9876500000' } } }), responses: { 200: adminSuccess('user_updated', { user: adminUserExample }), 403: { description: 'admin_forbidden' }, 404: { description: 'user_not_found' }, 422: { description: 'Validation error' } } } },
  '/admin/users/{id}/status': { post: { tags: ['Admin users'], summary: 'Set active or inactive; inactive logs the user out of every device', security: adminBearer, parameters: adminUserId, requestBody: adminJsonBody({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['active', 'inactive'], example: 'inactive' } } }), responses: { 200: adminSuccess('user_status_updated', { user: { ...adminUserExample, status: 'inactive' } }), 403: { description: 'admin_forbidden' }, 404: { description: 'user_not_found' } } } },
  '/admin/users/{id}/delete': { post: { tags: ['Admin users'], summary: 'Soft delete a user (super_admin only)', security: adminBearer, parameters: adminUserId, requestBody: adminJsonBody({ type: 'object', required: ['reason'], properties: { reason: { type: 'string', example: 'Duplicate account' } } }), responses: { 200: adminSuccess('user_deleted', {}), 403: { description: 'admin_forbidden' }, 404: { description: 'user_not_found' } } } }
});

// ---------- Ride setup: HOME-01 + admin modules, zones, vehicles, fares, bookings ----------
const idParam = (example = 1) => [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example } }];
const errors = (map) => Object.fromEntries(Object.entries(map).map(([status, description]) => [status, { description }]));

const moduleExample = { id: 1, name: 'One Way', module_key: 'one_way', short_description: 'City ride', description: 'Point to point city ride', image: 'http://localhost:3113/uploads/services/7f3a.webp', section: 'rides', transport_type: 'taxi', service_type: 'normal', icon_types_for: 'taxi', fare_category: 'city', cancel_policy_title: 'Cancellation policy', cancel_policy_body: 'Free cancellation until a driver is assigned. After the driver is assigned, a cancellation fee may apply.', sort_order: 1, status: 'active' };
const zoneExample = { id: 1, name: 'Indore City', polygon: [[22.84, 75.72], [22.84, 76.0], [22.6, 76.0], [22.6, 75.72]], priority: 0, status: 'active', currency: 'INR', currency_symbol: '₹', distance_unit: 'km', modules: [{ service_id: 1, module_key: 'one_way', name: 'One Way', module_status: 'active', is_enabled: true }], modules_enabled: 7, fares_count: 12 };
const vehicleExample = { id: 1, name: 'Bike', type_key: 'bike', icon: 'http://localhost:3113/uploads/vehicles/a1.webp', description: 'Affordable bike ride', capacity: 1, is_shared: false, use_for: 'both', wheels: 2, sort_order: 1, status: 'active' };
const fareExample = { id: 1, zone_type_id: 'zt_1', zone_id: 1, vehicle_type_id: 1, fare_category: 'city', base_price: 25, base_distance_km: 6, price_per_km: 8, free_minutes: 18, price_per_min: 1, min_fare: 30, tax_percent: 0, free_waiting_mins: 5, waiting_charge_per_min: 2, payment_types: ['cash', 'wallet', 'online'], is_default: true, status: 'active' };
const breakdownExample = { distance_km: 8.5, minutes: 22, seats: 1, base_price: 25, price_per_km: 8, price_per_min: 1, extra_km: 2.5, extra_minutes: 4, distance_price: 20, time_price: 4, subtotal: 49, tax_percent: 0, tax_amount: 0, airport_surge_fee: 0, min_fare: 30, min_fare_applied: false, total: 49 };
const bookingRowExample = { id: 1, booking_id: 'OD1001', request_id: 'req_1001', status: 'searching', module_key: 'one_way', module_name: 'One Way', section: 'rides', vehicle_name: 'Bike', customer: { id: 3, name: 'Rahul', mobile: '9977112912', country_code: '91' }, pick_address: 'Rajwada, Indore', drop_address: 'Airport Road, Indore', estimated_amount: 49, currency: 'INR', payment_opt: 'cash', is_later: false, scheduled_at: null, created_at: '2026-10-22T08:00:00.000Z' };
const vehicleForm = (required) => ({ required: true, content: { 'multipart/form-data': { schema: { type: 'object', required, properties: { name: { type: 'string', example: 'E Rickshaw' }, type_key: { type: 'string', example: 'e_rickshaw', description: 'Create only; generated from name when empty; locked after create' }, description: { type: 'string' }, capacity: { type: 'integer', example: 4 }, is_shared: { type: 'boolean' }, use_for: { type: 'string', enum: ['ride', 'parcel', 'both'], description: 'Default ride' }, wheels: { type: 'integer', enum: [2, 3, 4], description: 'Default 4' }, status: { type: 'string', enum: ['active', 'inactive'] }, icon: { type: 'string', format: 'binary', description: 'JPEG, PNG or WebP; max 2 MB' } } } } } });
const zoneBody = (required) => adminJsonBody({ type: 'object', required, properties: { name: { type: 'string', example: 'Indore City' }, priority: { type: 'integer', example: 0, description: 'Higher wins where zones overlap' }, status: { type: 'string', enum: ['active', 'inactive'] }, polygon: { type: 'array', description: '3–500 [lat, lng] points', items: { type: 'array', items: { type: 'number' } }, example: zoneExample.polygon }, enabled_module_ids: { type: 'array', items: { type: 'integer' }, description: 'Modules switched on in this zone (create default: all)' } } });

openApiSpec.tags.push(
  { name: 'Common', description: 'Public rider-app data' },
  { name: 'Admin services', description: 'The 7 fixed ride modules. View: all roles; edit/status/order: super_admin, operations' },
  { name: 'Admin zones', description: 'Service areas. View: all roles; changes: super_admin, operations' },
  { name: 'Admin vehicles', description: 'Vehicle types and module mapping. View: all roles; changes: super_admin, operations' },
  { name: 'Admin fares', description: 'Zone × vehicle × category fares. View/preview: all roles; changes: super_admin only' },
  { name: 'Admin bookings', description: 'Bookings list and admin cancel. View: all roles; cancel: super_admin, operations' }
);

Object.assign(openApiSpec.paths, {
  '/common/ride_modules': { get: { tags: ['Common'], summary: 'HOME-01 — active and coming-soon modules in display order (inactive hidden)', responses: { 200: json(success('OK', []), { success: true, message: 'OK', data: [{ id: 'm_one_way', name: 'One Way', short_description: 'City ride', description: 'Point to point city ride', transport_type: 'taxi', service_type: 'normal', module_key: 'one_way', section: 'rides', menu_icon: moduleExample.image, icon_types_for: 'taxi', order_by: 1, is_active: true, coming_soon: false }] }) } } },

  '/admin/services': { get: { tags: ['Admin services'], summary: 'All 7 modules with stats', security: adminBearer, responses: { 200: adminSuccess('OK', { stats: { total: 7, active: 5, coming_soon: 2, inactive: 0 }, services: [moduleExample] }) } } },
  '/admin/services/{id}/update': { post: { tags: ['Admin services'], summary: 'Edit name, descriptions, cancel policy, status, image. module_key/section/transport_type/service_type/icon_types_for are locked', security: adminBearer, parameters: idParam(), requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { name: { type: 'string' }, short_description: { type: 'string' }, description: { type: 'string' }, cancel_policy_title: { type: 'string' }, cancel_policy_body: { type: 'string' }, status: { type: 'string', enum: ['active', 'coming_soon', 'inactive'] }, image: { type: 'string', format: 'binary' } } } } } }, responses: { 200: adminSuccess('service_updated', { service: moduleExample }), ...errors({ 404: 'service_not_found', 422: 'validation_error or service_field_locked' }) } } },
  '/admin/services/{id}/status': { post: { tags: ['Admin services'], summary: 'Set active, coming_soon or inactive', security: adminBearer, parameters: idParam(), requestBody: adminJsonBody({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['active', 'coming_soon', 'inactive'] } } }), responses: { 200: adminSuccess('service_status_updated', { service: moduleExample }) } } },
  '/admin/services/reorder': { post: { tags: ['Admin services'], summary: 'Save display order; ids must list every module once', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'integer' }, example: [1, 2, 3, 4, 5, 6, 8] } } }), responses: { 200: adminSuccess('services_reordered', { services: [moduleExample] }) } } },

  '/admin/zones': {
    get: { tags: ['Admin zones'], summary: 'Zones with stats, modules on and fares count', security: adminBearer, responses: { 200: adminSuccess('OK', { stats: { total: 1, active: 1, inactive: 0 }, total_modules: 7, zones: [{ id: 1, name: 'Indore City', priority: 0, status: 'active', points: 4, modules_enabled: 7, fares_count: 12 }] }) } },
    post: { tags: ['Admin zones'], summary: 'Create a zone; returns overlap warnings (overlap is allowed, priority decides)', security: adminBearer, requestBody: zoneBody(['name', 'polygon']), responses: { 201: adminSuccess('zone_created', { zone: zoneExample, warnings: { overlaps: [] } }), ...errors({ 409: 'zone_name_exists', 422: 'validation_error (polygon too small, edges crossing, no area)' }) } }
  },
  '/admin/zones/test-point': { post: { tags: ['Admin zones'], summary: 'Same check as ZONE-01: is this point serviceable for this module?', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['lat', 'lng', 'module_key'], properties: { lat: { type: 'number', example: 22.7196 }, lng: { type: 'number', example: 75.8577 }, module_key: { type: 'string', example: 'one_way' } } }), responses: { 200: adminSuccess('service_available', { is_serviceable: true, reason: 'available', zone: { id: 1, name: 'Indore City', priority: 0 }, matched_zones: [{ id: 1, name: 'Indore City', priority: 0 }], module: { id: 1, module_key: 'one_way', name: 'One Way', status: 'active' } }) } } },
  '/admin/zones/{id}': { get: { tags: ['Admin zones'], summary: 'Zone detail with polygon and module switches', security: adminBearer, parameters: idParam(), responses: { 200: adminSuccess('OK', { zone: zoneExample }), ...errors({ 404: 'zone_not_found' }) } } },
  '/admin/zones/{id}/update': { post: { tags: ['Admin zones'], summary: 'Edit zone', security: adminBearer, parameters: idParam(), requestBody: zoneBody([]), responses: { 200: adminSuccess('zone_updated', { zone: zoneExample, warnings: { overlaps: [] } }) } } },
  '/admin/zones/{id}/status': { post: { tags: ['Admin zones'], summary: 'Active or inactive (no delete)', security: adminBearer, parameters: idParam(), requestBody: adminJsonBody({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['active', 'inactive'] } } }), responses: { 200: adminSuccess('zone_status_updated', { zone: zoneExample }) } } },
  '/admin/zones/{id}/modules/{serviceId}': { post: { tags: ['Admin zones'], summary: 'Switch one module on/off in a zone', security: adminBearer, parameters: [...idParam(), { name: 'serviceId', in: 'path', required: true, schema: { type: 'integer', example: 6 } }], requestBody: adminJsonBody({ type: 'object', required: ['is_enabled'], properties: { is_enabled: { type: 'boolean' } } }), responses: { 200: adminSuccess('zone_module_updated', { zone: zoneExample }) } } },

  '/admin/vehicle-types': {
    get: { tags: ['Admin vehicles'], summary: 'Vehicle types with stats', security: adminBearer, responses: { 200: adminSuccess('OK', { stats: { total: 8, active: 8, inactive: 0, shared: 1 }, vehicles: [vehicleExample] }) } },
    post: { tags: ['Admin vehicles'], summary: 'Create vehicle type (icon required)', security: adminBearer, requestBody: vehicleForm(['name', 'icon']), responses: { 201: adminSuccess('vehicle_type_created', { vehicle: vehicleExample }), ...errors({ 409: 'vehicle_type_key_exists', 422: 'validation_error, icon_must_be_jpeg_png_or_webp, icon_too_large' }) } }
  },
  '/admin/vehicle-types/{id}/update': { post: { tags: ['Admin vehicles'], summary: 'Edit vehicle type; type_key locked; is_shared / use_for / wheels cannot change in a way that breaks its modules or active fares', security: adminBearer, parameters: idParam(), requestBody: vehicleForm([]), responses: { 200: adminSuccess('vehicle_type_updated', { vehicle: vehicleExample }), ...errors({ 422: 'vehicle_type_key_locked or vehicle_type_in_use' }) } } },
  '/admin/vehicle-types/{id}/status': { post: { tags: ['Admin vehicles'], summary: 'Active or inactive (no delete)', security: adminBearer, parameters: idParam(), requestBody: adminJsonBody({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['active', 'inactive'] } } }), responses: { 200: adminSuccess('vehicle_type_status_updated', { vehicle: vehicleExample }) } } },
  '/admin/vehicle-types/reorder': { post: { tags: ['Admin vehicles'], summary: 'Save display order; ids must list every vehicle once', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'integer' } } } }), responses: { 200: adminSuccess('vehicle_types_reordered', { vehicles: [vehicleExample] }) } } },
  '/admin/vehicle-types/mapping': {
    get: { tags: ['Admin vehicles'], summary: 'Which vehicles each module offers; blocked[service][vehicle] = why a pair does not fit', security: adminBearer, responses: { 200: adminSuccess('OK', { services: [{ id: 1, name: 'One Way', module_key: 'one_way', service_type: 'normal', section: 'rides', status: 'active' }], vehicles: [vehicleExample], mapping: { 1: [1, 2, 3, 4, 5, 6] }, blocked: { 1: { 8: '3 Wheeler is a parcel vehicle; One Way needs a ride vehicle' } } }) } },
    post: { tags: ['Admin vehicles'], summary: 'Replace the vehicle list of the given modules. Rules: ride modules take ride/both vehicles, parcel modules parcel/both; Shared Ride only shared; Outstation/Round Trip 4-wheelers; Parcel on Bike 2-wheelers; Parcel on 3 Wheeler 3-wheelers', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['mapping'], properties: { mapping: { type: 'object', example: { 1: [1, 2, 3, 4, 5, 6], 6: [1] } } } }), responses: { 200: adminSuccess('vehicle_mapping_saved', { mapping: { 1: [1, 2, 3, 4, 5, 6] } }), ...errors({ 422: 'validation_error' }) } }
  },

  '/admin/fares': { get: { tags: ['Admin fares'], summary: 'Fares of one zone grouped by category (city, shared, outstation, parcel); fare is null where not set yet', security: adminBearer, parameters: [{ name: 'zone_id', in: 'query', schema: { type: 'integer' }, description: 'Defaults to the highest-priority zone' }], responses: { 200: adminSuccess('OK', { zones: [{ id: 1, name: 'Indore City', status: 'active' }], zone: { id: 1, name: 'Indore City', status: 'active' }, categories: { city: [{ vehicle: vehicleExample, modules: ['One Way', 'Scheduled'], fare: fareExample }], shared: [], outstation: [], parcel: [] } }) } } },
  '/admin/fares/save': { post: { tags: ['Admin fares'], summary: 'Create or update the fare for zone + vehicle + category (super_admin). Recorded in history', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['zone_id', 'vehicle_type_id', 'fare_category', 'base_price', 'base_distance_km', 'price_per_km', 'free_minutes', 'price_per_min', 'min_fare', 'tax_percent', 'free_waiting_mins', 'waiting_charge_per_min', 'payment_types'], properties: { zone_id: { type: 'integer', example: 1 }, vehicle_type_id: { type: 'integer', example: 1 }, fare_category: { type: 'string', enum: ['city', 'shared', 'outstation', 'parcel'] }, base_price: { type: 'number', example: 25 }, base_distance_km: { type: 'number', example: 6 }, price_per_km: { type: 'number', example: 8 }, free_minutes: { type: 'integer', example: 18 }, price_per_min: { type: 'number', example: 1 }, min_fare: { type: 'number', example: 30 }, tax_percent: { type: 'number', example: 0 }, free_waiting_mins: { type: 'integer', example: 5 }, waiting_charge_per_min: { type: 'number', example: 2 }, payment_types: { type: 'array', items: { type: 'string', enum: ['cash', 'wallet', 'online'] } }, is_default: { type: 'boolean' }, status: { type: 'string', enum: ['active', 'inactive'] } } }), responses: { 200: adminSuccess('fare_saved', { fare: fareExample }), ...errors({ 403: 'admin_forbidden (not super_admin)', 422: 'validation_error' }) } } },
  '/admin/fares/{id}/status': { post: { tags: ['Admin fares'], summary: 'Turn a fare on/off (super_admin)', security: adminBearer, parameters: idParam(), requestBody: adminJsonBody({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['active', 'inactive'] } } }), responses: { 200: adminSuccess('fare_status_updated', { fare: fareExample }) } } },
  '/admin/fares/copy': { post: { tags: ['Admin fares'], summary: 'Copy every fare from one zone to another (super_admin)', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['from_zone_id', 'to_zone_id'], properties: { from_zone_id: { type: 'integer' }, to_zone_id: { type: 'integer' }, overwrite: { type: 'boolean', description: 'false: only add missing fares' } } }), responses: { 200: adminSuccess('fares_copied', { created: 12, updated: 0, skipped: 0 }) } } },
  '/admin/fares/preview': { post: { tags: ['Admin fares'], summary: 'Fare calculator — same formula as ETA', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['zone_id', 'fare_category', 'distance_km', 'minutes'], properties: { zone_id: { type: 'integer', example: 1 }, fare_category: { type: 'string', example: 'city' }, distance_km: { type: 'number', example: 8.5 }, minutes: { type: 'number', example: 22 }, seats: { type: 'integer', example: 1 }, round_trip: { type: 'boolean' } } }), responses: { 200: adminSuccess('OK', { zone: { id: 1, name: 'Indore City' }, input: {}, results: [{ vehicle: vehicleExample, fare_status: 'active', is_default: true, breakdown: breakdownExample }] }) } } },
  '/admin/fares/history': { get: { tags: ['Admin fares'], summary: 'Fare change history (20 per page)', security: adminBearer, parameters: [{ name: 'zone_id', in: 'query', schema: { type: 'integer' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }], responses: { 200: adminSuccess('OK', { history: [{ id: 1, action: 'updated', zone: { id: 1, name: 'Indore City' }, vehicle: { id: 1, name: 'Bike' }, fare_category: 'city', admin: { id: 1, name: 'OutDrive Admin', email: 'admin@outdrive.local' }, changes: [{ field: 'base_price', from: 25, to: 26 }], created_at: '2026-10-22T08:00:00.000Z' }], pagination: { page: 1, limit: 20, total: 1, total_pages: 1 } }) } } },

  '/admin/bookings/stats': { get: { tags: ['Admin bookings'], summary: 'Booking counts by status group', security: adminBearer, parameters: [{ name: 'section', in: 'query', schema: { type: 'string', enum: ['rides', 'parcel'] } }], responses: { 200: adminSuccess('OK', { stats: { total: 10, searching: 2, scheduled: 1, ongoing: 3, completed: 3, cancelled: 1 } }) } } },
  '/admin/bookings': { get: { tags: ['Admin bookings'], summary: 'Bookings, 10 per page, newest first', security: adminBearer, parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'status', in: 'query', description: 'A booking status, or the groups ongoing / cancelled', schema: { type: 'string' } }, { name: 'module_key', in: 'query', schema: { type: 'string' } }, { name: 'section', in: 'query', schema: { type: 'string', enum: ['rides', 'parcel'] } }, { name: 'search', in: 'query', description: 'Booking ID (OD1001), customer name or mobile', schema: { type: 'string' } }, { name: 'from', in: 'query', schema: { type: 'string', example: '2026-10-01' } }, { name: 'to', in: 'query', schema: { type: 'string', example: '2026-10-31' } }], responses: { 200: adminSuccess('OK', { bookings: [bookingRowExample], pagination: { page: 1, limit: 10, total: 1, total_pages: 1 } }) } } },
  '/admin/bookings/{id}': { get: { tags: ['Admin bookings'], summary: 'Booking detail with fare snapshot and parcel details', security: adminBearer, parameters: idParam(), responses: { 200: adminSuccess('OK', { booking: { ...bookingRowExample, zone: { id: 1, name: 'Indore City' }, zone_type_id: 'zt_1', fare_breakdown: breakdownExample, parcel: null } }), ...errors({ 404: 'booking_not_found' }) } } },
  '/admin/bookings/{id}/cancel': { post: { tags: ['Admin bookings'], summary: 'Cancel a searching or scheduled booking (reason required)', security: adminBearer, parameters: idParam(), requestBody: adminJsonBody({ type: 'object', required: ['reason'], properties: { reason: { type: 'string', example: 'Customer called support' } } }), responses: { 200: adminSuccess('booking_cancelled', { booking: { ...bookingRowExample, status: 'cancelled' } }), ...errors({ 422: 'booking_not_cancellable or validation_error' }) } } }
});

// ---------- Rider app: ZONE-01, ETA-01, ETA-02 ----------
const bearer = [{ bearerAuth: [] }];
const etaItemExample = { zone_type_id: 'zt_1', type_id: 'vt_1', name: 'Bike', description: 'Affordable bike ride', vehicle_icon: 'http://localhost:3113/uploads/vehicles/a1.webp', capacity: 1, payment_type: 'cash,wallet', distance: '8.5', distance_in_meters: '8500', time: 22, total: 49, min_amount: 49, currency: 'INR', unit_in_words: 'KM', is_default: true, dispatch_type: 'normal', enable_bidding: false, enable_shared_ride: false, seats_taken: 1, has_discount: false, discount_total: 0, base_price: 25, price_per_distance: 8, price_per_time: 1, distance_price: 20, time_price: 4, tax_amount: 0, tax: '0', airport_surge_fee: 0, min_fare_applied: false, free_waiting_time_in_mins_before_trip_start: 5, waiting_charge: 2, promocode_id: '', user_wallet_balance: 0, preference: [] };
const zoneData = (ok) => ({ is_serviceable: ok, zone_id: ok ? 'z_1' : '', zone_name: ok ? 'Indore City' : '', currency: 'INR', currency_symbol: '₹', distance_unit: 'km' });

openApiSpec.tags.push({ name: 'Ride request', description: 'Rider app fare estimate (ETA)' });
Object.assign(openApiSpec.paths, {
  '/common/service-availability': { post: {
    tags: ['Common'], summary: 'ZONE-01 — is the pickup serviceable for this module? Token optional; a sent token must be valid',
    security: [{}, { bearerAuth: [] }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['pick_lat', 'pick_lng', 'module_key'], properties: { pick_lat: { type: 'number', example: 22.7196 }, pick_lng: { type: 'number', example: 75.8577 }, module_key: { type: 'string', example: 'one_way' }, drop_lat: { type: 'number', description: 'Accepted, not checked yet' }, drop_lng: { type: 'number', description: 'Accepted, not checked yet' } } } } } },
    responses: {
      200: { description: 'service_available | out_of_service_area | module_not_available (coming soon / inactive)', content: { 'application/json': { examples: { available: { value: { success: true, message: 'service_available', data: zoneData(true) } }, outside: { value: { success: true, message: 'out_of_service_area', data: zoneData(false) } } } } } },
      401: { description: 'A token was sent but it is invalid or expired' },
      422: { description: 'validation_error' }
    }
  } },
  '/common/cancel-policy': { get: {
    tags: ['Common'], summary: 'ETA-02 — cancellation policy of a module (set in the admin panel). Empty body = not written yet',
    parameters: [{ name: 'module_key', in: 'query', required: true, schema: { type: 'string', example: 'one_way' } }],
    responses: { 200: json(success('OK', {}), { success: true, message: 'OK', data: { title: 'Cancellation policy', body: 'Free cancellation until a driver is assigned. After the driver is assigned, a cancellation fee may apply.' } }), 422: { description: 'validation_error' } }
  } },
  '/request/eta': { post: {
    tags: ['Ride request'], summary: 'ETA-01 — vehicles and backend-calculated fares for a module', security: bearer,
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['module_key', 'pick_lat', 'pick_lng', 'drop_lat', 'drop_lng', 'pick_address', 'drop_address', 'distance', 'duration'], properties: {
      module_key: { type: 'string', example: 'one_way' }, transport_type: { type: 'string', example: 'taxi', description: 'Optional; must match the module' }, service_type: { type: 'string', example: 'normal', description: 'Optional; must match the module' },
      pick_lat: { type: 'number', example: 22.7196 }, pick_lng: { type: 'number', example: 75.8577 }, drop_lat: { type: 'number', example: 22.7533 }, drop_lng: { type: 'number', example: 75.8937 },
      pick_address: { type: 'string', example: 'Rajwada, Indore' }, drop_address: { type: 'string', example: 'Airport Road, Indore' },
      distance: { type: 'string', example: '8500', description: 'Meters. Never below the straight-line distance (raised if lower)' }, duration: { type: 'string', example: '22', description: 'Minutes' }, polyline: { type: 'string', example: '' },
      is_out_station: { type: 'integer', example: 0 }, is_round_trip: { type: 'integer', example: 0 },
      schedule_datetime: { type: 'string', example: '', description: 'Required for scheduled: 30 min – 7 days ahead. "2026-10-23 10:30:00" without offset = IST' },
      shared_ride: { type: 'integer', example: 0 }, seats_taken: { type: 'integer', example: 1 }, promo_code: { type: 'string', example: '', description: 'Must be empty until coupons exist' }
    } } } } },
    responses: {
      200: { description: 'OK, or no_vehicles_available with data: []', content: { 'application/json': { example: { success: true, message: 'OK', enabled_dispatch_type: { ondemand: true, bidding: false, shared: false }, data: [etaItemExample] } } } },
      401: { description: 'unauthorized' },
      422: { description: 'validation_error | out_of_service_area | module_not_available | invalid_promo_code' }
    }
  } }
});

// ---------- Rider app: recent searches, favourites, banners + admin banners ----------
const recentExample = { id: 12, user_id: 7, pick_lat: 22.6867, pick_lng: 75.8715, drop_lat: 22.7171, drop_lng: 75.8683, pick_address: '301, Atulya IT Park, Indore', pick_short_address: 'Atulya IT Park', drop_address: 'Bhawarkuan Square, Indore', drop_short_address: 'Bhawarkuan Square', pickup_poc_name: '', pickup_poc_mobile: '', pickup_poc_instruction: '', drop_poc_name: '', drop_poc_mobile: '', drop_poc_instruction: '', total_distance: 4.2, total_time: 12, poly_line: '', transport_type: 'taxi', module_key: 'one_way', searchStops: { data: [] }, created_at: '2026-10-23T08:10:00.000Z' };
const favouriteExample = { id: 'f_91', pick_lat: '22.7196', pick_lng: '75.8577', drop_lat: '', drop_lng: '', pick_address: 'Rajwada, Indore, Madhya Pradesh', drop_address: '', address_name: 'Home', landmark: 'Near gate 2' };
const bannerExample = { id: 'b_1', image: 'https://outdrivebackend.cyberimpulses.com/uploads/banners/offer1.webp', image_url: 'https://outdrivebackend.cyberimpulses.com/uploads/banners/offer1.webp', title: 'Flat 20% off', subtitle: 'On your first bike ride', active: true, order_by: 1, module_key: '', link_type: 'none', link_value: '', starts_at: '2026-10-01T00:00:00.000Z', ends_at: '2026-12-31T23:59:59.000Z' };
const adminBannerExample = { id: 1, title: 'Flat 20% off', subtitle: 'On your first bike ride', image: bannerExample.image, module_key: '', link_type: 'none', link_value: '', sort_order: 1, status: 'active', state: 'live', starts_at: null, ends_at: null };
const userOk = (message, data) => json(success(message, data), { success: true, message, data });
const bannerForm = (required) => ({ required: true, content: { 'multipart/form-data': { schema: { type: 'object', required, properties: { title: { type: 'string', example: 'Flat 20% off' }, subtitle: { type: 'string' }, module_key: { type: 'string', description: 'Empty = all (home)' }, link_type: { type: 'string', enum: ['none', 'module', 'url'] }, link_value: { type: 'string', description: 'module_key for module, https URL for url' }, starts_at: { type: 'string', example: '2026-10-23 10:00', description: 'IST when no offset; empty = right away' }, ends_at: { type: 'string', description: 'IST when no offset; empty = no end' }, status: { type: 'string', enum: ['active', 'inactive'] }, image: { type: 'string', format: 'binary', description: 'JPEG, PNG or WebP; max 2 MB; 1200x600' } } } } } });

openApiSpec.tags.push(
  { name: 'Recent searches', description: 'Rider app pick/drop history (max 20 per user, newest first)' },
  { name: 'Favourites', description: 'Saved places (Home, Work, custom); max 15 per user' },
  { name: 'Admin banners', description: 'Home banners. View: all roles; changes: super_admin, operations' }
);

openApiSpec.paths['/user'].get.summary = 'AUTH-07 — get authenticated user (includes favouriteLocations.data)';
openApiSpec.paths['/user'].get.responses[200] = userOk('OK', { id: 'u_7', name: 'Ankit', mobile: '9977112912', country_code: '91', profile_picture: '', gender: 'male', map_type: '', wallet_balance: 0, emergency_contact_name: '', emergency_contact_number: '', locale: 'en', favouriteLocations: { data: [favouriteExample] } });

Object.assign(openApiSpec.paths, {
  '/request/list-recent-searches': { get: {
    tags: ['Recent searches'], summary: 'HOME-04 — recent searches, newest first', security: bearer,
    parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 20, default: 10 } }, { name: 'transport_type', in: 'query', schema: { type: 'string', enum: ['taxi', 'delivery'] } }],
    responses: { 200: userOk('OK', [recentExample]), 401: { description: 'unauthorized / invalid_or_expired_token' }, 403: { description: 'user_blocked' }, 422: { description: 'validation_error' } }
  } },
  '/request/save-recent-search': { post: {
    tags: ['Recent searches'], summary: 'HOME-05 — save a search; the same route (both points within 50 m) refreshes the existing row', security: bearer,
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['pick_lat', 'pick_lng', 'drop_lat', 'drop_lng', 'pick_address', 'drop_address'], properties: {
      pick_lat: { type: 'number', example: 22.6867 }, pick_lng: { type: 'number', example: 75.8715 }, drop_lat: { type: 'number', example: 22.7171 }, drop_lng: { type: 'number', example: 75.8683 },
      pick_address: { type: 'string', example: '301, Atulya IT Park, Indore' }, pick_short_address: { type: 'string', example: 'Atulya IT Park' },
      drop_address: { type: 'string', example: 'Bhawarkuan Square, Indore' }, drop_short_address: { type: 'string', example: 'Bhawarkuan Square' },
      total_distance: { type: 'number', example: 4.2, description: 'km' }, total_time: { type: 'number', example: 12, description: 'minutes' }, poly_line: { type: 'string', example: '' },
      transport_type: { type: 'string', enum: ['taxi', 'delivery'], example: 'taxi' }, module_key: { type: 'string', example: 'one_way' },
      stops: { type: 'array', maxItems: 3, items: { type: 'object', required: ['lat', 'lng', 'address', 'order'], properties: { lat: { type: 'number' }, lng: { type: 'number' }, address: { type: 'string' }, short_address: { type: 'string' }, order: { type: 'integer', minimum: 1, maximum: 3 } } }, example: [] }
    } } } } },
    responses: { 200: userOk('recent_saved', { id: 12 }), 401: { description: 'unauthorized' }, 422: { description: 'validation_error (data.errors.<field>) or same_pick_drop' } }
  } },
  '/user/add-favourite-location': { post: {
    tags: ['Favourites'], summary: 'HOME-06 — add a favourite; the same address_name (any case) updates it', security: bearer,
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['pick_lat', 'pick_lng', 'pick_address', 'address_name'], properties: { pick_lat: { type: 'number', example: 22.7196 }, pick_lng: { type: 'number', example: 75.8577 }, pick_address: { type: 'string', example: 'Rajwada, Indore, Madhya Pradesh' }, address_name: { type: 'string', example: 'Home', maxLength: 40 }, landmark: { type: 'string', example: 'Near gate 2', maxLength: 120 } } } } } },
    responses: { 200: userOk('favourite_added', favouriteExample), 401: { description: 'unauthorized' }, 422: { description: 'validation_error or favourite_limit_reached (15)' } }
  } },
  '/user/favourite-location/{id}': { delete: {
    tags: ['Favourites'], summary: 'HOME-07 — delete a favourite ("f_91" or "91")', security: bearer,
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'f_91' } }],
    responses: { 200: userOk('favourite_deleted', { id: 'f_91' }), 401: { description: 'unauthorized' }, 403: { description: 'forbidden (another user’s favourite)' }, 404: { description: 'favourite_not_found' } }
  } },
  '/user/delete-favourite-location': { post: {
    tags: ['Favourites'], summary: 'HOME-07 (compat) — delete with a POST body', security: bearer,
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['id'], properties: { id: { type: 'string', example: 'f_91' } } } } } },
    responses: { 200: userOk('favourite_deleted', { id: 'f_91' }), 403: { description: 'forbidden' }, 404: { description: 'favourite_not_found' }, 422: { description: 'validation_error' } }
  } },
  '/common/banners': { get: {
    tags: ['Common'], summary: 'Home banners — live only (active and inside their dates), in admin order. Token optional',
    security: [{}, { bearerAuth: [] }],
    parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 20, default: 10 } }, { name: 'module_key', in: 'query', schema: { type: 'string' }, description: 'Only that module’s banners; omit for all' }],
    responses: { 200: userOk('OK', [bannerExample]), 401: { description: 'A token was sent but it is invalid' }, 422: { description: 'validation_error' } }
  } },
  '/admin/banners': {
    get: { tags: ['Admin banners'], summary: 'All banners with live/scheduled/expired/inactive stats', security: adminBearer, responses: { 200: adminSuccess('OK', { stats: { total: 3, live: 3, scheduled: 0, expired: 0, inactive: 0 }, banners: [adminBannerExample] }) } },
    post: { tags: ['Admin banners'], summary: 'Create a banner (image required); added at the end', security: adminBearer, requestBody: bannerForm(['title', 'image']), responses: { 201: adminSuccess('banner_created', { banner: adminBannerExample }), 403: { description: 'admin_forbidden' }, 422: { description: 'validation_error / image_* upload errors' } } }
  },
  '/admin/banners/{id}/update': { post: { tags: ['Admin banners'], summary: 'Edit a banner; image optional (old file removed when replaced)', security: adminBearer, parameters: idParam(), requestBody: bannerForm([]), responses: { 200: adminSuccess('banner_updated', { banner: adminBannerExample }), 404: { description: 'banner_not_found' } } } },
  '/admin/banners/{id}/status': { post: { tags: ['Admin banners'], summary: 'Active or inactive', security: adminBearer, parameters: idParam(), requestBody: adminJsonBody({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['active', 'inactive'] } } }), responses: { 200: adminSuccess('banner_status_updated', { banner: adminBannerExample }) } } },
  '/admin/banners/reorder': { post: { tags: ['Admin banners'], summary: 'Save display order; ids must list every banner once', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'integer' } } } }), responses: { 200: adminSuccess('banners_reordered', { banners: [adminBannerExample] }) } } },
  '/admin/banners/{id}/delete': { post: { tags: ['Admin banners'], summary: 'Delete a banner and its image', security: adminBearer, parameters: idParam(), responses: { 200: adminSuccess('banner_deleted', { id: 1 }), 404: { description: 'banner_not_found' } } } }
});
