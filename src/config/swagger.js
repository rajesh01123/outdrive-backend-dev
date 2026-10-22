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

const serviceExample = { id: 1, name: 'One Way', slug: 'one_way', subtitle: 'City rides', image: 'http://localhost:3113/uploads/services/7f3a.webp', service_type: 'ride', sort_order: 1, status: 'active' };
const serviceId = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }];
const serviceForm = (required) => ({ required: true, content: { 'multipart/form-data': { schema: { type: 'object', required, properties: { name: { type: 'string', example: 'Airport Transfer' }, slug: { type: 'string', example: 'airport_transfer', description: 'Create only; generated from name when empty; locked after create' }, subtitle: { type: 'string', example: 'Pickup & drop to airport' }, service_type: { type: 'string', enum: ['ride', 'parcel'] }, status: { type: 'string', enum: ['active', 'coming_soon', 'inactive'] }, image: { type: 'string', format: 'binary', description: 'JPEG, PNG or WebP; max 2 MB; 512x512 recommended' } } } } } });

openApiSpec.tags.push({ name: 'Services', description: 'Public rider-app home services' }, { name: 'Admin services', description: 'Manage app home services. View: all roles; changes: super_admin, operations' });
Object.assign(openApiSpec.paths, {
  '/services': { get: { tags: ['Services'], summary: 'Active and coming-soon services for the app home, in display order', responses: { 200: json(success('OK', { services: [{ ...serviceExample, sort_order: undefined, is_bookable: true }] }), { success: true, message: 'OK', data: { services: [{ id: 1, name: 'One Way', slug: 'one_way', subtitle: 'City rides', image: serviceExample.image, service_type: 'ride', status: 'active', is_bookable: true }] } }) } } },
  '/admin/services': {
    get: { tags: ['Admin services'], summary: 'All services with stats, in display order', security: adminBearer, responses: { 200: adminSuccess('OK', { stats: { total: 6, active: 4, coming_soon: 2, inactive: 0 }, services: [serviceExample] }) } },
    post: { tags: ['Admin services'], summary: 'Create a service (image required); added at the end of the list', security: adminBearer, requestBody: serviceForm(['name', 'image']), responses: { 201: adminSuccess('service_created', { service: serviceExample }), 403: { description: 'admin_forbidden' }, 409: { description: 'service_slug_exists' }, 422: { description: 'validation_error, image_must_be_jpeg_png_or_webp or image_too_large' } } }
  },
  '/admin/services/{id}/update': { post: { tags: ['Admin services'], summary: 'Edit a service; image optional (old file is removed when replaced)', security: adminBearer, parameters: serviceId, requestBody: serviceForm([]), responses: { 200: adminSuccess('service_updated', { service: serviceExample }), 404: { description: 'service_not_found' }, 422: { description: 'validation_error or service_slug_locked' } } } },
  '/admin/services/{id}/status': { post: { tags: ['Admin services'], summary: 'Set active, coming_soon or inactive', security: adminBearer, parameters: serviceId, requestBody: adminJsonBody({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['active', 'coming_soon', 'inactive'] } } }), responses: { 200: adminSuccess('service_status_updated', { service: serviceExample }), 404: { description: 'service_not_found' } } } },
  '/admin/services/reorder': { post: { tags: ['Admin services'], summary: 'Save display order; ids must list every service once', security: adminBearer, requestBody: adminJsonBody({ type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'integer' }, example: [3, 1, 2, 4, 5, 6] } } }), responses: { 200: adminSuccess('services_reordered', { services: [serviceExample] }), 422: { description: 'validation_error' } } } }
});
