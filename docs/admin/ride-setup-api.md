# Admin — Ride setup API (modules, zones, vehicles, fares, bookings)

Everything the admin configures so the rider-app flow **HOME-01 → ZONE-01 → ETA-01 → BOOK-01** works.

All admin endpoints need `Authorization: Bearer <admin_access_token>`. Base: `{APP_URL}/api/v1`.

## Setup and deploy

```bash
npm run db:migrate   # migrations 011–019
npm run db:seed      # admin, the 7 ride modules, 8 vehicle types + mapping, "Indore City" zone, sample fares
```

`db:seed` runs every seeder in the right order and only fills what is missing, so re-running it never overwrites admin changes.

What the app needs before it can price a ride, and what it gets when something is missing:

| Step | Admin page | If missing |
|---|---|---|
| 1. Active zone covering the pickup | Zones | `out_of_service_area` |
| 2. Module switched on in that zone | Zones → module switches | not serviceable |
| 3. Vehicles mapped to the module | Vehicles → Module mapping | `no_vehicles_available` |
| 4. A fare for each vehicle in that zone | Fare settings | that vehicle is not offered |

## Roles

| Area | super_admin | operations | support |
|---|---|---|---|
| Modules, zones, vehicles | edit | edit | view |
| **Fares** | **edit** | view | view |
| Fare calculator, test location | yes | yes | yes |
| Bookings | view + cancel | view + cancel | view |

Nothing in this area is ever deleted — bookings reference modules, zones, vehicles and fares. Use `inactive` instead.

---

## Modules — `/admin/services`

The 7 modules are the HOME-01 contract and are fixed (no create or delete):

| module_key | section | transport_type | service_type | fare category |
|---|---|---|---|---|
| `one_way` | rides | taxi | normal | city |
| `shared` | rides | taxi | shared_ride | shared |
| `outstation` | rides | taxi | outstation | outstation |
| `round_trip` | rides | taxi | outstation | outstation |
| `scheduled` | rides | taxi | normal | city |
| `parcel_bike` | parcel | delivery | normal | parcel |
| `parcel_3wheeler` | parcel | delivery | normal | parcel |

The fare category is derived: `section = parcel` → parcel, `service_type = shared_ride` → shared, `outstation` → outstation, else city.

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/services` | list + stats |
| POST | `/admin/services/:id/update` | multipart: `name`, `short_description`, `description`, `cancel_policy_title`, `cancel_policy_body`, `status`, `image`. Sending `module_key`, `section`, `transport_type`, `service_type` or `icon_types_for` → `422 service_field_locked` |
| POST | `/admin/services/:id/status` | `active` \| `coming_soon` \| `inactive` |
| POST | `/admin/services/reorder` | `{ "ids": [...] }`, every module once |

### HOME-01 — `GET /common/ride_modules` (public)

`data` is an array in display order. `inactive` modules are left out; `coming_soon` ones are included with `coming_soon: true` (show, don't book). `id` is `m_<module_key>`; the app should key off `module_key`.

---

## Zones — `/admin/zones`

A zone is a polygon of `[lat, lng]` points. The pickup point is checked with a bounding-box shortlist, then an exact point-in-polygon test. Where active zones overlap, the **highest `priority`** wins (ties: oldest zone).

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/zones` | list: modules on, fares count |
| GET | `/admin/zones/:id` | detail with `polygon` and module switches |
| POST | `/admin/zones` | `{ name, priority, status, polygon, enabled_module_ids }` — new zones get every module on by default |
| POST | `/admin/zones/:id/update` | same fields, all optional |
| POST | `/admin/zones/:id/status` | `active` \| `inactive` |
| POST | `/admin/zones/:id/modules/:serviceId` | `{ "is_enabled": true }` |
| POST | `/admin/zones/test-point` | `{ lat, lng, module_key }` — the same check ZONE-01 uses |

Polygon rules: 3–500 points, edges must not cross, must have an area. A closed ring (first point repeated) is accepted. Create/update return `warnings.overlaps` listing active zones it overlaps — allowed, just a heads-up.

`test-point` reasons: `available`, `out_of_service_area`, `module_disabled_in_zone`, `module_coming_soon`, `module_inactive`, `unknown_module`.

---

