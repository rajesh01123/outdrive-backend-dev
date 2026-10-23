# Rider app — Home · Zone · ETA APIs

Flow: **HOME-01** (modules) → user picks a module and pickup → **ZONE-01** (serviceable?) → drop chosen → **ETA-01** (vehicles + fares) → booking (next phase). **ETA-02** shows the cancellation policy.

Base: `{APP_URL}/api/v1`. Envelope: `{ "success": true, "message": "machine_readable", "data": ... }`.

Everything here is driven by the admin panel (Services, Zones, Vehicles, Fare settings). The app must not hard-code modules or vehicles — show what the API returns.

---

## HOME-01 — `GET /common/ride_modules` (public)

`data` is an array already sorted by `order_by`. Inactive modules are not returned. `coming_soon: true` → show the card, but do not allow booking.

```json
{ "id": "m_one_way", "name": "One Way", "short_description": "City ride", "description": "Point to point city ride",
  "transport_type": "taxi", "service_type": "normal", "module_key": "one_way", "section": "rides",
  "menu_icon": "https://…/uploads/services/x.webp", "icon_types_for": "taxi", "order_by": 1, "is_active": true, "coming_soon": false }
```

| Field | Values |
|---|---|
| `module_key` | `one_way`, `shared`, `outstation`, `round_trip`, `scheduled`, `parcel_bike`, `parcel_3wheeler` |
| `section` | `rides` \| `parcel` |
| `transport_type` | `taxi` \| `delivery` |
| `service_type` | `normal` \| `shared_ride` \| `outstation` |

Use `module_key` in the app; `id` is opaque.

---

## ZONE-01 — `POST /common/service-availability`

Token optional. If a token is sent it must be valid (otherwise `401`) — so an expired session is noticed.

```json
{ "pick_lat": 22.7196, "pick_lng": 75.8577, "module_key": "one_way" }
```

| message | `is_serviceable` | Meaning |
|---|---|---|
| `service_available` | `true` | `zone_id` (e.g. `z_1`) and `zone_name` are filled |
| `out_of_service_area` | `false` | Pickup outside every active zone, or the module is switched off in that zone |
| `module_not_available` | `false` | Module is coming soon or inactive |

```json
{ "success": true, "message": "service_available",
  "data": { "is_serviceable": true, "zone_id": "z_1", "zone_name": "Indore City", "currency": "INR", "currency_symbol": "₹", "distance_unit": "km" } }
```

When not serviceable, `zone_id` and `zone_name` are `""`. Do not call ETA. `drop_lat` / `drop_lng` are accepted but not checked yet. Invalid input → `422 validation_error`.

---

## ETA-01 — `POST /request/eta` (Bearer)

The backend calculates every fare; the app only sends the route.

```json
{
  "module_key": "one_way", "transport_type": "taxi", "service_type": "normal",
  "pick_lat": 22.7196, "pick_lng": 75.8577, "drop_lat": 22.7533, "drop_lng": 75.8937,
  "pick_address": "Rajwada, Indore", "drop_address": "Airport Road, Indore",
  "distance": "8500", "duration": "22", "polyline": "",
  "is_out_station": 0, "is_round_trip": 0, "schedule_datetime": "",
  "shared_ride": 0, "seats_taken": 1, "promo_code": ""
}
```

| Field | Rule |
|---|---|
| `distance` | Meters (route distance from Maps). If it is shorter than the straight line between pickup and drop, the straight-line distance is used |
| `duration` | Minutes |
| `transport_type`, `service_type` | Optional; if sent they must match the module (`422` otherwise) |
| `schedule_datetime` | **Required for `scheduled`**: 30 minutes to 7 days ahead. `"2026-10-23 10:30:00"` without an offset is Indian time |
| `seats_taken` | 1–20; used by `shared` (vehicles with fewer seats are left out) |
| `promo_code` | Must be `""` for now → otherwise `422 invalid_promo_code` |
| `is_out_station`, `is_round_trip`, `shared_ride` | Accepted (0/1). Pricing follows the module itself: `round_trip` doubles distance and time, `shared` multiplies by seats |

### Vehicles per module (admin "Module mapping")

| module_key | Vehicles (seed defaults) |
|---|---|
| `one_way`, `scheduled` | Bike, Auto, Hatchback, Sedan, SUV, Premium |
| `shared` | Shared Car (fare × seats) |
| `outstation`, `round_trip` | Sedan, SUV, Premium |
| `parcel_bike` | Bike |
| `parcel_3wheeler` | 3 Wheeler |

A vehicle appears only if it is active, mapped to the module, and has an active fare in the pickup's zone.

### Success

`enabled_dispatch_type` sits **beside** `data`.

```json
{
  "success": true, "message": "OK",
  "enabled_dispatch_type": { "ondemand": true, "bidding": false, "shared": false },
  "data": [{
    "zone_type_id": "zt_1", "type_id": "vt_1", "name": "Bike", "description": "Affordable bike ride",
    "vehicle_icon": "https://…/uploads/vehicles/a1.webp", "capacity": 1, "payment_type": "cash,wallet",
    "distance": "8.5", "distance_in_meters": "8500", "time": 22, "total": 49, "min_amount": 49,
    "currency": "INR", "unit_in_words": "KM", "is_default": true, "dispatch_type": "normal",
    "enable_bidding": false, "enable_shared_ride": false, "seats_taken": 1, "has_discount": false, "discount_total": 0,
    "base_price": 25, "price_per_distance": 8, "price_per_time": 1, "distance_price": 20, "time_price": 4,
    "tax_amount": 0, "tax": "0", "airport_surge_fee": 0, "min_fare_applied": false,
    "free_waiting_time_in_mins_before_trip_start": 5, "waiting_charge": 2,
    "promocode_id": "", "user_wallet_balance": 0, "preference": []
  }]
}
```

- Exactly one item has `is_default: true` — pre-select it.
- `payment_type` never contains `online` until a payment gateway is live.
- `distance` / `distance_in_meters` / `time` are the values used for the fare (doubled for round trip).
- Keep `zone_type_id`, `type_id`, `total` and the request fields — booking (BOOK-01) needs them.

### Fare formula

```
distance_price = max(0, km − included_km) × price_per_distance
time_price     = max(0, minutes − included_minutes) × price_per_time
total          = round( max(base_price + distance_price + time_price + tax_amount + airport_surge_fee, minimum_fare) )
```

Example (Bike, Indore seed): 25 + (8.5 − 6) × 8 + (22 − 18) × 1 = **₹49**. A 3 km / 10 min ride costs the ₹30 minimum (`min_fare_applied: true`).

### Errors

| Status | message | When |
|---|---|---|
| 200 | `no_vehicles_available` (`data: []`) | No vehicle is set up for this module / zone / seat count |
| 401 | `unauthorized`, `invalid_or_expired_token`, `session_revoked` | Token missing or invalid |
| 422 | `validation_error` | Bad or missing field (`data.errors.<field>`) |
| 422 | `out_of_service_area` | Pickup not serviceable for this module |
| 422 | `module_not_available` | Module is coming soon or inactive |
| 422 | `invalid_promo_code` | Any promo code (coupons not live yet) |

---

## ETA-02 — `GET /common/cancel-policy?module_key=one_way` (public or Bearer)

```json
{ "success": true, "message": "OK", "data": { "title": "Cancellation policy", "body": "Free cancel till driver assigned. After assign, fee may apply." } }
```

Written per module in the admin panel (Services → Edit). An empty `body` means no policy has been written — hide the section. Unknown `module_key` → `422`.
