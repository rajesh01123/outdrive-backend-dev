# Admin — Coupons and Onboarding slides

**Audience:** Admin panel (`/admin/coupons` and Content → Onboarding)
**Base URL:** `https://outdrivebackend.cyberimpulses.com/api/v1/admin`
**Swagger:** `/api-docs` → sections **Admin coupons** and **Admin onboarding**
**App side:** [docs/user/onboarding-promo-api.md](../user/onboarding-promo-api.md)

Every example is a **real response** captured from the API. Only the host was changed to the live domain.

| | |
|---|---|
| Auth | `Authorization: Bearer <admin access_token>` |
| View (`GET`) | Coupons: `coupons.view`; onboarding slides: `content.view` (Super Admin, Operations and Support by default) |
| Changes (`POST`) | Coupons: `coupons.manage`; onboarding slides: `content.manage` (Super Admin and Operations by default). Others get `403 admin_forbidden` |
| Audit log | Every create, edit, status change, reorder and delete is recorded (see Audit logs) |

## Tables

| Table | Holds |
|---|---|
| `tbl_coupons` | Code, title, description, `flat` / `percent`, value, minimum fare, cap, uses per user, total limit, modules, zones, start and end dates, status. Uses are counted from `tbl_bookings.promo_code` |
| `tbl_onboarding_slides` | English and Hindi title and description, image, order, status |

---

## Coupons — `/admin/coupons`

| Method | Route | Message |
|---|---|---|
| GET | `/admin/coupons` | List with stats and form options |
| POST | `/admin/coupons` | `coupon_created` (201) |
| POST | `/admin/coupons/{id}/update` | `coupon_updated` |
| POST | `/admin/coupons/{id}/status` | `coupon_status_updated` |
| POST | `/admin/coupons/{id}/delete` | `coupon_deleted` |

### Fields (JSON body)

| Field | Rule |
|---|---|
| `code` | 3–20 letters or digits, saved in CAPS (`weekend25` → `WEEKEND25`), unique. **Cannot be renamed once used** in a booking |
| `title` | 2–80 characters (required) |
| `description` | Max 200 |
| `discount_type` | `flat` or `percent` (required) |
| `discount_value` | ₹ for flat; 1–100 for percent (required) |
| `max_discount_amount` | Percent only; `null` = no cap. Ignored for flat |
| `min_trip_amount` | Default 0; the fare before the promo must reach it |
| `uses_per_user` | 1–100, default 1 |
| `total_uses_limit` | 0 = no limit (default) |
| `module_keys` | e.g. `["one_way","scheduled"]`; `[]` = every module |
| `zone_ids` | e.g. `[1]`; `[]` = every zone |
| `starts_at` / `ends_at` | Indian time `"2026-10-25 00:00"`; empty = right away / no end; end must be after start |
| `status` | `active` (default) or `inactive` |

`state` in the response: `live` (usable now), `scheduled`, `expired`, `inactive`. `used_count` = bookings with this code that were not cancelled.

### GET /admin/coupons