## Vehicles — `/admin/vehicle-types`

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/vehicle-types` | list + stats |
| POST | `/admin/vehicle-types` | multipart: `name`, `type_key` (optional, from name), `description`, `capacity` 1–20, `is_shared`, `status`, `icon` (required, max 2 MB) |
| POST | `/admin/vehicle-types/:id/update` | `type_key` locked; `is_shared` locked while the vehicle is mapped to any module |
| POST | `/admin/vehicle-types/:id/status` | `active` \| `inactive` |
| POST | `/admin/vehicle-types/reorder` | `{ "ids": [...] }` |
| GET | `/admin/vehicle-types/mapping` | `{ services, vehicles, mapping: { service_id: [vehicle_ids] } }` |
| POST | `/admin/vehicle-types/mapping` | `{ "mapping": { "1": [1, 2, 3] } }` — replaces the list for the modules sent |

Mapping rule: **Shared Ride takes only shared vehicles; every other module takes only private vehicles.**

Seeded mapping (ETA spec): one_way / scheduled → Bike, Auto, Hatchback, Sedan, SUV, Premium · shared → Shared Car · outstation / round_trip → Sedan, SUV, Premium · parcel_bike → Bike · parcel_3wheeler → 3 Wheeler.

---

## Fares — `/admin/fares`

One row per **zone × vehicle × fare category**. Its id is the app's `zone_type_id` (`zt_<id>`).

### Formula (shared by the calculator, ETA and booking)

```
km, minutes      = distance and time (both × 2 for a round trip)
distance_price   = max(0, km − base_distance_km) × price_per_km
time_price       = max(0, minutes − free_minutes) × price_per_min
subtotal         = (base_price + distance_price + time_price) × seats   (seats only for shared)
tax_amount       = subtotal × tax_percent / 100
total            = round( max(subtotal + tax_amount + airport_surge_fee, min_fare × seats) )
```

Example (seeded Bike, city): base ₹25 incl. 6 km, ₹8/km, 18 min free, ₹1/min, min ₹30 → 8.5 km / 22 min = 25 + 20 + 4 = **₹49**; 3 km / 10 min = **₹30** (minimum fare). `airport_surge_fee` is 0 for now.

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/fares?zone_id=` | grouped by category; vehicles mapped to a module of that category appear even without a fare (`fare: null`) |
| POST | `/admin/fares/save` | create or update (super_admin). All numeric fields required. Setting `is_default` clears the other default in that zone + category |
| POST | `/admin/fares/:id/status` | on/off (super_admin) |
| POST | `/admin/fares/copy` | `{ from_zone_id, to_zone_id, overwrite }` (super_admin) |
| POST | `/admin/fares/preview` | `{ zone_id, fare_category, distance_km, minutes, seats, round_trip }` → breakdown per vehicle |
| GET | `/admin/fares/history?zone_id=&page=` | who changed what (old → new), 20 per page |

Limits: money fields 0–100000 (2 decimals), `tax_percent` 0–100, `free_minutes` 0–1440 whole, `free_waiting_mins` 0–120 whole, `payment_types` ⊂ cash/wallet/online. A shared vehicle can only have a `shared` fare and vice versa.

Every save, status change and copy is written to `tbl_fare_histories` with the admin and the old/new values.

---

## Bookings — `/admin/bookings`

Bookings are created by BOOK-01 (app). Each booking stores a **snapshot** (module key, vehicle name, full fare breakdown), so later admin changes never alter an existing booking. `booking_id` = `OD` + (1000 + id), `request_id` = `req_` + (1000 + id).

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/bookings/stats?section=` | `total, searching, scheduled, ongoing (accepted/arrived/on_trip), completed, cancelled (incl. no_driver_found)` |
| GET | `/admin/bookings` | `page`, `status` (a status or `ongoing` / `cancelled`), `module_key`, `section` (`parcel` for the Parcels page), `search` (OD1001, name, mobile), `from`, `to` (YYYY-MM-DD). 10 per page |
| GET | `/admin/bookings/:id` | detail: route, fare snapshot, parcel sender/receiver, cancellation |
| POST | `/admin/bookings/:id/cancel` | `{ reason }` — only `searching` / `scheduled`; otherwise `422 booking_not_cancellable` |

## Errors

| Status | message |
|---|---|
| 403 | `admin_forbidden` |
| 404 | `service_not_found`, `zone_not_found`, `vehicle_type_not_found`, `fare_not_found`, `booking_not_found` |
| 409 | `zone_name_exists`, `vehicle_type_key_exists`, `duplicate_value` |
| 422 | `validation_error` (`data.errors.<field>`), `service_field_locked`, `vehicle_type_key_locked`, `vehicle_type_in_use`, `no_fares_to_copy`, `booking_not_cancellable`, `image_*` / `icon_*` upload errors |
