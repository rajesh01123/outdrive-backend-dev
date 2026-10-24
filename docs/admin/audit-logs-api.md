# Admin — Audit logs

**Audience:** Admin panel (`/admin/audit-logs`)
**Base URL:** `https://outdrivebackend.cyberimpulses.com/api/v1/admin/audit-logs`
**Swagger:** `/api-docs` → section **Admin audit logs**

The examples below are **real responses** captured locally. Because they were captured locally, `ip_address` shows `::1`; on the live server it is the visitor's IP.

| | |
|---|---|
| Auth | `Authorization: Bearer <admin access_token>` |
| Who can read | Roles with `audit.view` (only Super Admin by default). Others get `403 admin_forbidden` |
| Write API | None. Logs cannot be edited or deleted through the API |
| Retention | Logs older than `AUDIT_LOG_RETENTION_DAYS` (default **180**) are removed once a day; `0` keeps everything |

## What is logged

Only sign-ins and changes are logged. Pages that only show data (GET requests) are not.

| Module (`module`) | Actions (`action`) |
|---|---|
| `auth`: admin sign-in | `admin.login`, `admin.login_failed` (wrong password, unknown email, inactive account, wrong 2FA code), `admin.logout`, `admin.password_reset_requested`, `admin.password_reset` |
| `profile`: own admin profile | `admin.profile_updated`, `admin.password_changed`, `admin.2fa_enabled`, `admin.2fa_disabled` |
| `users` | `user.updated`, `user.status_changed`, `user.deleted` |
| `services` | `service.updated`, `service.status_changed`, `services.reordered` |
| `zones` | `zone.created`, `zone.updated`, `zone.status_changed`, `zone.service_changed` |
| `vehicles` | `vehicle.created`, `vehicle.updated`, `vehicle.status_changed`, `vehicles.reordered`, `vehicles.mapping_saved` |
| `fares` | `fare.saved`, `fare.copied`, `fare.status_changed` |
| `bookings` | `booking.cancelled` (by an admin) |
| `banners` | `banner.created`, `banner.updated`, `banner.status_changed`, `banners.reordered`, `banner.deleted` |
| `content` | `page.*`, `faq.*`, `support_contact.*` (created, updated, status_changed, reordered, deleted) |
| `app`: user app | `app.user_registered`, `app.user_login`, `app.user_login_failed` (wrong OTP, blocked account), `app.user_logout`, `app.profile_updated`, `app.account_deleted` |

`actor.type` is `admin`, `user`, `driver` or `system`. `driver` is ready for the driver app, which has no endpoints yet.

### Safety rules

- Passwords, OTPs and tokens are **never** stored. A field whose name looks like one (`password`, `otp`, `token`, `secret`, `hash`) is dropped, even if it is passed by mistake.
- Mobile numbers are masked (`98******10`) and so are unknown emails on failed sign-ins (`no***@test.local`).
- Edits store only the fields that changed (`changes.<field>.from / to`), cut to 300 characters. Page HTML is not stored, only its length.
- Writing a log never blocks or breaks the request. If the table is missing, the API keeps working and the server prints one warning a minute.
- A change made inside a database transaction is logged only after the transaction commits, so a rolled-back change never appears.
- `actor.name` and `actor.role` are saved at the time of the action, so the log stays readable after an admin or user is deleted.

---

## GET /admin/audit-logs

Newest first, 20 per page.

| Query | Rule |
|---|---|
| `page` | Default 1 |
| `limit` | 1–100, default 20 |
| `search` | Max 100 characters; matches the actor name, the description and the record |
| `action` | One key from `filters.actions` |
| `module` | One key from `filters.modules` |
| `actor_type` | `admin`, `user`, `driver`, `system` |
| `status` | `success`, `failed` |
| `date` | One Indian (IST) day, `YYYY-MM-DD` |

### 200

`GET /admin/audit-logs?limit=3`. `filters.modules` and `filters.actions` are shortened here; the real lists have 11 modules and 54 actions.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "stats": { "today": 3, "failed_today": 1, "retention_days": 180 },
    "logs": [
      {
        "id": 90,
        "action": "faq.updated",
        "action_label": "FAQ updated",
        "module": "content",
        "module_label": "Content",
        "status": "success",
        "actor": { "type": "admin", "id": 84, "name": "Rajesh", "role": "Super Admin" },
        "target": { "type": "faq", "id": "21", "label": "How do I change my pickup point?" },
        "description": "Edited FAQ \"How do I change my pickup point?\": answer, category",
        "changes": {
          "answer": { "from": "Tap the pickup address and move the pin.", "to": "Before the driver arrives, tap the pickup address and move the pin." },
          "category": { "from": "Booking", "to": "Trips" }
        },
        "ip_address": "::1",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "device": "",
        "created_at": "2026-10-24T07:12:57.000Z"
      },
      {
        "id": 89,
        "action": "faq.created",
        "action_label": "FAQ created",
        "module": "content",
        "module_label": "Content",
        "status": "success",
        "actor": { "type": "admin", "id": 84, "name": "Rajesh", "role": "Super Admin" },
        "target": { "type": "faq", "id": "21", "label": "How do I change my pickup point?" },
        "description": "Added FAQ \"How do I change my pickup point?\" in Booking",
        "changes": null,
        "ip_address": "::1",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "device": "",
        "created_at": "2026-10-24T07:12:57.000Z"
      },
      {
        "id": 88,
        "action": "admin.login_failed",
        "action_label": "Admin login failed",
        "module": "auth",
        "module_label": "Admin login & security",
        "status": "failed",
        "actor": { "type": "admin", "id": 84, "name": "Rajesh", "role": "Super Admin" },
        "target": null,
        "description": "Wrong password",
        "changes": null,
        "ip_address": "::1",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "device": "Chrome on Windows",
        "created_at": "2026-10-24T07:12:57.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 3, "total": 3, "total_pages": 1 },
    "filters": {
      "modules": [{ "key": "auth", "label": "Admin login & security" }, { "key": "profile", "label": "Admin profile" }],
      "actions": [{ "key": "admin.login", "module": "auth", "label": "Admin login" }, { "key": "admin.login_failed", "module": "auth", "label": "Admin login failed" }],
      "actor_types": ["admin", "user", "driver", "system"],
      "statuses": ["success", "failed"]
    }
  }
}
```

`device` is the browser name sent at sign-in (`device_name`), or the platform (`android` / `ios`) for the user app.

### Errors

| Case | Status | Response |
|---|---|---|
| Admin whose role has no `audit.view` | 403 | `{ "success": false, "message": "admin_forbidden", "data": {} }` |
| `action=nope` | 422 | `{ "message": "validation_error", "data": { "errors": { "action": "action is not a known audit action" } } }` |
| `date=24-10-2026` | 422 | `{ "message": "validation_error", "data": { "errors": { "date": "date must be YYYY-MM-DD" } } }` |
| No token | 401 | `admin_unauthorized` |

---

## GET /admin/audit-logs/{id}

Returns `{ "log": { … } }` with the same fields as a list item.

| Case | Status | Response |
|---|---|---|
| Unknown id | 404 | `{ "success": false, "message": "audit_log_not_found", "data": {} }` |

---

## Deploy

1. `npm run db:migrate`: migration **027** creates `tbl_audit_logs`. No seed is needed.
2. Optional, in `.env`: `AUDIT_LOG_RETENTION_DAYS=180`.
3. Restart the API with `pm2 restart outdrive-backend`.

The API reads the visitor's IP from `X-Forwarded-For` only when the request comes from a proxy on the same server (nginx). Callers from outside cannot fake it.
