# Rider app — Home · Zone · ETA APIs

**Audience:** Flutter customer app
**Base URL:** `https://outdrivebackend.cyberimpulses.com/api/v1` (local: `http://localhost:3113/api/v1`)
**Swagger:** `/api-docs` → sections **Common** and **Ride request**

Every example below is a **real response** captured from the API with the seed data (Indore City zone, seed vehicles and fares). Image URLs use the server's `APP_URL`.

## Basics

| | |
|---|---|
| Envelope | `{ "success": true, "message": "machine_readable", "data": ... }` |
| Errors | `{ "success": false, "message": "error_key", "data": { ... } }` — `data.errors.<field>` for field errors |
| Auth | `Authorization: Bearer <access_token>` (from `/auth/login` or `/auth/register`) |
| Keys | `snake_case` · JSON bodies |
| Money | INR, rupees (numbers). `total` is rounded to whole rupees |
| Distance | Request: **meters**. Response: `distance` in km (string), `distance_in_meters` (string) |

## Flow

```
HOME-01  GET  /common/ride_modules          module cards on the home screen
   ▼  user picks a module_key and a pickup
ZONE-01  POST /common/service-availability  is the pickup serviceable for this module?
   ▼  yes → user picks the drop
ETA-01   POST /request/eta                  vehicles + backend-calculated fares
   ▼  user picks one vehicle (keep zone_type_id, type_id, total + the ETA request fields)
BOOK-01  POST /request/create               next phase

ETA-02   GET  /common/cancel-policy         show before booking
```

Everything is controlled from the admin panel (Services, Zones, Vehicles, Fare settings). **Do not hard-code modules or vehicles** — show what the API returns.

---

## HOME-01 — Ride modules

`GET /common/ride_modules` · Public (no token)

