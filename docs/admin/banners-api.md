# Admin — Banners API

A banner is only an **image** for the **user app** or the **driver app**, shown in admin order by `GET /common/banners?type=user|driver` (see [docs/user/home-api.md](../user/home-api.md#banners--home-screen)).

**Header:** `Authorization: Bearer <admin_access_token>`
**Base:** `https://outdrivebackend.cyberimpulses.com/api/v1/admin/banners`

Examples are real responses; only the host was changed to the live domain.

| Role | View | Add / edit / order / delete |
|---|---|---|
| super_admin | yes | yes |
| operations | yes | yes |
| support | yes | no (`403 admin_forbidden`) |

Table `tbl_banners`: `id`, `image`, `type` (`user` / `driver`), `sort_order`, timestamps. Migration **030** removed the old title, subtitle, module, link, status and date columns.

| Method | Route | Body | Message |
|---|---|---|---|
| GET | `/admin/banners` | — | `OK` |
| POST | `/admin/banners` | multipart: `image` (required), `type` (required) | `banner_created` (201) |
| POST | `/admin/banners/{id}/update` | multipart: `image` and/or `type` | `banner_updated` |
| POST | `/admin/banners/reorder` | JSON `{ "type": "user", "ids": [...] }` | `banners_reordered` |
| POST | `/admin/banners/{id}/delete` | — | `banner_deleted` |

**Image:** JPEG, PNG or WebP, max 2 MB, 1200 × 600 recommended. A replaced or deleted banner's file is removed from disk. Every change is written to the audit log.

## GET /admin/banners

User-app banners first, then driver-app banners, each in display order.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "stats": { "total": 4, "user": 3, "driver": 1 },
    "banners": [
      { "id": 1, "image": "https://outdrivebackend.cyberimpulses.com/uploads/banners/0fd399ba-7e3b-4068-8d46-70be704c6944.webp", "type": "user", "sort_order": 1, "created_at": "2026-10-23T10:46:27.000Z", "updated_at": "2026-10-24T07:44:01.000Z" },
      { "id": 2, "image": "https://outdrivebackend.cyberimpulses.com/uploads/banners/3cf18988-d6a4-45d2-868c-5573b98e9f7e.webp", "type": "user", "sort_order": 2, "created_at": "2026-10-23T10:46:27.000Z", "updated_at": "2026-10-24T07:44:01.000Z" },
      { "id": 3, "image": "https://outdrivebackend.cyberimpulses.com/uploads/banners/9ab5709e-df06-4fa7-9cc9-ff0220cb2028.webp", "type": "user", "sort_order": 3, "created_at": "2026-10-23T10:46:27.000Z", "updated_at": "2026-10-24T07:44:01.000Z" },
      { "id": 25, "image": "https://outdrivebackend.cyberimpulses.com/uploads/banners/51f0ddbd-ec7d-4468-8316-c3ab19d2a946.webp", "type": "driver", "sort_order": 1, "created_at": "2026-10-24T09:50:54.000Z", "updated_at": "2026-10-24T09:50:54.000Z" }
    ]
  }
}
```

## POST /admin/banners → 201

Multipart: `type=driver`, `image=<file>`. A new banner goes to the end of its app's list.

```json
{
  "success": true,
  "message": "banner_created",
  "data": {
    "banner": { "id": 25, "image": "https://outdrivebackend.cyberimpulses.com/uploads/banners/51f0ddbd-ec7d-4468-8316-c3ab19d2a946.webp", "type": "driver", "sort_order": 1, "created_at": "2026-10-24T09:50:54.113Z", "updated_at": "2026-10-24T09:50:54.113Z" }
  }
}
```

## POST /admin/banners/{id}/update

Send a new `image`, a new `type`, or both. When the type changes, the banner moves to the end of the other app's list.

Multipart: `type=user`

```json
{
  "success": true,
  "message": "banner_updated",
  "data": {
    "banner": { "id": 25, "image": "https://outdrivebackend.cyberimpulses.com/uploads/banners/51f0ddbd-ec7d-4468-8316-c3ab19d2a946.webp", "type": "user", "sort_order": 4, "created_at": "2026-10-24T09:50:54.000Z", "updated_at": "2026-10-24T09:50:54.145Z" }
  }
}
```

## POST /admin/banners/reorder

Orders one app's banners at a time; `ids` must list every banner of that `type` once.

```json
{ "type": "user", "ids": [1, 2, 3, 25] }
```

The response is `banners_reordered` with `data.banners` in the new order (`sort_order` 1, 2, 3, 4).

## POST /admin/banners/{id}/delete

```json
{ "success": true, "message": "banner_deleted", "data": { "id": 25 } }
```

## Errors

| Case | Status | Response |
|---|---|---|
| `type` missing or not `user` / `driver` | 422 | `{ "message": "validation_error", "data": { "errors": { "type": "type must be user or driver" } } }` |
| No image on create | 422 | `{ "errors": { "image": "image is required" } }` |
| Wrong file type / too big | 422 | `image_must_be_jpeg_png_or_webp` / `image_too_large` |
| Reorder without every banner of the type | 422 | `{ "errors": { "ids": "ids must contain every user banner exactly once" } }` |
| Unknown id | 404 | `banner_not_found` |
| `support` role changing anything | 403 | `admin_forbidden` |

## Seed data

`npm run db:seed` adds 3 user-app banners (city rides, outstation, parcel) only when the table is empty.
