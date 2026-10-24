# Admin — Staff & Roles API

Who can use the admin panel, and what each of them can see and change. All endpoints need an admin bearer token:

```
Authorization: Bearer <admin_access_token>
```

Base URLs: `{APP_URL}/api/v1/admin/roles` and `{APP_URL}/api/v1/admin/staff`

## How access works

- Every admin account (staff member) has exactly one **role** (`tbl_admins.role_id` → `tbl_admin_roles`).
- A role is a list of **permission keys**. Each module has `view` and, where something can be changed, `manage`. `manage` covers every change in that module (add, edit, on/off, reorder, delete) and always includes `view`.
- The role is read on every request, so a permission change, a switched-off role or a blocked account applies from the next click. Nobody has to sign out.
- The panel hides menus and buttons from `permissions` in `/admin/auth/me`; the API checks every permission again (`403 admin_forbidden`).

| Module | `view` | `manage` |
|---|---|---|
| `bookings` | Bookings and parcels | Cancel bookings |
| `users` | Customers | Edit, block and delete customers |
| `services` | Ride modules | Edit, on/off, reorder |
| `zones` | Zones | Add, edit, on/off, zone services |
| `vehicles` | Vehicle types, mapping | Add, edit, icons, order, mapping |
| `fares` | Fares, history, calculator | Set, copy, on/off |
| `banners` | Banners | Add, edit, reorder, delete |
| `content` | Pages, FAQs, support contacts, onboarding slides | Add, edit, reorder, delete |
| `coupons` | Coupons and usage | Add, edit, on/off, delete |
| `staff` | Staff list | Add, edit, block, reset password, delete |
| `roles` | Roles and permissions | Add, edit, on/off, delete |
| `audit` | Audit logs | — (read-only) |

### Default roles (migration 031)

| Role | Access |
|---|---|
| Super Admin | Everything (`["*"]`), including modules added later. Locked: cannot be edited, switched off or deleted |
| Operations | `view` everywhere except staff, roles and audit; `manage` on bookings, users, services, zones, vehicles, banners, content, coupons. Fares: view only |
| Support | `view` on bookings, users, services, zones, vehicles, fares, banners, content, coupons |

Existing admins were moved from the old `role` column: `super_admin` → Super Admin, `operations` → Operations, `support` → Support.

### Safety rules

| Rule | Error |
|---|---|
| The Super Admin role cannot be changed | `403 role_locked` |
| Nobody (except a super admin) can change their own role | `403 cannot_change_own_role` |
| A role can only be given or edited by someone whose own role covers it | `403 role_outside_your_access` |
| You can only tick permissions your own role has | `403 role_permissions_exceed_yours` |
| Your own account is changed on My profile, not on Staff | `403 cannot_change_own_account` |
| Staff with more access than you cannot be edited, blocked, reset or deleted | `403 staff_outside_your_access` |
| A role that still has staff cannot be deleted | `409 role_in_use` (`data.staff_count`) |

Because a super admin can never change their own account here, at least one active super admin always remains.

## Signing in

`/admin/auth/login`, `/admin/auth/me` and the other auth responses now include:

```json
{
  "role": "Fleet Manager",
  "role_id": 4,
  "is_super_admin": false,
  "permissions": ["zones.view", "vehicles.view", "vehicles.manage"],
  "must_change_password": false
}
```

- A switched-off role cannot sign in, and its staff are signed out: `403 admin_role_inactive`.
- **First sign-in:** an account created on the Staff page, or whose password was reset there, has `must_change_password: true`. Until the staff member changes it, every admin API except `GET /admin/auth/me`, `POST /admin/auth/logout` and `POST /admin/change-password` answers `403 admin_password_change_required`. The panel shows only the "Set your password" screen.
- `POST /admin/change-password` refuses the same password again: `400 new_password_same_as_current`. A successful change clears the flag and signs out every device, as before.

## Roles