### 200 — full response

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "m_one_way",
      "name": "One Way",
      "short_description": "City ride",
      "description": "Point to point city ride",
      "transport_type": "taxi",
      "service_type": "normal",
      "module_key": "one_way",
      "section": "rides",
      "menu_icon": "https://outdrivebackend.cyberimpulses.com/uploads/services/c05cd1fe-1a03-4655-87dd-bd71d9b06b8b.png",
      "icon_types_for": "taxi",
      "order_by": 1,
      "is_active": true,
      "coming_soon": false
    },
    {
      "id": "m_shared",
      "name": "Shared Ride",
      "short_description": "Share seats",
      "description": "Share seats, lower fare",
      "transport_type": "taxi",
      "service_type": "shared_ride",
      "module_key": "shared",
      "section": "rides",
      "menu_icon": "https://outdrivebackend.cyberimpulses.com/uploads/services/e1fed6af-598e-46b7-b1b1-28f44f80c6c3.png",
      "icon_types_for": "taxi",
      "order_by": 2,
      "is_active": true,
      "coming_soon": false
    },
    {
      "id": "m_outstation",
      "name": "Outstation",
      "short_description": "Intercity",
      "description": "City to city one way",
      "transport_type": "taxi",
      "service_type": "outstation",
      "module_key": "outstation",
      "section": "rides",
      "menu_icon": "https://outdrivebackend.cyberimpulses.com/uploads/services/2c3b76d1-4678-497c-a74c-317e67fdc295.png",
      "icon_types_for": "outstation",
      "order_by": 3,
      "is_active": true,
      "coming_soon": false
    },
    {
      "id": "m_round_trip",
      "name": "Round Trip",
      "short_description": "Go & return",
      "description": "Outstation go and return",
      "transport_type": "taxi",
      "service_type": "outstation",
      "module_key": "round_trip",
      "section": "rides",
      "menu_icon": "https://outdrivebackend.cyberimpulses.com/uploads/services/dae31fa1-0189-48e1-8840-f1ac0913a4c6.png",
      "icon_types_for": "outstation",
      "order_by": 4,
      "is_active": true,
      "coming_soon": false
    },
    {
      "id": "m_scheduled",
      "name": "Scheduled",
      "short_description": "Book for later",
      "description": "Schedule city ride",
      "transport_type": "taxi",
      "service_type": "normal",
      "module_key": "scheduled",
      "section": "rides",
      "menu_icon": "https://outdrivebackend.cyberimpulses.com/uploads/services/a33264ae-fde6-4b28-91c6-8da41b243133.png",
      "icon_types_for": "taxi",
      "order_by": 5,
      "is_active": true,
      "coming_soon": true
    },
    {
      "id": "m_parcel_bike",
      "name": "Parcel on Bike",
      "short_description": "Light parcels",
      "description": "Send parcel on bike",
      "transport_type": "delivery",
      "service_type": "normal",
      "module_key": "parcel_bike",
      "section": "parcel",
      "menu_icon": "https://outdrivebackend.cyberimpulses.com/uploads/services/0c9f20e9-55cd-4295-9a5f-db38307c9791.png",
      "icon_types_for": "delivery",
      "order_by": 10,
      "is_active": true,
      "coming_soon": false
    },
    {
      "id": "m_parcel_3wheeler",
      "name": "Parcel on 3 Wheeler",
      "short_description": "Bigger parcels",
      "description": "Send parcel on 3 wheeler / auto",
      "transport_type": "delivery",
      "service_type": "normal",
      "module_key": "parcel_3wheeler",
      "section": "parcel",
      "menu_icon": "https://outdrivebackend.cyberimpulses.com/uploads/services/31c37f65-3bba-4699-92f5-0d53eac55427.png",
      "icon_types_for": "delivery",
      "order_by": 11,
      "is_active": true,
      "coming_soon": true
    }
  ]
}
```

Here `scheduled` and `parcel_3wheeler` are set to *Coming soon* in the admin panel, so they come with `coming_soon: true`.

### Response fields (each item in `data`)

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Opaque id (`m_<module_key>`). Use `module_key` in the app instead |
| `name` | string | Card title |
| `short_description` | string | One line under the title (may be `""`) |
| `description` | string | Longer text (may be `""`) |
| `transport_type` | string | `taxi` \| `delivery` |
| `service_type` | string | `normal` \| `shared_ride` \| `outstation` |
| `module_key` | string | `one_way`, `shared`, `outstation`, `round_trip`, `scheduled`, `parcel_bike`, `parcel_3wheeler` |
| `section` | string | `rides` \| `parcel` — which group the card belongs to |
| `menu_icon` | string | Full image URL, or `""` if no image |
| `icon_types_for` | string | `taxi` \| `outstation` \| `delivery` |
| `order_by` | number | Display order (the array is already sorted) |
| `is_active` | boolean | Always `true` here — inactive modules are not returned at all |
| `coming_soon` | boolean | `true` → show the card but do not allow booking |

---

## ZONE-01 — Service availability

`POST /common/service-availability` · Token optional (if a token is sent it must be valid)

### Request

```json
{ "pick_lat": 22.7196, "pick_lng": 75.8577, "module_key": "one_way" }
```

| Field | Type | Rule |
|---|---|---|
| `pick_lat` | number | Required, −90 to 90 (a numeric string is accepted) |
| `pick_lng` | number | Required, −180 to 180 |
| `module_key` | string | Required, one of the HOME-01 keys |
| `drop_lat`, `drop_lng` | number | Optional; accepted but not checked yet |

### 200 — available

```json
{
  "success": true,
  "message": "service_available",
  "data": {
    "is_serviceable": true,
    "zone_id": "z_1",
    "zone_name": "Indore City",
    "currency": "INR",
    "currency_symbol": "₹",
    "distance_unit": "km"
  }
}
```

### 200 — outside every zone (or the module is switched off in that zone)

```json
{
  "success": true,
  "message": "out_of_service_area",
  "data": {
    "is_serviceable": false,
    "zone_id": "",
    "zone_name": "",
    "currency": "INR",
    "currency_symbol": "₹",
    "distance_unit": "km"
  }
}
```

### 200 — module is Coming soon / inactive

```json
{
  "success": true,
  "message": "module_not_available",
  "data": {
    "is_serviceable": false,
    "zone_id": "",
    "zone_name": "",
    "currency": "INR",
    "currency_symbol": "₹",
    "distance_unit": "km"
  }
}
```

When `is_serviceable` is `false`, `zone_id` and `zone_name` are `""` — do not call ETA.

### 422 — invalid input

```json
{
  "success": false,
  "message": "validation_error",
  "data": {
    "errors": {
      "pick_lat": "pick_lat must be a number between -90 and 90"
    }
  }
}
```

### 401 — token sent but invalid or expired

```json
{
  "success": false,
  "message": "invalid_or_expired_token",
  "data": {}
}
```

### Response fields

| Field | Type | Meaning |
|---|---|---|
| `is_serviceable` | boolean | `true` only when the pickup is in an active zone and the module is on there |
| `zone_id` | string | e.g. `z_1`, or `""` |
| `zone_name` | string | e.g. `Indore City`, or `""` |
| `currency` | string | Always `INR` |
| `currency_symbol` | string | Always `₹` |
| `distance_unit` | string | Always `km` |

| message | Meaning |
|---|---|
| `service_available` | Go ahead |
| `out_of_service_area` | Pickup outside every active zone, or the module is switched off in the zone |
| `module_not_available` | Module is Coming soon or inactive |

---

## ETA-01 — Vehicles + fare

`POST /request/eta` · **Bearer required** · JSON

### Request

```json
{
  "module_key": "one_way",
  "transport_type": "taxi",
  "service_type": "normal",
  "pick_lat": 22.7196,
  "pick_lng": 75.8577,
  "drop_lat": 22.7533,
  "drop_lng": 75.8937,
  "pick_address": "Rajwada, Indore",
  "drop_address": "Airport Road, Indore",
  "distance": "8500",
  "duration": "22",
  "polyline": "",
  "is_out_station": 0,
  "is_round_trip": 0,
  "schedule_datetime": "",
  "shared_ride": 0,
  "seats_taken": 1,
  "promo_code": ""
}
```

| Field | Type | Rule |
|---|---|---|
| `module_key` | string | Required |
| `transport_type` | string | Optional; if sent it must match the module (`taxi` / `delivery`) |
| `service_type` | string | Optional; if sent it must match the module |
| `pick_lat`, `pick_lng`, `drop_lat`, `drop_lng` | number | Required |
| `pick_address`, `drop_address` | string | Required, max 255 |
| `distance` | string/number | Required, **meters**, 0–3,000,000. If it is shorter than the straight line between pickup and drop, the straight-line distance is used |
| `duration` | string/number | Required, **minutes**, 0–4320 |
| `polyline` | string | Optional |
| `is_out_station`, `is_round_trip`, `shared_ride` | 0/1 | Optional. Pricing follows the module itself: `round_trip` doubles distance and time, `shared` multiplies by seats |
| `schedule_datetime` | string | **Required for `scheduled`**: 30 minutes to 7 days ahead. `"2026-10-23 10:30:00"` without an offset is Indian time. Ignored for other modules |
| `seats_taken` | number | 1–20, default 1. Used by `shared`; vehicles with fewer seats are left out |
| `promo_code` | string | Optional coupon code; `""` = none. The server applies it per vehicle. See [onboarding-promo-api.md](onboarding-promo-api.md) |

### 200 — One Way (all 6 vehicles, full objects)

```json
{
  "success": true,
  "message": "OK",
  "enabled_dispatch_type": {
    "ondemand": true,
    "bidding": false,
    "shared": false
  },
  "data": [
    {
      "zone_type_id": "zt_1",
      "type_id": "vt_1",
      "name": "Bike",
      "description": "Affordable bike ride",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/7a20cc24-24e4-4b4d-a12e-28ba11794709.png",
      "capacity": 1,
      "payment_type": "cash,wallet",
      "distance": "8.5",
      "distance_in_meters": "8500",
      "time": 22,
      "total": 49,
      "min_amount": 49,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": true,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": false,
      "seats_taken": 1,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 25,
      "price_per_distance": 8,
      "price_per_time": 1,
      "distance_price": 20,
      "time_price": 4,
      "tax_amount": 0,
      "tax": "0",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 5,
      "waiting_charge": 2,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    },
    {
      "zone_type_id": "zt_2",
      "type_id": "vt_2",
      "name": "Auto",
      "description": "3 wheeler auto",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/4f96e58a-a67c-4f82-adb8-d1170bcd811a.png",
      "capacity": 3,
      "payment_type": "cash,wallet",
      "distance": "8.5",
      "distance_in_meters": "8500",
      "time": 22,
      "total": 113,
      "min_amount": 113,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": false,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": false,
      "seats_taken": 1,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 40,
      "price_per_distance": 12,
      "price_per_time": 1,
      "distance_price": 66,
      "time_price": 7,
      "tax_amount": 0,
      "tax": "0",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 5,
      "waiting_charge": 2,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    },
    {
      "zone_type_id": "zt_3",
      "type_id": "vt_3",
      "name": "Hatchback",
      "description": "Compact car",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/4d19fb70-e257-4958-bb01-61a29055b017.webp",
      "capacity": 4,
      "payment_type": "cash,wallet",
      "distance": "8.5",
      "distance_in_meters": "8500",
      "time": 22,
      "total": 143,
      "min_amount": 143,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": false,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": false,
      "seats_taken": 1,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 60,
      "price_per_distance": 13,
      "price_per_time": 1.5,
      "distance_price": 58.5,
      "time_price": 18,
      "tax_amount": 6.83,
      "tax": "5",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 5,
      "waiting_charge": 2,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    },
    {
      "zone_type_id": "zt_4",
      "type_id": "vt_4",
      "name": "Sedan",
      "description": "Comfortable sedan",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/0fa5c49a-ee8e-425c-b7c9-40e8dab737b1.webp",
      "capacity": 4,
      "payment_type": "cash,wallet",
      "distance": "8.5",
      "distance_in_meters": "8500",
      "time": 22,
      "total": 148,
      "min_amount": 148,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": false,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": false,
      "seats_taken": 1,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 60,
      "price_per_distance": 14,
      "price_per_time": 1.5,
      "distance_price": 63,
      "time_price": 18,
      "tax_amount": 7.05,
      "tax": "5",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 5,
      "waiting_charge": 2,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    },
    {
      "zone_type_id": "zt_5",
      "type_id": "vt_5",
      "name": "SUV",
      "description": "Spacious SUV",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/0176931b-191d-4c59-be8d-308bc5c6accb.webp",
      "capacity": 6,
      "payment_type": "cash,wallet",
      "distance": "8.5",
      "distance_in_meters": "8500",
      "time": 22,
      "total": 205,
      "min_amount": 205,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": false,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": false,
      "seats_taken": 1,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 90,
      "price_per_distance": 18,
      "price_per_time": 2,
      "distance_price": 81,
      "time_price": 24,
      "tax_amount": 9.75,
      "tax": "5",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 5,
      "waiting_charge": 3,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    },
    {
      "zone_type_id": "zt_6",
      "type_id": "vt_6",
      "name": "Premium",
      "description": "Premium / luxury car",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/f6641eff-2839-49e2-951c-2c6bbb8f267f.webp",
      "capacity": 4,
      "payment_type": "cash,wallet",
      "distance": "8.5",
      "distance_in_meters": "8500",
      "time": 22,
      "total": 313,
      "min_amount": 313,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": false,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": false,
      "seats_taken": 1,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 150,
      "price_per_distance": 25,
      "price_per_time": 3,
      "distance_price": 112.5,
      "time_price": 36,
      "tax_amount": 14.93,
      "tax": "5",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 5,
      "waiting_charge": 4,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    }
  ]
}
```

### Response fields

Top level:

| Field | Type | Meaning |
|---|---|---|
| `enabled_dispatch_type.ondemand` | boolean | Always `true` |
| `enabled_dispatch_type.bidding` | boolean | Always `false` (no bidding in Phase 1) |
| `enabled_dispatch_type.shared` | boolean | `true` only for the `shared` module |
| `data` | array | Vehicles in display order; `[]` with message `no_vehicles_available` |

Each vehicle in `data`:

| Field | Type | Meaning |
|---|---|---|
| `zone_type_id` | string | The fare row, e.g. `zt_1`. **Send this to booking** |
| `type_id` | string | The vehicle type, e.g. `vt_1` |
| `name`, `description` | string | Vehicle name and one line about it |
| `vehicle_icon` | string | Full image URL, or `""` |
| `capacity` | number | People (seats for shared vehicles) |
| `payment_type` | string | Comma list, e.g. `cash,wallet` (`online` only once a payment gateway is live) |
| `distance` | string | Km used for the fare (doubled for round trip) |
| `distance_in_meters` | string | Same distance in meters |
| `time` | number | Minutes used for the fare (doubled for round trip) |
| `total` | number | **Final estimate** in whole rupees (tax included) |
| `min_amount` | number | Same as `total` (no price range in Phase 1) |
| `currency`, `unit_in_words` | string | `INR`, `KM` |
| `is_default` | boolean | Exactly one vehicle is `true` — pre-select it |
| `dispatch_type` | string | Always `normal` |
| `enable_bidding` | boolean | Always `false` |
| `enable_shared_ride` | boolean | `true` for shared vehicles |
| `seats_taken` | number | Seats priced (1 unless shared) |
| `has_discount`, `discount_total` | boolean, number | `false`, `0` until coupons exist |
| `base_price` | number | Fixed start charge (per seat for shared) |
| `price_per_distance` | number | ₹ per km after the included km |
| `price_per_time` | number | ₹ per minute after the included minutes |
| `distance_price` | number | Charged distance part |
| `time_price` | number | Charged time part |
| `tax` | string | Tax percent, e.g. `"5"` |
| `tax_amount` | number | Tax in rupees |
| `airport_surge_fee` | number | `0` for now |
| `min_fare_applied` | boolean | `true` when the minimum fare was charged instead of the calculation |
| `free_waiting_time_in_mins_before_trip_start` | number | Free waiting at pickup |
| `waiting_charge` | number | ₹ per minute after free waiting |
| `promocode_id` | string | `promo_<id>` when a coupon was applied to this vehicle, else `""`. The fields `subtotal`, `promo_discount`, `promo_code`, `promo_applied` and `promo_message` are explained in [onboarding-promo-api.md](onboarding-promo-api.md) |
| `user_wallet_balance` | number | The user's wallet balance |
| `preference` | array | `[]` |

### Fare formula

```
distance_price = max(0, km − included_km) × price_per_distance
time_price     = max(0, minutes − included_minutes) × price_per_time
subtotal       = (base_price + distance_price + time_price) × seats      (seats only for shared)
tax_amount     = subtotal × tax / 100
total          = round( max(subtotal + tax_amount + airport_surge_fee, minimum_fare × seats) )
```

The One Way response above, 8.5 km / 22 min:

| Vehicle | zone_type_id | Distance · time | Base | Distance price | Time price | Tax | Total |
|---|---|---|---|---|---|---|---|
| Bike | `zt_1` | 8.5 km · 22 min | ₹25 | ₹20 | ₹4 | 0% = ₹0 | **₹49** |
| Auto | `zt_2` | 8.5 km · 22 min | ₹40 | ₹66 | ₹7 | 0% = ₹0 | **₹113** |
| Hatchback | `zt_3` | 8.5 km · 22 min | ₹60 | ₹58.5 | ₹18 | 5% = ₹6.83 | **₹143** |
| Sedan | `zt_4` | 8.5 km · 22 min | ₹60 | ₹63 | ₹18 | 5% = ₹7.05 | **₹148** |
| SUV | `zt_5` | 8.5 km · 22 min | ₹90 | ₹81 | ₹24 | 5% = ₹9.75 | **₹205** |
| Premium | `zt_6` | 8.5 km · 22 min | ₹150 | ₹112.5 | ₹36 | 5% = ₹14.93 | **₹313** |

(Bike: ₹25 includes 6 km and 18 min → (8.5 − 6) × 8 = 20, (22 − 18) × 1 = 4 → **₹49**.)

### 200 — Shared Ride, 2 seats

```json
{
  "success": true,
  "message": "OK",
  "enabled_dispatch_type": {
    "ondemand": true,
    "bidding": false,
    "shared": true
  },
  "data": [
    {
      "zone_type_id": "zt_7",
      "type_id": "vt_7",
      "name": "Shared Car",
      "description": "Pay per seat",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/988f9923-1b1b-4638-9e12-f47930a9b4a0.webp",
      "capacity": 4,
      "payment_type": "cash,wallet",
      "distance": "8.5",
      "distance_in_meters": "8500",
      "time": 22,
      "total": 137,
      "min_amount": 137,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": true,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": true,
      "seats_taken": 2,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 30,
      "price_per_distance": 7,
      "price_per_time": 0.5,
      "distance_price": 31.5,
      "time_price": 3.5,
      "tax_amount": 6.5,
      "tax": "5",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 3,
      "waiting_charge": 1,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    }
  ]
}
```

`total` is for both seats: (30 + 31.5 + 3.5) × 2 = 130, + 5% tax 6.5 = **₹137**.

### 200 — Outstation (Indore → Bhopal, 195 km / 210 min)

Request differences: `"module_key": "outstation"`, `"service_type": "outstation"`, `"drop_address": "MP Nagar, Bhopal"`, `"distance": "195000"`, `"duration": "210"`, `"is_out_station": 1`.

```json
{
  "success": true,
  "message": "OK",
  "enabled_dispatch_type": {
    "ondemand": true,
    "bidding": false,
    "shared": false
  },
  "data": [
    {
      "zone_type_id": "zt_8",
      "type_id": "vt_4",
      "name": "Sedan",
      "description": "Comfortable sedan",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/0fa5c49a-ee8e-425c-b7c9-40e8dab737b1.webp",
      "capacity": 4,
      "payment_type": "cash,wallet",
      "distance": "195",
      "distance_in_meters": "195000",
      "time": 210,
      "total": 2520,
      "min_amount": 2520,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": true,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": false,
      "seats_taken": 1,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 300,
      "price_per_distance": 12,
      "price_per_time": 0,
      "distance_price": 2100,
      "time_price": 0,
      "tax_amount": 120,
      "tax": "5",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 15,
      "waiting_charge": 2,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    },
    {
      "zone_type_id": "zt_9",
      "type_id": "vt_5",
      "name": "SUV",
      "description": "Spacious SUV",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/0176931b-191d-4c59-be8d-308bc5c6accb.webp",
      "capacity": 6,
      "payment_type": "cash,wallet",
      "distance": "195",
      "distance_in_meters": "195000",
      "time": 210,
      "total": 3360,
      "min_amount": 3360,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": false,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": false,
      "seats_taken": 1,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 400,
      "price_per_distance": 16,
      "price_per_time": 0,
      "distance_price": 2800,
      "time_price": 0,
      "tax_amount": 160,
      "tax": "5",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 15,
      "waiting_charge": 3,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    },
    {
      "zone_type_id": "zt_10",
      "type_id": "vt_6",
      "name": "Premium",
      "description": "Premium / luxury car",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/f6641eff-2839-49e2-951c-2c6bbb8f267f.webp",
      "capacity": 4,
      "payment_type": "cash,wallet",
      "distance": "195",
      "distance_in_meters": "195000",
      "time": 210,
      "total": 4673,
      "min_amount": 4673,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": false,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": false,
      "seats_taken": 1,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 600,
      "price_per_distance": 22,
      "price_per_time": 0,
      "distance_price": 3850,
      "time_price": 0,
      "tax_amount": 222.5,
      "tax": "5",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 15,
      "waiting_charge": 4,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    }
  ]
}
```

| Vehicle | zone_type_id | Distance · time | Base | Distance price | Time price | Tax | Total |
|---|---|---|---|---|---|---|---|
| Sedan | `zt_8` | 195 km · 210 min | ₹300 | ₹2100 | ₹0 | 5% = ₹120 | **₹2520** |
| SUV | `zt_9` | 195 km · 210 min | ₹400 | ₹2800 | ₹0 | 5% = ₹160 | **₹3360** |
| Premium | `zt_10` | 195 km · 210 min | ₹600 | ₹3850 | ₹0 | 5% = ₹222.5 | **₹4673** |

### 200 — Round Trip (same route)

Same request with `"module_key": "round_trip"` and `"is_round_trip": 1`. Distance and time are doubled (390 km / 420 min):

| Vehicle | zone_type_id | Distance · time | Base | Distance price | Time price | Tax | Total |
|---|---|---|---|---|---|---|---|
| Sedan | `zt_8` | 390 km · 420 min | ₹300 | ₹4440 | ₹0 | 5% = ₹237 | **₹4977** |
| SUV | `zt_9` | 390 km · 420 min | ₹400 | ₹5920 | ₹0 | 5% = ₹316 | **₹6636** |
| Premium | `zt_10` | 390 km · 420 min | ₹600 | ₹8140 | ₹0 | 5% = ₹437 | **₹9177** |

### 200 — Parcel on Bike

Request differences: `"module_key": "parcel_bike"`, `"transport_type": "delivery"`. Parcel fares are separate from ride fares.

```json
{
  "success": true,
  "message": "OK",
  "enabled_dispatch_type": {
    "ondemand": true,
    "bidding": false,
    "shared": false
  },
  "data": [
    {
      "zone_type_id": "zt_11",
      "type_id": "vt_1",
      "name": "Bike",
      "description": "Affordable bike ride",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/7a20cc24-24e4-4b4d-a12e-28ba11794709.png",
      "capacity": 1,
      "payment_type": "cash,wallet",
      "distance": "8.5",
      "distance_in_meters": "8500",
      "time": 22,
      "total": 64,
      "min_amount": 64,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": true,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": false,
      "seats_taken": 1,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 30,
      "price_per_distance": 9,
      "price_per_time": 1,
      "distance_price": 31.5,
      "time_price": 2,
      "tax_amount": 0,
      "tax": "0",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 5,
      "waiting_charge": 2,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    }
  ]
}
```

### 200 — Parcel on 3 Wheeler

```json
{
  "success": true,
  "message": "OK",
  "enabled_dispatch_type": {
    "ondemand": true,
    "bidding": false,
    "shared": false
  },
  "data": [
    {
      "zone_type_id": "zt_12",
      "type_id": "vt_8",
      "name": "3 Wheeler",
      "description": "Cargo 3 wheeler for parcels",
      "vehicle_icon": "https://outdrivebackend.cyberimpulses.com/uploads/vehicles/59948a12-569e-4770-b655-d33a02437033.webp",
      "capacity": 1,
      "payment_type": "cash,wallet",
      "distance": "8.5",
      "distance_in_meters": "8500",
      "time": 22,
      "total": 163,
      "min_amount": 163,
      "currency": "INR",
      "unit_in_words": "KM",
      "is_default": true,
      "dispatch_type": "normal",
      "enable_bidding": false,
      "enable_shared_ride": false,
      "seats_taken": 1,
      "has_discount": false,
      "discount_total": 0,
      "base_price": 80,
      "price_per_distance": 16,
      "price_per_time": 1.5,
      "distance_price": 72,
      "time_price": 10.5,
      "tax_amount": 0,
      "tax": "0",
      "airport_surge_fee": 0,
      "min_fare_applied": false,
      "free_waiting_time_in_mins_before_trip_start": 10,
      "waiting_charge": 2,
      "promocode_id": "",
      "user_wallet_balance": 0,
      "preference": []
    }
  ]
}
```

### 200 — Scheduled

Request differences: `"module_key": "scheduled"`, `"schedule_datetime": "2026-10-23 18:30:00"` (30 min – 7 days ahead). Vehicles and fares are the same as One Way (city fares):

| Vehicle | zone_type_id | Distance · time | Base | Distance price | Time price | Tax | Total |
|---|---|---|---|---|---|---|---|
| Bike | `zt_1` | 8.5 km · 22 min | ₹25 | ₹20 | ₹4 | 0% = ₹0 | **₹49** |
| Auto | `zt_2` | 8.5 km · 22 min | ₹40 | ₹66 | ₹7 | 0% = ₹0 | **₹113** |
| Hatchback | `zt_3` | 8.5 km · 22 min | ₹60 | ₹58.5 | ₹18 | 5% = ₹6.83 | **₹143** |
| Sedan | `zt_4` | 8.5 km · 22 min | ₹60 | ₹63 | ₹18 | 5% = ₹7.05 | **₹148** |
| SUV | `zt_5` | 8.5 km · 22 min | ₹90 | ₹81 | ₹24 | 5% = ₹9.75 | **₹205** |
| Premium | `zt_6` | 8.5 km · 22 min | ₹150 | ₹112.5 | ₹36 | 5% = ₹14.93 | **₹313** |

### 200 — no vehicle available

Returned when nothing is set up for this module, zone or seat count (here: 5 seats in a 4-seat shared car):

```json
{
  "success": true,
  "message": "no_vehicles_available",
  "enabled_dispatch_type": {
    "ondemand": true,
    "bidding": false,
    "shared": true
  },
  "data": []
}
```

### Errors

**401 — no token / invalid token**

```json
{
  "success": false,
  "message": "unauthorized",
  "data": {}
}
```

Other 401 messages: `invalid_or_expired_token`, `session_revoked`; `403 user_blocked` for an inactive account.

**422 — pickup not serviceable**

```json
{
  "success": false,
  "message": "out_of_service_area",
  "data": {
    "is_serviceable": false
  }
}
```

**422 — module Coming soon / inactive**

```json
{
  "success": false,
  "message": "module_not_available",
  "data": {
    "module_key": "scheduled",
    "status": "coming_soon"
  }
}
```

**422 — promo code errors**

`invalid_promo_code`, `promo_expired`, `promo_usage_limit` and `promo_min_fare_not_met`, with real examples, are in [onboarding-promo-api.md](onboarding-promo-api.md).

**422 — field error** (the first invalid field is reported)

```json
{
  "success": false,
  "message": "validation_error",
  "data": {
    "errors": {
      "pick_address": "pick_address is required"
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
      "transport_type": "transport_type for one_way is taxi"
    }
  }
}
```

**422 — scheduled time not allowed**

```json
{
  "success": false,
  "message": "validation_error",
  "data": {
    "errors": {
      "schedule_datetime": "schedule a ride at least 30 minutes from now"
    }
  }
}
```

| Status | message | When |
|---|---|---|
| 200 | `OK` | Vehicles found |
| 200 | `no_vehicles_available` | `data: []` |
| 401 | `unauthorized`, `invalid_or_expired_token`, `session_revoked` | Token missing or invalid |
| 403 | `user_blocked` | Account set inactive by admin |
| 422 | `validation_error` | Bad or missing field |
| 422 | `out_of_service_area` | Pickup not serviceable for this module |
| 422 | `module_not_available` | Module is Coming soon or inactive |
| 422 | `invalid_promo_code` · `promo_expired` · `promo_usage_limit` · `promo_min_fare_not_met` | Coupon problems: see [onboarding-promo-api.md](onboarding-promo-api.md) |

---

## ETA-02 — Cancellation policy

`GET /common/cancel-policy?module_key=one_way` · Public or Bearer

### 200

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "title": "Cancellation policy",
    "body": "Free cancellation until a driver is assigned. After the driver is assigned, a cancellation fee may apply."
  }
}
```

Default policy per module (seed data; edited in admin → Services → Edit):

| module_key | body |
|---|---|
| `one_way` | Free cancellation until a driver is assigned. After the driver is assigned, a cancellation fee may apply. |
| `shared` | Free cancellation until a driver is assigned. Seats cancelled after that may be charged. |
| `outstation` | Free cancellation up to 1 hour before pickup. Later cancellations may be charged. |
| `round_trip` | Free cancellation up to 1 hour before pickup. Later cancellations may be charged. |
| `scheduled` | Free cancellation up to 30 minutes before the scheduled time. Later cancellations may be charged. |
| `parcel_bike` | Free cancellation until a rider picks up the parcel. After pickup, the parcel cannot be cancelled. |
| `parcel_3wheeler` | Free cancellation until a driver picks up the parcel. After pickup, the parcel cannot be cancelled. |

| Field | Type | Meaning |
|---|---|---|
| `title` | string | Heading; `Cancellation policy` if the admin left it empty |
| `body` | string | Policy text; `""` means no policy is written — hide the section |

### 422 — unknown or missing module_key

```json
{
  "success": false,
  "message": "validation_error",
  "data": {
    "errors": {
      "module_key": "module_key is not a valid ride module"
    }
  }
}
```
