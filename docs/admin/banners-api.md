# Admin — Banners API

Home-screen offer banners shown to the rider app by `GET /common/banners` (see `docs/user/home-api.md`).

Header: `Authorization: Bearer <admin_access_token>` · Base: `{APP_URL}/api/v1/admin/banners`

| Role | View | Create / edit / status / order / delete |
|---|---|---|
| super_admin | yes | yes |
| operations | yes | yes |
| support | yes | no (`403 admin_forbidden`) |

## Banner object

```json
{
  "id": 1,
  "title": "Ride across the city",
  "subtitle": "Book a One Way ride in seconds",
  "image": "https://outdrivebackend.cyberimpulses.com/uploads/banners/x.webp",
  "module_key": "",
  "link_type": "module",
  "link_value": "one_way",
  "sort_order": 1,
  "status": "active",
  "state": "live",
  "starts_at": null,
  "ends_at": null
}
```

`state` is worked out from status and dates:

| state | Meaning | In the app? |
|---|---|---|
| `live` | active, inside its dates | yes |
| `scheduled` | active, `starts_at` in the future | no (appears automatically at that time) |
| `expired` | active, `ends_at` passed | no |
| `inactive` | switched off | no |

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/` | `{ stats: { total, live, scheduled, expired, inactive }, banners: [...] }` in display order |
| POST | `/` | multipart; `image` required (JPEG/PNG/WebP, max 2 MB, 1200×600 recommended); added at the end |
| POST | `/:id/update` | multipart; send only what changes; a new `image` replaces (and deletes) the old file |
| POST | `/:id/status` | `{ "status": "active" \| "inactive" }` |
| POST | `/reorder` | `{ "ids": [3, 1, 2] }` — every banner exactly once |
| POST | `/:id/delete` | Removes the banner and its image (banners are not referenced by bookings) |

## Fields

| Field | Rule |
|---|---|
| `title` | Required, 2–80 |
| `subtitle` | Optional, max 120 |
| `module_key` | Optional; empty = general home banner, else a HOME-01 module key (shown for that module only) |
| `link_type` | `none` (default) \| `module` \| `url` |
| `link_value` | `module` → a module key · `url` → full `http(s)://` URL (max 500) · `none` → ignored |
| `starts_at`, `ends_at` | Optional date-time. Without an offset (`2026-10-23 10:30` or `2026-10-23T10:30`) it is **Indian time**. Empty = right away / no end. `ends_at` must be after `starts_at` |
| `status` | `active` (default) \| `inactive` |

## Seed

`npm run db:seed` adds 3 demo banners (One Way, Outstation, Parcel) **only when the banners table is empty**, so banners an admin deleted are not brought back.

## Errors

| Status | message |
|---|---|
| 403 | `admin_forbidden` |
| 404 | `banner_not_found` |
| 422 | `validation_error` (`data.errors.<field>`), `image_must_be_jpeg_png_or_webp`, `image_too_large` |
