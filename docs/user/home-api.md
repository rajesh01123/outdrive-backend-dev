# Rider app — Recent searches · Favourites · Banners

**Audience:** Flutter customer app
**Base URL:** `https://outdrivebackend.cyberimpulses.com/api/v1` (local: `http://localhost:3113/api/v1`)
**Swagger:** `/api-docs` → sections **Recent searches**, **Favourites**, **Common** (banners), **User** (`GET /user`)

Every example below is a **real response** captured from the API. Envelope, auth and keys are the same as the other rider APIs:

| | |
|---|---|
| Envelope | `{ "success": true, "message": "machine_readable", "data": ... }` |
| Errors | `{ "success": false, "message": "error_key", "data": { ... } }` — `data.errors.<field>` for field errors (the first invalid field is reported) |
| Auth | `Authorization: Bearer <access_token>` — required for recent searches and favourites, optional for banners |
| Body | JSON (no multipart) |

## Flow

```
Login → GET /user                        (favourites come nested in favouriteLocations.data)
      → GET /common/banners?type=user    (home banners)
      → HOME-04 list recent searches     (shown under the "Where to?" box)
      → HOME-05 save a search            (after the user picks pickup + drop)
      → HOME-06 / HOME-07 favourites     (then refresh GET /user)
      → ZONE-01 → ETA-01 → BOOK-01
```

---

## HOME-04 — List recent searches

`GET /request/list-recent-searches` · Bearer · no body

| Query | Type | Rule |
|---|---|---|
| `limit` | number | 1–20, default 10 |
| `transport_type` | string | Optional: `taxi` \| `delivery` |

### 200 — list (newest first)

`GET /request/list-recent-searches?limit=10`

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 34,
      "user_id": 22,
      "pick_lat": 22.6867,
      "pick_lng": 75.8715,
      "drop_lat": 22.7533,
      "drop_lng": 75.9237,
      "pick_address": "301, Atulya IT Park, Indore",
      "pick_short_address": "Atulya IT Park",
      "drop_address": "Vijay Nagar, Indore",
      "drop_short_address": "Vijay Nagar",
      "pickup_poc_name": "",
      "pickup_poc_mobile": "",
      "pickup_poc_instruction": "",
      "drop_poc_name": "",
      "drop_poc_mobile": "",
      "drop_poc_instruction": "",
      "total_distance": 7.8,
      "total_time": 21,
      "poly_line": "",
      "transport_type": "delivery",
      "module_key": "parcel_bike",
      "searchStops": {
        "data": []
      },
      "created_at": "2026-10-23T10:51:01.000Z"
    },
    {
      "id": 33,
      "user_id": 22,
      "pick_lat": 22.6867,
      "pick_lng": 75.8715,
      "drop_lat": 22.7533,
      "drop_lng": 75.8937,
      "pick_address": "301, Atulya IT Park, Indore",
      "pick_short_address": "Atulya IT Park",
      "drop_address": "Airport Road, Indore",
      "drop_short_address": "Airport Road",
      "pickup_poc_name": "",
      "pickup_poc_mobile": "",
      "pickup_poc_instruction": "",
      "drop_poc_name": "",
      "drop_poc_mobile": "",
      "drop_poc_instruction": "",
      "total_distance": 9.1,
      "total_time": 26,
      "poly_line": "",
      "transport_type": "taxi",
      "module_key": "one_way",
      "searchStops": {
        "data": [
          {
            "order": 1,
            "latitude": 22.7244,
            "longitude": 75.8839,
            "address": "Palasia Square, Indore",
            "short_address": "Palasia"
          }
        ]
      },
      "created_at": "2026-10-23T10:51:01.000Z"
    },
    {
      "id": 32,
      "user_id": 22,
      "pick_lat": 22.6869,
      "pick_lng": 75.8715,
      "drop_lat": 22.7172,
      "drop_lng": 75.8684,
      "pick_address": "301, Atulya IT Park, Indore",
      "pick_short_address": "Atulya IT Park",
      "drop_address": "Bhawarkuan Square, Indore",
      "drop_short_address": "Bhawarkuan Square",
      "pickup_poc_name": "",
      "pickup_poc_mobile": "",
      "pickup_poc_instruction": "",
      "drop_poc_name": "",
      "drop_poc_mobile": "",
      "drop_poc_instruction": "",
      "total_distance": 4.3,
      "total_time": 13,
      "poly_line": "",
      "transport_type": "taxi",
      "module_key": "one_way",
      "searchStops": {
        "data": []
      },
      "created_at": "2026-10-23T10:51:01.000Z"
    }
  ]
}
```

### 200 — only parcel searches

`GET /request/list-recent-searches?transport_type=delivery`

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 34,
      "user_id": 22,
      "pick_lat": 22.6867,
      "pick_lng": 75.8715,
      "drop_lat": 22.7533,
      "drop_lng": 75.9237,
      "pick_address": "301, Atulya IT Park, Indore",
      "pick_short_address": "Atulya IT Park",
      "drop_address": "Vijay Nagar, Indore",
      "drop_short_address": "Vijay Nagar",
      "pickup_poc_name": "",
      "pickup_poc_mobile": "",
      "pickup_poc_instruction": "",
      "drop_poc_name": "",
      "drop_poc_mobile": "",
      "drop_poc_instruction": "",
      "total_distance": 7.8,
      "total_time": 21,
      "poly_line": "",
      "transport_type": "delivery",
      "module_key": "parcel_bike",
      "searchStops": {
        "data": []
      },
      "created_at": "2026-10-23T10:51:01.000Z"
    }
  ]
}
```

