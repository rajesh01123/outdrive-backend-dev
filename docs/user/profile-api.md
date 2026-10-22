# User Profile APIs

Base API URL: `http://localhost:3113/api/v1`  
All endpoints below require:

```http
Authorization: Bearer <access_token>
```

## AUTH-06 — Update profile

`POST /user/profile`

Use `application/json` for text changes or `multipart/form-data` to upload `profile_picture`.

```json
{
  "name": "Rahul Sharma",
  "mobile": "9977112912",
  "country_code": "91",
  "gender": "male",
  "map_type": "google_map"
}
```

All fields are optional. `name`, when sent, must be 2–80 characters. `gender` is `male`, `female`, or `others`; `map_type` is `google_map`. The mobile and country code may be sent only when unchanged—mobile change needs a separate OTP verification flow before it can be supported.

For a picture, use form key `profile_picture`: JPEG/PNG/WebP only, maximum 5 MB.

Success — `200 OK`:

```json
{
  "success": true,
  "message": "profile_updated",
  "data": {
    "user": {
      "id": "u_123",
      "name": "Rahul Sharma",
      "mobile": "9977112912",
      "country_code": "91",
      "gender": "male",
      "map_type": "google_map",
      "profile_picture": "http://localhost:3113/uploads/profiles/photo.webp",
      "wallet_balance": 0,
      "emergency_contact_name": "",
      "emergency_contact_number": "",
      "locale": "en"
    }
  }
}
```

| Status | Message | When |
| --- | --- | --- |
| 401 | `unauthorized`, `invalid_or_expired_token`, `session_revoked` | Bearer token is invalid |
| 403 | `user_blocked` | Account is blocked |
| 422 | `validation_error` | Invalid name/gender/map type/country code |
| 422 | `mobile_change_requires_verification` | Mobile differs from registered mobile |
| 422 | `country_code_change_not_allowed` | Country code differs from `91` |
| 422 | `profile_picture_too_large`, `profile_picture_must_be_jpeg_png_or_webp` | File exceeds 5 MB or has unsupported type |

## AUTH-07 — Get current user

`GET /user`

Success — `200 OK`:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "u_123",
    "name": "Rahul",
    "mobile": "9977112912",
    "country_code": "91",
    "gender": "",
    "map_type": "",
    "profile_picture": "",
    "wallet_balance": 0,
    "emergency_contact_name": "",
    "emergency_contact_number": "",
    "locale": "en"
  }
}
```

| Status | Message | When |
| --- | --- | --- |
| 401 | `unauthorized`, `invalid_or_expired_token`, `session_revoked` | Bearer token is invalid |
| 403 | `user_blocked` | Account is blocked |

## AUTH-09 — Delete account

First call `POST /auth/send-otp` with the logged-in mobile and `purpose: "delete_account"`. Then call:

`POST /user/delete-account`

```json
{
  "otp": "123456",
  "reason": "No longer need the service"
}
```

`reason` is optional and limited to 500 characters.

Success — `200 OK`:

```json
{
  "success": true,
  "message": "account_deleted",
  "data": {}
}
```

The customer is soft-deleted and every active session for that customer is revoked immediately.

| Status | Message | When |
| --- | --- | --- |
| 400 | `otp_not_found`, `otp_expired`, `invalid_otp`, `otp_already_used` | Delete-account OTP fails |
| 401 | `unauthorized`, `invalid_or_expired_token`, `session_revoked` | Bearer token is invalid |
| 422 | `validation_error` | OTP is not six digits or reason exceeds 500 characters |
| 429 | `otp_attempts_exceeded` | OTP attempt limit reached |