Shortened to one coupon. `options` feeds the module and zone checkboxes in the form.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "stats": { "total": 5, "live": 4, "scheduled": 0, "expired": 1, "inactive": 0, "total_uses": 1 },
    "coupons": [
      { "id": 18, "code": "OLDDEAL", "title": "Old deal", "description": "", "discount_type": "flat", "discount_value": 40, "min_trip_amount": 0, "max_discount_amount": null, "uses_per_user": 1, "total_uses_limit": 0, "module_keys": [], "zone_ids": [], "starts_at": "2026-10-14T07:49:00.000Z", "ends_at": "2026-10-23T07:49:00.000Z", "status": "active", "state": "expired", "used_count": 0, "created_at": "2026-10-24T07:49:22.000Z", "updated_at": "2026-10-24T07:49:22.000Z" }
    ],
    "options": {
      "modules": [
        { "key": "one_way", "name": "One Way" }, { "key": "shared", "name": "Shared Ride" }, { "key": "outstation", "name": "Outstation" },
        { "key": "round_trip", "name": "Round Trip" }, { "key": "scheduled", "name": "Scheduled" },
        { "key": "parcel_bike", "name": "Parcel on Bike" }, { "key": "parcel_3wheeler", "name": "Parcel on 3 Wheeler" }
      ],
      "zones": [{ "id": 6, "name": "bhawarkuva" }, { "id": 1, "name": "Indore City" }]
    }
  }
}
```

### POST /admin/coupons → 201

```json
{
  "code": "weekend25",
  "title": "25% off this weekend",
  "description": "Up to ₹75 off on city rides",
  "discount_type": "percent",
  "discount_value": 25,
  "max_discount_amount": 75,
  "min_trip_amount": 120,
  "uses_per_user": 2,
  "total_uses_limit": 500,
  "module_keys": ["one_way", "scheduled"],
  "zone_ids": [1],
  "starts_at": "2026-10-25 00:00",
  "ends_at": "2026-10-26 23:59",
  "status": "active"
}
```

```json
{
  "success": true,
  "message": "coupon_created",
  "data": {
    "coupon": {
      "id": 19, "code": "WEEKEND25", "title": "25% off this weekend", "description": "Up to ₹75 off on city rides",
      "discount_type": "percent", "discount_value": 25, "min_trip_amount": 120, "max_discount_amount": 75,
      "uses_per_user": 2, "total_uses_limit": 500, "module_keys": ["one_way", "scheduled"], "zone_ids": [1],
      "starts_at": "2026-10-24T18:30:00.000Z", "ends_at": "2026-10-26T18:29:00.000Z",
      "status": "active", "state": "scheduled", "used_count": 0,
      "created_at": "2026-10-24T07:49:22.641Z", "updated_at": "2026-10-24T07:49:22.641Z"
    }
  }
}
```

The IST times `2026-10-25 00:00` and `2026-10-26 23:59` are stored as UTC.

### Update, status and delete

| Call | Result |
|---|---|
| `POST /{id}/update` `{ "max_discount_amount": 90 }` | `coupon_updated`, cap now 90 (send only the fields that change) |
| `POST /{id}/status` `{ "status": "inactive" }` | `coupon_status_updated`, `state: "inactive"`; riders stop seeing it at once |
| `POST /{id}/delete` (never used) | `{ "success": true, "message": "coupon_deleted", "data": { "id": 19 } }` |

### Errors

| Case | Status | Response |
|---|---|---|
| Code already exists (`SAVE50`) | 409 | `{ "message": "coupon_code_exists", "data": { "errors": { "code": "another coupon already uses this code" } } }` |
| Renaming a used code | 422 | `{ "message": "coupon_code_locked", "data": { "errors": { "code": "this code is already used in bookings; create a new coupon instead" } } }` |
| Deleting a used coupon | 409 | `{ "message": "coupon_in_use", "data": { "errors": { "id": "this coupon is used in bookings; set it inactive instead" } } }` |
| Percent over 100, bad code, unknown module, missing zone, end before start | 422 | `validation_error` with `data.errors.<field>` |
| Unknown id | 404 | `coupon_not_found` |

### Demo coupons (`npm run db:seed`)

Added only when `tbl_coupons` is empty. Each is valid from the day of seeding for 90 days.

| Code | Offer | Minimum fare | Per user | Modules |
|---|---|---|---|---|
| `SAVE50` | Flat ₹50 off | ₹200 | 3 | All |
| `RIDE20` | 20 % off, up to ₹100 | ₹100 | 1 | All |
| `PARCEL30` | Flat ₹30 off | ₹150 | 2 | Parcel on Bike, Parcel on 3 Wheeler |
| `OUTSTATION10` | 10 % off, up to ₹300 | ₹1,000 | 2 | Outstation, Round Trip |

---

## Onboarding slides — `/admin/onboarding`

| Method | Route | Message |
|---|---|---|
| GET | `/admin/onboarding` | `{ stats, slides }` |
| POST | `/admin/onboarding` | `onboarding_slide_created` (201): **multipart**, `image` required |
| POST | `/admin/onboarding/{id}/update` | `onboarding_slide_updated`: multipart, `image` optional (the old file is deleted when replaced) |
| POST | `/admin/onboarding/{id}/status` | `onboarding_slide_status_updated` |
| POST | `/admin/onboarding/reorder` | `onboarding_reordered`; `{ "ids": [...] }` lists every slide once |
| POST | `/admin/onboarding/{id}/delete` | `onboarding_slide_deleted` (the image file is deleted) |

| Field | Rule |
|---|---|
| `title` | 2–80 (English, required) |
| `description` | Max 200 |
| `title_hi` / `description_hi` | Optional Hindi (80 / 200). Empty → the app gets English |
| `image` | JPEG, PNG or WebP, max 2 MB; square 1080 × 1080 recommended |
| `status` | `active` (default) or `inactive` |

### POST /admin/onboarding → 201

Multipart: `title=Book in seconds`, `description=…`, `title_hi=सेकंडों में बुक करें`, `description_hi=…`, `image=<file>`

```json
{
  "success": true,
  "message": "onboarding_slide_created",
  "data": {
    "slide": {
      "id": 5,
      "title": "Book in seconds",
      "description": "Choose pickup and drop, see the fare, then ride.",
      "title_hi": "सेकंडों में बुक करें",
      "description_hi": "पिकअप और ड्रॉप चुनें, किराया देखें, फिर सवारी करें।",
      "image": "https://outdrivebackend.cyberimpulses.com/uploads/onboarding/88377e8a-13dd-4c63-a73c-7db61b5567ca.webp",
      "sort_order": 1,
      "status": "active",
      "updated_at": "2026-10-24T07:49:22.412Z"
    }
  }
}
```

### GET /admin/onboarding

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "stats": { "total": 2, "active": 2, "inactive": 0 },
    "slides": [
      { "id": 5, "title": "Book in seconds", "description": "Choose pickup and drop, see the fare, then ride.", "title_hi": "सेकंडों में बुक करें", "description_hi": "पिकअप और ड्रॉप चुनें, किराया देखें, फिर सवारी करें।", "image": "https://outdrivebackend.cyberimpulses.com/uploads/onboarding/88377e8a-13dd-4c63-a73c-7db61b5567ca.webp", "sort_order": 1, "status": "active", "updated_at": "2026-10-24T07:49:22.000Z" },
      { "id": 6, "title": "Send parcels too", "description": "Deliver documents and packages across the city.", "title_hi": "", "description_hi": "", "image": "https://outdrivebackend.cyberimpulses.com/uploads/onboarding/80844f4f-d798-472d-ae4d-a20ec86c739d.webp", "sort_order": 2, "status": "active", "updated_at": "2026-10-24T07:49:22.000Z" }
    ]
  }
}
```

The seeder adds no slides. Until an admin adds one, the app shows its built-in onboarding.

---

## Deploy

```bash
npm run db:migrate   # 028 tbl_onboarding_slides, 029 tbl_coupons
npm run db:seed      # adds the 4 demo coupons when tbl_coupons is empty
pm2 restart outdrive-backend
```