### 200 — no searches yet

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

### Response fields (each item)

| Field | Type | Meaning |
|---|---|---|
| `id` | number | Recent-search row id |
| `user_id` | number | Owner |
| `pick_lat`, `pick_lng`, `drop_lat`, `drop_lng` | number | Coordinates |
| `pick_address`, `drop_address` | string | Full address |
| `pick_short_address`, `drop_short_address` | string | Short name, may be `""` |
| `pickup_poc_name`, `pickup_poc_mobile`, `pickup_poc_instruction` | string | Parcel pickup contact — `""` in Phase 1 |
| `drop_poc_name`, `drop_poc_mobile`, `drop_poc_instruction` | string | Parcel drop contact — `""` in Phase 1 |
| `total_distance` | number | km |
| `total_time` | number | minutes |
| `poly_line` | string | Route, may be `""` |
| `transport_type` | string | `taxi` \| `delivery` |
| `module_key` | string | Module it was searched for, may be `""` |
| `searchStops.data` | array | Mid stops in order, `[]` if none |
| `searchStops.data[].order` | number | 1-based |
| `searchStops.data[].latitude`, `.longitude` | number | Stop coordinates |
| `searchStops.data[].address`, `.short_address` | string | Stop address |
| `created_at` | string (ISO) | **Last time this route was searched** — a repeat search moves it to the top |

### Rules

- Newest first.
- The same route again (pickup **and** drop each within **50 m** of a saved search) does **not** add a row — it updates that row and moves it to the top.
- Max **20** searches per user; saving the 21st removes the oldest.
- Each user sees only their own searches.

### Errors

**401 — no token**

```json
{
  "success": false,
  "message": "unauthorized",
  "data": {}
}
```

Other: `401 invalid_or_expired_token`, `401 session_revoked`, `403 user_blocked`.

**422 — limit out of range**

```json
{
  "success": false,
  "message": "validation_error",
  "data": {
    "errors": {
      "limit": "limit must be a whole number between 1 and 20"
    }
  }
}
```

---

## HOME-05 — Save recent search

`POST /request/save-recent-search` · Bearer · JSON

### Request

