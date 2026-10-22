# Admin — Users API

Customer management for the admin panel. All endpoints need an admin bearer token:

```
Authorization: Bearer <admin_access_token>
```

Base URL: `{APP_URL}/api/v1/admin/users`

## Roles

| Role | List / view / stats | Edit / status | Delete |
|---|---|---|---|
| super_admin | yes | yes | yes |
| operations | yes | yes | no |
| support | yes | no | no |

A role without access gets `403 admin_forbidden`.

## Status

The panel shows two statuses: `active` and `inactive`.

- `inactive` is stored as `blocked` in `tbl_users.status`, so the app's existing login check (`user_blocked`) applies.
- Setting a user `inactive` revokes every active session — the user is logged out of all devices at once.
- Deleted users never appear in any list or count.

## User object

```json
{
  "id": 12,
  "name": "Rahul Sharma",
  "mobile": "9876543210",
  "country_code": "91",
  "profile_picture": "http://localhost:3113/uploads/profiles/abc.png",
  "gender": "male",
  "wallet_balance": 0,
  "emergency_contact_name": "Asha Sharma",
  "emergency_contact_number": "9876500000",
  "locale": "en",
  "status": "active",
  "joined_at": "2026-10-22T08:00:00.000Z"
}
```

---

## GET `/stats`

```json
{ "success": true, "message": "OK", "data": { "stats": { "total": 45, "active": 41, "inactive": 4, "new_this_week": 6 } } }
```

`total` = active + inactive. `new_this_week` = joined in the last 7 days.

## GET `/`

Query params (all optional):

| Param | Notes |
|---|---|
| `page` | Default `1` |
| `search` | Matches name or mobile (partial) |
| `status` | `active` or `inactive`; omit for both |

Fixed page size: **10**, newest first.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "users": [ { "id": 12, "name": "Rahul Sharma", "status": "active" } ],
    "pagination": { "page": 1, "limit": 10, "total": 45, "total_pages": 5 }
  }
}
```

## GET `/:id`

Returns `{ "user": { ... } }`. `404 user_not_found` if missing or deleted.

## POST `/:id/update`

Send only the fields to change.

```json
{ "name": "Rahul Sharma", "gender": "male", "emergency_contact_name": "Asha Sharma", "emergency_contact_number": "9876500000" }
```

| Field | Rule |
|---|---|
| `name` | 2–80 characters |
| `gender` | `male`, `female`, `others`, or `""` to clear |
| `emergency_contact_name` | Up to 80 characters, `""` to clear |
| `emergency_contact_number` | 10–15 digits, `""` to clear |

Response message: `user_updated`, with the updated `user`.

## POST `/:id/status`

```json
{ "status": "inactive" }
```

Response message: `user_status_updated`, with the updated `user`.

## POST `/:id/delete`

```json
{ "reason": "Duplicate account" }
```

`reason` is required (max 500). Soft delete: sessions are revoked, devices unlinked, `status` = `deleted`, `deleted_at` set. The same mobile can register again later.

Response message: `user_deleted`.

## Errors

| Status | message |
|---|---|
| 401 | `admin_unauthorized`, `admin_invalid_or_expired_token`, `admin_session_revoked` |
| 403 | `admin_forbidden` |
| 404 | `user_not_found` |
| 422 | `validation_error` with `data.errors.<field>` |
