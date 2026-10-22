# Services API

The services shown on the rider-app home screen (One Way, Outstation, Parcel…), managed from the admin panel.

## Setup

```bash
npm run db:migrate          # creates tbl_services (migration 010)
npm run db:seed:services    # adds the 6 default services with images
```

The seeder only creates services whose `slug` is missing, so it is safe to re-run and never overwrites admin changes. Default images live in `src/database/seeds/assets/services/` and are copied to `uploads/services/`.

| sort_order | name | slug | service_type | status |
|---|---|---|---|---|
| 1 | One Way | `one_way` | ride | active |
| 2 | Shared Ride | `shared_ride` | ride | active |
| 3 | Outstation | `outstation` | ride | active |
| 4 | Round Trip | `round_trip` | ride | active |
| 5 | Scheduled | `scheduled` | ride | coming_soon |
| 6 | Parcel | `parcel` | parcel | coming_soon |

## Status

| status | Shown in app | Bookable |
|---|---|---|
| `active` | yes | yes |
| `coming_soon` | yes, with a "Coming soon" tag | no |
| `inactive` | no | no |

There is no delete. Set a service `inactive` to remove it from the app — bookings will reference services later, so rows are kept.

## Service object

```json
{
  "id": 1,
  "name": "One Way",
  "slug": "one_way",
  "subtitle": "City rides",
  "image": "http://localhost:3113/uploads/services/7f3a.webp",
  "service_type": "ride",
  "sort_order": 1,
  "status": "active"
}
```

`slug` is the stable identifier the app should code against. It is set on create and cannot be changed afterwards; `name` can be renamed freely.

---

## App: GET `/api/v1/services`

Public, no token. Returns `active` and `coming_soon` services in display order, with `is_bookable` (`true` only for `active`). `sort_order` is omitted — the array is already ordered.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "services": [
      { "id": 1, "name": "One Way", "slug": "one_way", "subtitle": "City rides", "image": "http://…/uploads/services/7f3a.webp", "service_type": "ride", "status": "active", "is_bookable": true },
      { "id": 6, "name": "Parcel", "slug": "parcel", "subtitle": "Send packages across the city", "image": "http://…", "service_type": "parcel", "status": "coming_soon", "is_bookable": false }
    ]
  }
}
```

---

## Admin: `/api/v1/admin/services`

Header: `Authorization: Bearer <admin_access_token>`

| Role | View | Create / edit / status / reorder |
|---|---|---|
| super_admin | yes | yes |
| operations | yes | yes |
| support | yes | no (`403 admin_forbidden`) |

### GET `/`

```json
{ "stats": { "total": 6, "active": 4, "coming_soon": 2, "inactive": 0 }, "services": [ { "id": 1, "…": "…" } ] }
```

No pagination — the full list in display order.

### POST `/` — create (`multipart/form-data`)

| Field | Rule |
|---|---|
| `name` | Required, 2–60 characters |
| `slug` | Optional; generated from `name` when empty (`Airport Transfer` → `airport_transfer`). Lowercase letters, numbers, single underscores, max 40. Must be unique |
| `subtitle` | Optional, max 120 |
| `service_type` | `ride` (default) or `parcel` |
| `status` | `active`, `coming_soon` or `inactive` (default) |
| `image` | **Required**. JPEG, PNG or WebP, max 2 MB, 512×512 recommended |

New services are added at the end of the list. Returns `201 service_created`.

### POST `/:id/update` — edit (`multipart/form-data`)

Same fields as create, all optional. Send `image` only to replace it — the old file is deleted from disk. Sending a different `slug` returns `422 service_slug_locked`.

### POST `/:id/status`

```json
{ "status": "coming_soon" }
```

### POST `/reorder`

```json
{ "ids": [3, 1, 2, 4, 5, 6] }
```

`ids` must contain every service exactly once; positions become `sort_order` 1, 2, 3…

## Errors

| Status | message |
|---|---|
| 401 | `admin_unauthorized`, `admin_invalid_or_expired_token`, `admin_session_revoked` |
| 403 | `admin_forbidden` |
| 404 | `service_not_found` |
| 409 | `service_slug_exists` |
| 422 | `validation_error` (with `data.errors.<field>`), `service_slug_locked`, `image_must_be_jpeg_png_or_webp`, `image_too_large` |

A request that fails after the image was uploaded removes that file, so failed uploads leave nothing behind.