```json
{
  "pick_lat": 22.6867,
  "pick_lng": 75.8715,
  "pick_address": "301, Atulya IT Park, Indore",
  "pick_short_address": "Atulya IT Park",
  "drop_lat": 22.7171,
  "drop_lng": 75.8683,
  "drop_address": "Bhawarkuan Square, Indore",
  "drop_short_address": "Bhawarkuan Square",
  "total_distance": 4.2,
  "total_time": 12,
  "poly_line": "",
  "transport_type": "taxi",
  "module_key": "one_way",
  "stops": []
}
```

With a mid stop:

```json
{
  "pick_lat": 22.6867,
  "pick_lng": 75.8715,
  "pick_address": "301, Atulya IT Park, Indore",
  "pick_short_address": "Atulya IT Park",
  "drop_lat": 22.7533,
  "drop_lng": 75.8937,
  "drop_address": "Airport Road, Indore",
  "drop_short_address": "Airport Road",
  "total_distance": 9.1,
  "total_time": 26,
  "transport_type": "taxi",
  "module_key": "one_way",
  "stops": [
    {
      "lat": 22.7244,
      "lng": 75.8839,
      "address": "Palasia Square, Indore",
      "short_address": "Palasia",
      "order": 1
    }
  ]
}
```

| Field | Type | Rule |
|---|---|---|
| `pick_lat`, `drop_lat` | number | Required, −90 to 90 (numeric strings accepted) |
| `pick_lng`, `drop_lng` | number | Required, −180 to 180 |
| `pick_address`, `drop_address` | string | Required, 1–255 |
| `pick_short_address`, `drop_short_address` | string | Optional, max 120 |
| `total_distance` | number | Optional, km, 0–3000 |
| `total_time` | number | Optional, minutes, 0–4320 |
| `poly_line` | string | Optional |
| `transport_type` | string | Optional, `taxi` (default) \| `delivery` |
| `module_key` | string | Optional; must be a HOME-01 module key |
| `stops` | array | Optional, max 3. Each: `lat`, `lng`, `address` (1–255), `order` (1–3, unique), optional `short_address` |
| `pickup_poc_*`, `drop_poc_*` | string | Optional (parcel contacts), stored as sent |

### 200 — saved

```json
{
  "success": true,
  "message": "recent_saved",
  "data": {
    "id": 32
  }
}
```

### 200 — the same route again (within 50 m): same row, moved to the top

```json
{
  "success": true,
  "message": "recent_saved",
  "data": {
    "id": 32
  }
}
```

(Same `id` 32 as before — no duplicate row.)

### Errors

**422 — pickup and drop are the same place (within 50 m)**

```json
{
  "success": false,
  "message": "same_pick_drop",
  "data": {
    "errors": {
      "drop_lat": "pickup and drop are the same place"
    }
  }
}
```

**422 — field error**

```json
{
  "success": false,
  "message": "validation_error",
  "data": {
    "errors": {
      "drop_address": "drop_address is required"
    }
  }
}
```

```json
{
  "success": false,
  "message": "validation_error",
  "data": {
    "errors": {
      "stops.0.address": "address is required (max 255 characters)"
    }
  }
}
```

**401** — same as HOME-04.

---

## HOME-06 — Add favourite location

`POST /user/add-favourite-location` · Bearer · JSON

A favourite is a **single point** (not a route), so only `pick_*` is used.

### Request

```json
{
  "pick_lat": 22.7196,
  "pick_lng": 75.8577,
  "pick_address": "Rajwada, Indore, Madhya Pradesh",
  "address_name": "Home",
  "landmark": "Near gate 2"
}
```

| Field | Type | Rule |
|---|---|---|
| `pick_lat` | number | Required, −90 to 90 |
| `pick_lng` | number | Required, −180 to 180 |
| `pick_address` | string | Required, 1–255 |
| `address_name` | string | Required, 1–40 (`Home`, `Work` or any name) |
| `landmark` | string | Optional, max 120, default `""` |

### 200 — added

```json
{
  "success": true,
  "message": "favourite_added",
  "data": {
    "id": "f_33",
    "pick_lat": "22.7196",
    "pick_lng": "75.8577",
    "drop_lat": "",
    "drop_lng": "",
    "pick_address": "Rajwada, Indore, Madhya Pradesh",
    "drop_address": "",
    "address_name": "Home",
    "landmark": "Near gate 2"
  }
}
```

