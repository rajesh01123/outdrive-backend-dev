# User Authentication APIs

Base API URL: `http://localhost:3113/api/v1`  
Swagger UI: `http://localhost:3113/api-docs`  
OpenAPI JSON: `http://localhost:3113/api-docs.json`

All endpoints return this envelope:

```json
{
  "success": true,
  "message": "machine_readable_message",
  "data": {}
}
```

For local development, `DEV_FIXED_OTP=123456` makes the valid OTP `123456`. In production, OTP is sent only through a configured SMS provider.

## AUTH-01 — Validate mobile

`POST /auth/validate-mobile` — Public

```json
{
  "mobile": "9977112912",
  "country_code": "91",
  "device_token": "stable-device-id-or-fcm",
  "login_by": "android"
}
```

Existing mobile — `200 OK`:

```json
{
  "success": true,
  "message": "mobile_exists",
  "data": { "is_existing_user": true }
}
```

New mobile uses `message: "mobile_not_exists"` and `is_existing_user: false`.

| Status | Message | When |
| --- | --- | --- |
| 422 | `validation_error` | Mobile is not 10 digits, country code is not `91`, device token is missing, or platform is not `android`/`ios` |

This endpoint never creates or sends an OTP.

## AUTH-02 — Send OTP

`POST /auth/send-otp` — Public

```json
{
  "mobile": "9977112912",
  "country_code": "91",
  "device_token": "stable-device-id-or-fcm",
  "login_by": "android",
  "purpose": "login"
}
```

`purpose` must be `login`, `signup`, or `delete_account`.

Success — `200 OK`:

```json
{
  "success": true,
  "message": "otp_sent",
  "data": {
    "otp": "123456",
    "expires_in_sec": 300,
    "resend_after_sec": 30
  }
}
```

| Status | Message | When |
| --- | --- | --- |
| 404 | `user_not_found_use_register` | `purpose: login` but no active user exists; data includes `is_new_user: true` and `next: "register"` |
| 404 | `user_not_found` | `purpose: delete_account` but no active user exists |
| 409 | `mobile_already_registered` | `purpose: signup` but mobile is registered |
| 422 | `validation_error` | Invalid/missing request field or invalid purpose |
| 429 | `otp_resend_not_allowed` | Sent again before 30 seconds; data includes `resend_after_sec` |
| 429 | `otp_daily_limit_exceeded` | Daily OTP cap reached |
| 503 | `sms_provider_not_configured` | Production SMS provider is not wired |

`data.otp` is returned only outside production to make frontend testing easy. It is always omitted in production, where the SMS provider delivers the OTP.

## AUTH-03 — Verify OTP

`POST /auth/verify-otp` — Public

```json
{
  "mobile": "9977112912",
  "country_code": "91",
  "otp": "123456",
  "device_token": "stable-device-id-or-fcm",
  "login_by": "android"
}
```

Success — `200 OK`:

```json
{
  "success": true,
  "message": "otp_valid",
  "data": { "otp_token": "short-lived-otp-proof" }
}
```

`otp_token` is optional proof for future flows. Login/register still validates the OTP itself.

| Status | Message | When |
| --- | --- | --- |
| 400 | `otp_not_found`, `otp_expired`, `invalid_otp`, `otp_already_used` | OTP cannot be accepted |
| 422 | `validation_error` | OTP is not exactly six digits or another input is invalid |
| 429 | `otp_attempts_exceeded` | More than five invalid OTP attempts |

For `invalid_otp`, `data.remaining_attempts` shows attempts left.

## AUTH-04 — Login existing user

`POST /auth/login` — Public

```json
{
  "mobile": "9977112912",
  "country_code": "91",
  "otp": "123456",
  "device_token": "stable-device-id-or-fcm",
  "login_by": "android"
}
```

Success — `200 OK`:

```json
{
  "success": true,
  "message": "login_success",
  "data": {
    "access_token": "eyJhbGciOi...",
    "token_type": "Bearer",
    "is_new_user": false,
    "profile_complete": true,
    "user": {
      "id": "u_123",
      "name": "Rahul",
      "mobile": "9977112912",
      "country_code": "91",
      "profile_picture": ""
    }
  }
}
```

| Status | Message | When |
| --- | --- | --- |
| 400 | `otp_not_found`, `otp_expired`, `invalid_otp`, `otp_already_used` | Login OTP fails |
| 403 | `user_blocked` | User is blocked |
| 404 | `user_not_found_use_register` | Mobile has no active account; data includes `is_new_user: true`, `next: "register"` |
| 422 | `validation_error` | Invalid request |
| 429 | `otp_attempts_exceeded` | OTP attempt limit reached |

Store the token and send it on protected endpoints:

```http
Authorization: Bearer <access_token>
```

## AUTH-05 — Register new user

`POST /auth/register` — Public. Use JSON without an image, or `multipart/form-data` with `profile_picture`.

```json
{
  "mobile": "9977112912",
  "country_code": "91",
  "otp": "123456",
  "name": "Rahul Sharma",
  "device_token": "stable-device-id-or-fcm",
  "login_by": "android"
}
```

`name` is compulsory, trimmed, and must have 2–80 characters. Optional `profile_picture` accepts JPEG, PNG, or WebP, maximum 5 MB.

Success — `201 Created`:

```json
{
  "success": true,
  "message": "register_success",
  "data": {
    "access_token": "eyJhbGciOi...",
    "token_type": "Bearer",
    "is_new_user": true,
    "profile_complete": true,
    "user": {
      "id": "u_124",
      "name": "Rahul Sharma",
      "mobile": "9977112912",
      "country_code": "91",
      "profile_picture": ""
    }
  }
}
```

| Status | Message | When |
| --- | --- | --- |
| 400 | `otp_not_found`, `otp_expired`, `invalid_otp`, `otp_already_used` | Signup OTP fails |
| 409 | `mobile_already_registered` | Account already exists; use login |
| 422 | `validation_error`, `profile_picture_too_large`, `profile_picture_must_be_jpeg_png_or_webp` | Request/image is invalid |
| 429 | `otp_attempts_exceeded` | OTP attempt limit reached |

## AUTH-08 — Logout

`POST /auth/logout` — Bearer required

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "device_token": "stable-device-id-or-fcm"
}
```

Success — `200 OK`:

```json
{
  "success": true,
  "message": "logged_out",
  "data": {}
}
```

| Status | Message | When |
| --- | --- | --- |
| 401 | `unauthorized`, `invalid_or_expired_token`, `session_revoked` | Bearer token is absent, invalid, expired, or logged out |
| 403 | `user_blocked` | Account is blocked |
| 422 | `validation_error` | `device_token` missing or invalid |
