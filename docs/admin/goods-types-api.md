# Admin — Parcel goods types API

**Audience:** Admin panel (Next.js)
**Base:** `/api/v1/admin/goods-types` · `Authorization: Bearer <admin access token>`
**Swagger:** `/api-docs` → **Admin goods types**

The list the rider app shows on the parcel form (Documents, Electronics, …). The app reads the active ones from `GET /common/goods-types`, and a parcel booking (BOOK-01) saves the picked `goods_type_id` plus a copy of the name. See [docs/user/booking-api.md](../user/booking-api.md).

Every example is a **real response** captured from the API with the seed data (6 goods types). Only the host was changed to the live domain.

## Access

| Permission | Allows |
|---|---|
| `bookings.view` | List (Support, Operations, Super Admin) |
| `bookings.manage` | Add, edit, switch on/off, reorder, delete (Operations, Super Admin) |

On the Roles page these are under **Bookings & parcels**. Without the permission: `403 admin_forbidden`.

## Endpoints

| Method | Path | Body | Success |
|---|---|---|---|
| GET | `/admin/goods-types` | | `OK` |
| POST | `/admin/goods-types` | multipart: `name`, `status`, `icon` (file). JSON also works without an icon | `201 goods_type_created` |
| POST | `/admin/goods-types/:id/update` | multipart or JSON: any of `name`, `status`, `icon` | `goods_type_updated` |
| POST | `/admin/goods-types/:id/status` | `{ "status": "active" \| "inactive" }` | `goods_type_status_updated` |
| POST | `/admin/goods-types/reorder` | `{ "ids": [2, 1, 3, …] }` — every goods type once, in the new order | `goods_types_reordered` |
| POST | `/admin/goods-types/:id/delete` | | `goods_type_deleted` |

| Field | Rule |
|---|---|
| `name` | 2–60 characters, unique |
| `status` | `active` (default) or `inactive`. Inactive types are hidden from the app and cannot be booked |
| `icon` | Optional. JPEG, PNG or WebP, max 1 MB. A new icon replaces and deletes the old file |

A new goods type goes to the end of the list.

## GET /admin/goods-types

All goods types (active and inactive), in order, with how many parcel bookings used each one. Shortened to the first 2 of 6.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "stats": {
      "total": 6,
      "active": 6
    },
    "goods_types": [
      {
        "id": 1,
        "name": "Documents",
        "icon": "",
        "sort_order": 1,
        "status": "active",
        "used_count": 1,
        "updated_at": "2026-10-24T13:00:23.000Z"
      },
      {
        "id": 2,
        "name": "Electronics",
        "icon": "",
        "sort_order": 2,
        "status": "active",
        "used_count": 0,
        "updated_at": "2026-10-24T13:00:23.000Z"
      },
      …
    ]
  }
}
```

## POST /admin/goods-types — 201

Multipart with `name: Medicines` and an `icon` file:

```json
{
  "success": true,
  "message": "goods_type_created",
  "data": {
    "goods_type": {
      "id": 14,
      "name": "Medicines",
      "icon": "https://outdrivebackend.cyberimpulses.com/uploads/goods-types/ccac988d-6bca-460e-8af8-73dbb53222cf.webp",
      "sort_order": 7,
      "status": "active",
      "used_count": 0,
      "updated_at": "2026-10-24T13:05:53.613Z"
    }
  }
}
```

JSON `{ "name": "Gifts", "status": "inactive" }` (no icon):

```json
{ "success": true, "message": "goods_type_created", "data": { "goods_type": { "id": 15, "name": "Gifts", "icon": "", "sort_order": 8, "status": "inactive", "used_count": 0, "updated_at": "2026-10-24T13:05:53.621Z" } } }
```

## POST /admin/goods-types/14/update

`{ "name": "Medicines & Health" }`:

```json
{
  "success": true,
  "message": "goods_type_updated",
  "data": {
    "goods_type": {
      "id": 14,
      "name": "Medicines & Health",
      "icon": "https://outdrivebackend.cyberimpulses.com/uploads/goods-types/ccac988d-6bca-460e-8af8-73dbb53222cf.webp",
      "sort_order": 7,
      "status": "active",
      "used_count": 0,
      "updated_at": "2026-10-24T13:05:53.643Z"
    }
  }
}
```

## POST /admin/goods-types/14/status

`{ "status": "inactive" }`:

```json
{ "success": true, "message": "goods_type_status_updated", "data": { "goods_type": { "id": 14, "name": "Medicines & Health", "icon": "https://outdrivebackend.cyberimpulses.com/uploads/goods-types/ccac988d-6bca-460e-8af8-73dbb53222cf.webp", "sort_order": 7, "status": "inactive", "used_count": 0, "updated_at": "2026-10-24T13:05:53.653Z" } } }
```

## POST /admin/goods-types/reorder

`{ "ids": [2, 1, 3, 4, 5, 6, 14, 15] }` — returns the same data as the list, in the new order:

```json
{
  "success": true,
  "message": "goods_types_reordered",
  "data": {
    "stats": {
      "total": 8,
      "active": 6
    },
    "goods_types": [
      {
        "id": 2,
        "name": "Electronics",
        "icon": "",
        "sort_order": 1,
        "status": "active",
        "used_count": 0,
        "updated_at": "2026-10-24T13:05:53.000Z"
      },
      {
        "id": 1,
        "name": "Documents",
        "icon": "",
        "sort_order": 2,
        "status": "active",
        "used_count": 1,
        "updated_at": "2026-10-24T13:05:53.000Z"
      },
      {
        "id": 3,
        "name": "Food",
        "icon": "",
        "sort_order": 3,
        "status": "active",
        "used_count": 0,
        "updated_at": "2026-10-24T12:48:12.000Z"
      },
      …
    ]
  }
}
```

## POST /admin/goods-types/14/delete

```json
{ "success": true, "message": "goods_type_deleted", "data": { "id": 14 } }
```

A goods type that a parcel booking used cannot be deleted (`used_count` > 0). Switch it off instead; old bookings keep their saved name.

## Errors

| Status | message | When |
|---|---|---|
| 403 | `admin_forbidden` | Missing `bookings.view` / `bookings.manage` |
| 404 | `goods_type_not_found` | Wrong id |
| 409 | `goods_type_name_exists` | Another goods type has this name |
| 409 | `goods_type_in_use` | Delete of a goods type used in parcel bookings |
| 422 | `validation_error` | Bad field (`data.errors.<field>`) |
| 422 | `icon_must_be_jpeg_png_or_webp`, `icon_too_large` | Bad icon file |

| Case | Response |
|---|---|
| Duplicate name | `{ "success": false, "message": "goods_type_name_exists", "data": { "errors": { "name": "another goods type already has this name" } } }` |
| Name `"X"` | `{ "success": false, "message": "validation_error", "data": { "errors": { "name": "name must be between 2 and 60 characters" } } }` |
| Delete a used one | `{ "success": false, "message": "goods_type_in_use", "data": { "errors": { "id": "this goods type is used in parcel bookings; switch it off instead" } } }` |
| Reorder without every id | `{ "success": false, "message": "validation_error", "data": { "errors": { "ids": "ids must contain every goods type exactly once" } } }` |
| Deleted / wrong id | `{ "success": false, "message": "goods_type_not_found", "data": {} }` |

## Audit log

Every change is in **Audit logs** (module Bookings): `goods_type.created`, `goods_type.updated`, `goods_type.status_changed`, `goods_type.deleted`, `goods_types.reordered`.