### 200 — same name again (any case) updates that favourite

Request with `"address_name": "Home"`, `"pick_address": "Vijay Nagar, Indore"`, `"landmark": "Opposite C21 Mall"`:

```json
{
  "success": true,
  "message": "favourite_added",
  "data": {
    "id": "f_33",
    "pick_lat": "22.7533",
    "pick_lng": "75.8937",
    "drop_lat": "",
    "drop_lng": "",
    "pick_address": "Vijay Nagar, Indore",
    "drop_address": "",
    "address_name": "Home",
    "landmark": "Opposite C21 Mall"
  }
}
```

Same `id` f_33 — there is only ever **one Home and one Work** (names are matched case-insensitively), so `duplicate_address_name` never happens.

### Response fields

| Field | Type | Meaning |
|---|---|---|
| `id` | string | `f_<number>` — send this to delete |
| `pick_lat`, `pick_lng` | string | Coordinates as strings |
| `drop_lat`, `drop_lng`, `drop_address` | string | Always `""` (favourites are single points) |
| `pick_address` | string | Address |
| `address_name` | string | Home / Work / custom name |
| `landmark` | string | May be `""` |

### Errors

**422 — 15 favourites already saved (a new name was sent)**

```json
{
  "success": false,
  "message": "favourite_limit_reached",
  "data": {
    "limit": 15
  }
}
```

Updating an existing name still works at the limit.

**422 — field error**

```json
{
  "success": false,
  "message": "validation_error",
  "data": {
    "errors": {
      "address_name": "address_name is required (max 40 characters)"
    }
  }
}
```

---

## HOME-07 — Delete favourite location

`DELETE /user/favourite-location/:id` · Bearer

Also accepted (older builds): `POST /user/delete-favourite-location` with body `{ "id": "f_91" }`. The id may be `"f_91"` or `"91"`.

### 200

`DELETE /user/favourite-location/f_35`

```json
{
  "success": true,
  "message": "favourite_deleted",
  "data": {
    "id": "f_35"
  }
}
```

`POST /user/delete-favourite-location` with `{ "id": "f_34" }`:

```json
{
  "success": true,
  "message": "favourite_deleted",
  "data": {
    "id": "f_34"
  }
}
```

### Errors

**404 — not found (or already deleted)**

```json
{
  "success": false,
  "message": "favourite_not_found",
  "data": {}
}
```

**403 — the favourite belongs to another user**

```json
{
  "success": false,
  "message": "forbidden",
  "data": {}
}
```

---

## GET /user — favourites nested