### GET `/roles` — `roles.view`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "stats": { "total": 4, "active": 4, "inactive": 0 },
    "roles": [
      { "id": 1, "name": "Super Admin", "description": "Full access to everything, including staff and roles.", "permissions": ["bookings.view", "bookings.manage", "…"], "full_access": true, "is_system": true, "status": "active", "staff_count": 1, "editable": false, "created_at": "…", "updated_at": "…" },
      { "id": 4, "name": "Fleet Manager", "description": "Runs vehicles and zones in the city", "permissions": ["zones.view", "vehicles.view", "vehicles.manage"], "full_access": false, "is_system": false, "status": "active", "staff_count": 2, "editable": true, "created_at": "…", "updated_at": "…" }
    ],
    "permission_groups": [
      { "key": "zones", "label": "Zones", "view": { "key": "zones.view", "description": "See zones on the map" }, "manage": { "key": "zones.manage", "description": "Add and edit zones, switch zones and their services on/off" } },
      { "key": "audit", "label": "Audit logs", "view": { "key": "audit.view", "description": "See who did what in the admin panel and the app" }, "manage": null }
    ]
  }
}
```

`editable` is `false` for the Super Admin role, your own role and roles with more access than yours.

### POST `/roles` — `roles.manage`

```json
{ "name": "Fleet Manager", "description": "Runs vehicles and zones in the city", "permissions": ["vehicles.manage", "zones.view"] }
```

- `name`: 2–60 characters, unique without case (`role_name_exists`).
- `permissions`: at least one known key. `vehicles.manage` adds `vehicles.view` by itself; the saved list is in checkbox order.
- `201 role_created` with `data.role`.

### POST `/roles/:id/update` — `roles.manage`

Same body as create. `200 role_updated`. The audit log says what was added and removed.

### POST `/roles/:id/status` — `roles.manage`

`{ "status": "inactive" }` signs the role's staff out and blocks their sign-in until it is `active` again. A switched-off role cannot be given to anyone.

### POST `/roles/:id/delete` — `roles.manage`

Only for a role nobody has; otherwise `409 role_in_use`.

## Staff

### GET `/staff` — `staff.view`

Query: `page` (10 per page), `search` (name, email or mobile), `status` (`active` / `inactive`), `role_id`.

```json
{
  "stats": { "total": 3, "active": 3, "inactive": 0 },
  "staff": [
    {
      "id": 7,
      "name": "Rahul Sharma",
      "email": "rahul@outdrive.in",
      "mobile": "9876543210",
      "address": "Vijay Nagar, Indore",
      "profile_picture": "http://localhost:3113/uploads/profiles/3f2c.webp",
      "role": { "id": 4, "name": "Fleet Manager", "is_system": false, "status": "active" },
      "status": "active",
      "two_factor_enabled": false,
      "must_change_password": true,
      "last_login_at": null,
      "created_at": "2026-10-24T06:00:00.000Z",
      "is_you": false,
      "manageable": true
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "total_pages": 1 },
  "roles": [{ "id": 4, "name": "Fleet Manager", "status": "active", "assignable": true }]
}
```

- `manageable`: `false` for yourself and for staff with more access than you.
- `roles`: for the filter and the form; `assignable` = active and within your own access.
- `status` `inactive` covers the old `blocked` value too; both stop the sign-in.

### GET `/staff/roles` — `staff.view`

Just the `roles` options, for the Add staff form.

### GET `/staff/:id` — `staff.view`

`{ "staff": { … }, "roles": [ … ] }`

### POST `/staff` — `staff.manage`

`multipart/form-data` (with the photo) or JSON:

| Field | Rule |
|---|---|
| `name` | Required, 2–120 characters |
| `email` | Required, valid, unique; stored in lower case. They sign in with it |
| `mobile` | Required, exactly 10 digits, unique |
| `password` | Required, 8–128 characters. Temporary: `must_change_password` is set |
| `role_id` | Required; an active role you may give |
| `address` | Optional, max 255 |
| `status` | `active` (default) or `inactive` |
| `profile_picture` | Optional file, JPEG/PNG/WebP, max 5 MB |

Duplicate email or mobile: `422 validation_error` with `data.errors.email` / `data.errors.mobile`. `201 staff_created`.

### POST `/staff/:id/update` — `staff.manage`

Same fields without `password`. A new photo replaces the old file. Setting `status` to `inactive` signs them out everywhere. `200 staff_updated`.

### POST `/staff/:id/status` — `staff.manage`

`{ "status": "inactive" }` signs them out of every device.

### POST `/staff/:id/reset-password` — `staff.manage`

`{ "new_password": "Reset@1234", "confirm_password": "Reset@1234" }` — signs them out and sets `must_change_password`.

### POST `/staff/:id/delete` — `staff.manage`

Removes the account with its sessions, sign-in codes and photo. Fare history and pages keep their rows without the editor's name; audit logs keep the name as it was.

## Audit log

Module `staff` ("Staff & roles"): `staff.created`, `staff.updated`, `staff.status_changed`, `staff.password_reset`, `staff.deleted`, `role.created`, `role.updated`, `role.status_changed`, `role.deleted`. Emails and mobiles are masked. `actor.role` is now the role name at that time (`"Super Admin"`); older logs keep the old key (`"super_admin"`).

## Deploy

Run `npm run db:migrate` on the server **before** restarting the backend. Migration 031 creates `tbl_admin_roles`, moves every admin to the matching role and removes the old `role` column. `down()` puts the column back (roles added later fall back to `support`).