`GET /user` · Bearer. Same response as before plus `favouriteLocations.data` (Home first, then Work, then the rest in the order they were added). After HOME-06 / HOME-07, refresh `GET /user`.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "u_22",
    "name": "Ankit",
    "mobile": "9000000998",
    "country_code": "91",
    "profile_picture": "",
    "gender": "male",
    "map_type": "",
    "wallet_balance": 0,
    "emergency_contact_name": "",
    "emergency_contact_number": "",
    "locale": "en",
    "favouriteLocations": {
      "data": [
        {
          "id": "f_33",
          "pick_lat": "22.7533",
          "pick_lng": "75.8937",
          "drop_lat": "",
          "drop_lng": "",
          "pick_address": "Vijay Nagar, Indore",
          "drop_address": "",
          "address_name": "Home",
          "landmark": "Opposite C21 Mall"
        },
        {
          "id": "f_34",
          "pick_lat": "22.6867",
          "pick_lng": "75.8715",
          "drop_lat": "",
          "drop_lng": "",
          "pick_address": "301, Atulya IT Park, Indore",
          "drop_address": "",
          "address_name": "Work",
          "landmark": ""
        },
        {
          "id": "f_35",
          "pick_lat": "22.7244",
          "pick_lng": "75.8839",
          "drop_lat": "",
          "drop_lng": "",
          "pick_address": "Palasia Square, Indore",
          "drop_address": "",
          "address_name": "Gym",
          "landmark": ""
        }
      ]
    }
  }
}
```

`favouriteLocations.data` is `[]` when the user has none. `id` stays `"u_<number>"` as in the auth APIs.

`GET /user` also returns the ride fields `has_ongoing_ride`, `has_upcoming_ride` and `onTripRequest`, plus `current_ride` with `?current_ride=req_…`. See [booking-api.md](booking-api.md#get-user--ride-state-on-the-home-screen).

---

## Banners — home screen

`GET /common/banners` · Token optional (a token that is sent must be valid)

| Query | Type | Rule |
|---|---|---|
| `type` | string | `user` (default) for the rider app, `driver` for the driver app |
| `limit` | number | 1–20, default 10 |

A banner is only an image. Every banner of the requested type is returned, in the admin's order (left to right). Banners are managed in admin → **Banners**; image size **1200 × 600** (2:1).

> **Changed (Oct 2026):** banners no longer have `title`, `subtitle`, `module_key`, `link_type`, `link_value`, `starts_at` or `ends_at`, and the `module_key` query is ignored. A new `type` field was added. See *Changes for the app* below.

### 200 — user app (`GET /common/banners`)

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "b_1",
      "image": "https://outdrivebackend.cyberimpulses.com/uploads/banners/0fd399ba-7e3b-4068-8d46-70be704c6944.webp",
      "image_url": "https://outdrivebackend.cyberimpulses.com/uploads/banners/0fd399ba-7e3b-4068-8d46-70be704c6944.webp",
      "type": "user",
      "order_by": 1,
      "active": true
    },
    {
      "id": "b_2",
      "image": "https://outdrivebackend.cyberimpulses.com/uploads/banners/3cf18988-d6a4-45d2-868c-5573b98e9f7e.webp",
      "image_url": "https://outdrivebackend.cyberimpulses.com/uploads/banners/3cf18988-d6a4-45d2-868c-5573b98e9f7e.webp",
      "type": "user",
      "order_by": 2,
      "active": true
    },
    {
      "id": "b_3",
      "image": "https://outdrivebackend.cyberimpulses.com/uploads/banners/9ab5709e-df06-4fa7-9cc9-ff0220cb2028.webp",
      "image_url": "https://outdrivebackend.cyberimpulses.com/uploads/banners/9ab5709e-df06-4fa7-9cc9-ff0220cb2028.webp",
      "type": "user",
      "order_by": 3,
      "active": true
    }
  ]
}
```

### 200 — driver app, none added yet (`GET /common/banners?type=driver`)

```json
{ "success": true, "message": "OK", "data": [] }
```

### Response fields

| Field | Type | Meaning |
|---|---|---|
| `id` | string | `"b_<number>"` |
| `image`, `image_url` | string | The same full image URL (two keys for older app code) |
| `type` | string | `user` or `driver` |
| `order_by` | number | Display order, ascending; the list is already sorted |
| `active` | boolean | Always `true` |

### Changes for the app (give this to the Flutter developer)

| Before | Now |
|---|---|
| `title`, `subtitle` | **Removed**: the banner image carries its own text |
| `module_key`, `link_type`, `link_value` | **Removed**: tapping a banner does nothing; there is no link |
| `starts_at`, `ends_at` | **Removed**: every banner in the list is live |
| `?module_key=` query | **Ignored**: the same list is returned |
| — | **New** `type` field and `?type=user\|driver` query (default `user`) |
| `id`, `image`, `image_url`, `order_by`, `active` | Unchanged |

### Errors

```json
{ "success": false, "message": "validation_error", "data": { "errors": { "type": "type must be user or driver" } } }
```

```json
{ "success": false, "message": "validation_error", "data": { "errors": { "limit": "limit must be a whole number between 1 and 20" } } }
```

```json
{ "success": false, "message": "invalid_or_expired_token", "data": {} }
```
