# Rider app — BOOK-01 Create booking · Ride state in GET /user · Goods types

**Audience:** Flutter rider app
**Base URL:** `https://outdrivebackend.cyberimpulses.com/api/v1` (local: `http://localhost:3113/api/v1`)
**Swagger:** `/api-docs` → **Ride request** (`/request/create`), **User** (`GET /user`), **Common** (`/common/goods-types`)

Every example is a **real response** captured from the API with the seed data (Indore City zone, seed vehicles, fares and coupons). Only the host was changed to the live domain; `…` marks a shortened object.

| | |
|---|---|
| Envelope | `{ "success": true, "message": "...", "data": ... }` |
| Errors | `{ "success": false, "message": "error_key", "data": { "errors": { "<field>": "..." } } }` — the first bad field is reported |
| Auth | `Authorization: Bearer <access_token>` |
| Keys | snake_case · JSON body |
| Money | INR, whole rupees |
| Date and time you send | `"YYYY-MM-DD HH:mm:ss"` in IST, without an offset |
| Date and time you get back | ISO 8601 in UTC, e.g. `"2026-10-25T05:00:00.000Z"`. Convert to local time to show it |

## App flow

```
ETA-01   POST /request/eta            user picks one vehicle → keep zone_type_id, type_id, total, promocode_id
Parcel   GET  /common/goods-types     goods list for the parcel form
BOOK-01  POST /request/create         the same trip fields as ETA + the picked vehicle + payment
           200, status "searching"      → "Finding your driver" screen; save data.id (req_1099)
           200, status "scheduled"      → scheduled confirmation → home
           409 fare_changed             → call ETA again, show the new price, the user taps Book again
           409 active_booking_exists    → open that ride (data.request_id)
App open / home  → GET /user          has_ongoing_ride + onTripRequest.data → reopen the ride screen
Ride screen      → GET /user?current_ride=req_1099   poll every few seconds and follow "status"
```

> **The driver app is not live yet.** No driver can accept a booking, so every `searching` booking becomes `no_driver_found` after about **5 minutes**. The search screen must handle that status: show "No driver found" and let the user try again.

## What the server checks

Everything is checked again on the server, in this order. The first failure is returned.

1. Token, then the fields (`validation_error`).
2. Module switched on, the scheduled time (for `scheduled`) and pickup inside a zone — the same as ETA (`module_not_available`, `validation_error`, `out_of_service_area`).
3. The picked `zone_type_id` + `type_id` is one of the vehicles ETA gives for this trip (`vehicle_not_available`).
4. `payment_opt` is allowed for that vehicle (`payment_not_available`).
5. Parcel contacts and goods type; round-trip return time.
6. One ride at a time (`active_booking_exists`). Scheduled bookings do not count.
7. The promo, with the same rules as ETA.
8. The fare. It must equal `request_eta_amount` (`fare_changed`).
9. Wallet balance when paying by wallet (`insufficient_wallet_balance`).

The fare, the discount and the amount to pay always come from the server. `request_eta_amount` is **only compared**, never used as the price.

---

## BOOK-01 — Create booking

`POST /request/create` · **Bearer** · JSON

One API for every module. Send the **same trip fields as the ETA call, with the same values**, plus the vehicle the user picked and the payment.

### Request — Ride (`one_way`)

The user picked **Sedan** in ETA (`zone_type_id: "zt_4"`, `type_id: "vt_4"`, `total: 148`).

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
  "promo_code": "",
  "zone_type_id": "zt_4",
  "type_id": "vt_4",
  "request_eta_amount": 148,
  "payment_opt": 1,
  "promocode_id": "",
  "stops": [],
  "preferences": [],
  "book_for_other": 0,
  "pickup_poc_instruction": "Call when you reach the main gate"
}
```

### 200 — created

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "req_1099",
    "request_number": "OD1099",
    "status": "searching",
    "module_key": "one_way",
    "module_name": "One Way",
    "transport_type": "taxi",
    "service_type": "normal",
    "is_later": false,
    "is_completed": false,
    "is_cancelled": false,
    "accepted_ride": false,
    "pick_lat": 22.7196,
    "pick_lng": 75.8577,
    "drop_lat": 22.7533,
    "drop_lng": 75.8937,
    "pick_address": "Rajwada, Indore",
    "drop_address": "Airport Road, Indore",
    "distance_meters": 8500,
    "duration_minutes": 22,
    "zone_type_id": "zt_4",
    "type_id": "vt_4",
    "vehicle_name": "Sedan",
    "payment_opt": 1,
    "subtotal": 148,
    "promo_discount": 0,
    "request_eta_amount": 148,
    "currency": "INR",
    "promo_code": "",
    "promocode_id": "",
    "shared_ride": false,
    "seats_taken": 1,
    "is_round_trip": false,
    "schedule_datetime": "",
    "return_time": "",
    "pickup_poc_instruction": "Call when you reach the main gate",
    "book_for_other": false,
    "other_contact_name": "",
    "contact_no_other": "",
    "parcel": null,
    "cancel_reason": "",
    "driver_detail": null,
    "vehicle_detail": null,
    "created_at": "2026-10-24T13:05:53.000Z"
  }
}
```

### Request fields

**Trip fields (same as [ETA-01](ride-api.md))** — `module_key`, `transport_type`, `service_type`, `pick_lat`, `pick_lng`, `drop_lat`, `drop_lng`, `pick_address`, `drop_address`, `distance` (meters), `duration` (minutes), `polyline`, `is_out_station`, `is_round_trip`, `schedule_datetime`, `shared_ride`, `seats_taken`, `promo_code`.

| Field | Required | Rule |
|---|---|---|
| `zone_type_id` | yes | `zt_<id>` of the vehicle the user picked in ETA |
| `type_id` | yes | `vt_<id>` of the same vehicle |
| `request_eta_amount` | yes | That vehicle's `total` from ETA (after the promo) |
| `payment_opt` | yes | `0` online · `1` cash · `2` wallet. Must be in the vehicle's `payment_type`. **Online is switched off for now** |
| `promo_code` | no | The code used in the ETA call; `""` = none |
| `promocode_id` | no | `promo_<id>` from ETA; `""` without a promo. When sent, it must belong to `promo_code` |
| `pickup_poc_instruction` | no | Max 255. Note for the driver at pickup ("Add instructions") |
| `book_for_other` | no | `0` / `1`. With `1`, `other_contact_name` (2–80) and `contact_no_other` (10 digits; spaces are removed) are required |
| `stops` | no | Send `[]`. Multi-stop rides are not available yet; a filled list returns `not_available_yet` |
| `preferences` | no | Send `[]`. Ride preferences are not available yet; a filled list returns `not_available_yet` |
| `myself`, `is_later`, `is_parcel` | no | Accepted and ignored. The server works these out from `module_key` and `book_for_other` |

`is_round_trip`, `is_out_station` and `shared_ride` never change the price either: the module decides. `seats_taken` counts only for `shared`; every other module books 1 seat.

### Extra fields by module

| Module | Also send | Rule |
|---|---|---|
| `shared` | `shared_ride: 1`, `seats_taken` | The same seats as the ETA call (1–20) |
| `round_trip` | `is_round_trip: 1`, `return_time` | `"YYYY-MM-DD HH:mm:ss"` IST. After the pickup time and within 7 days |
| `scheduled` | `schedule_datetime` | The same value as the ETA call: 30 minutes to 7 days ahead |
| `parcel_bike`, `parcel_3wheeler` | contacts + goods | See [Parcel](#parcel) |

### Response fields

The same object comes back in `onTripRequest.data` and `current_ride` of `GET /user`.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | `req_<number>`. **Save it**: `GET /user?current_ride=` uses it |
| `request_number` | string | `OD<number>`. Show it to the user and support |
| `status` | string | See [Status values](#status-values) |
| `module_key`, `module_name`, `transport_type`, `service_type` | string | The booked module |
| `is_later` | boolean | `true` for a scheduled booking |
| `is_completed` | boolean | `status` is `completed` |
| `is_cancelled` | boolean | `status` is `cancelled` or `no_driver_found` |
| `accepted_ride` | boolean | A driver took the ride (`accepted`, `arrived`, `on_trip`, `completed`) |
| `pick_*`, `drop_*` | | As sent |
| `distance_meters`, `duration_minutes` | number | What the fare used (never below the straight-line distance, like ETA) |
| `zone_type_id`, `type_id`, `vehicle_name` | string | The booked vehicle |
| `payment_opt` | number | `0` online · `1` cash · `2` wallet |
| `subtotal` | number | Fare before the promo |
| `promo_discount` | number | ₹ off; `0` without a promo |
| `request_eta_amount` | number | **Amount to pay** = `subtotal` − `promo_discount` (the ETA `total`) |
| `currency` | string | `INR` |
| `promo_code`, `promocode_id` | string | `""` without a promo |
| `shared_ride`, `seats_taken` | boolean, number | Shared ride and seats |
| `is_round_trip`, `return_time` | boolean, string | `return_time` is UTC ISO, or `""` |
| `schedule_datetime` | string | Pickup time of a scheduled booking (UTC ISO), or `""` |
| `pickup_poc_instruction` | string | Note for the driver at pickup |
| `book_for_other`, `other_contact_name`, `contact_no_other` | boolean, string, string | Booking for someone else |
| `parcel` | object / null | `null` for rides. See [Parcel](#parcel) |
| `cancel_reason` | string | Set for `cancelled` and `no_driver_found`; otherwise `""` |
| `driver_detail`, `vehicle_detail` | null | Always `null` until the driver app is live |
| `created_at` | string | UTC ISO |

---

### With a promo

ETA with `promo_code: "SAVE50"` gave **SUV** `subtotal: 205`, `total: 155`, `promocode_id: "promo_1"`. Send the same code and that `total`:

```json
{ "promo_code": "SAVE50", "promocode_id": "promo_1", "zone_type_id": "zt_5", "type_id": "vt_5", "request_eta_amount": 155 }
```

200 (shortened to the promo fields):

```json
{
  "id": "req_1100",
  "vehicle_name": "SUV",
  "subtotal": 205,
  "promo_discount": 50,
  "request_eta_amount": 155,
  "promo_code": "SAVE50",
  "promocode_id": "promo_1",
  …
}
```

The server applies the code again. The use counts from the moment of booking (a scheduled booking too). When the booking ends as `cancelled` or `no_driver_found`, the use is given back.

### Booking for someone else

Same as the ride request, with (the number is sent with a space; it is saved as 10 digits):

```json
{ "book_for_other": 1, "other_contact_name": "Riya Sharma", "contact_no_other": "98765 43210", "pickup_poc_instruction": "She is at the bus stop" }
```

200:

```json
{
  "id": "req_1101",
  "status": "searching",
  "pickup_poc_instruction": "She is at the bus stop",
  "book_for_other": true,
  "other_contact_name": "Riya Sharma",
  "contact_no_other": "9876543210",
  …
}
```

### Paying by wallet

`payment_opt: 2`. The wallet must have at least the fare. It is **only checked** at booking; nothing is taken from the wallet yet (that happens when the trip ends, in the driver phase).

```json
{
  "id": "req_1102",
  "status": "searching",
  "payment_opt": 2,
  "request_eta_amount": 148,
  …
}
```

### Shared (`shared`)

Same as the ride request, with:

```json
{ "module_key": "shared", "service_type": "shared_ride", "shared_ride": 1, "seats_taken": 2, "zone_type_id": "zt_7", "type_id": "vt_7", "request_eta_amount": 137 }
```

200:

```json
{
  "id": "req_1104",
  "status": "searching",
  "module_key": "shared",
  "module_name": "Shared Ride",
  "service_type": "shared_ride",
  "vehicle_name": "Shared Car",
  "shared_ride": true,
  "seats_taken": 2,
  "request_eta_amount": 137,
  …
}
```

### Round trip (`round_trip`)

Same as the ride request, with:

```json
{ "module_key": "round_trip", "service_type": "outstation", "is_round_trip": 1, "is_out_station": 1, "drop_lat": 22.9676, "drop_lng": 76.0534, "drop_address": "Dewas, Madhya Pradesh", "distance": "38500", "duration": "65", "return_time": "2026-10-25 20:00:00", "zone_type_id": "zt_8", "type_id": "vt_4", "request_eta_amount": 1033 }
```

200 (`return_time` comes back in UTC: 2026-10-25 20:00:00 IST = `2026-10-25T14:30:00.000Z`):

```json
{
  "id": "req_1105",
  "status": "searching",
  "module_key": "round_trip",
  "service_type": "outstation",
  "vehicle_name": "Sedan",
  "is_round_trip": true,
  "return_time": "2026-10-25T14:30:00.000Z",
  "distance_meters": 38500,
  "duration_minutes": 65,
  "request_eta_amount": 1033,
  …
}
```

### Scheduled (`scheduled`)

Same as the ride request, with:

```json
{ "module_key": "scheduled", "schedule_datetime": "2026-10-25 10:30:00", "is_later": 1, "zone_type_id": "zt_4", "type_id": "vt_4", "request_eta_amount": 148 }
```

200 (status `scheduled`; 2026-10-25 10:30:00 IST = `2026-10-25T05:00:00.000Z`):

```json
{
  "id": "req_1103",
  "request_number": "OD1103",
  "status": "scheduled",
  "module_key": "scheduled",
  "is_later": true,
  "accepted_ride": false,
  "vehicle_name": "Sedan",
  "schedule_datetime": "2026-10-25T05:00:00.000Z",
  "request_eta_amount": 148,
  …
}
```

A scheduled booking does not block a ride now: the user can have one active ride and scheduled ones. Listing, editing and cancelling scheduled rides come in a later phase. While the `scheduled` module is "coming soon" (as on the local server now), BOOK-01 and ETA answer `module_not_available`; the admin switches it on in **Admin → Services**.

---

## Parcel

Modules `parcel_bike` and `parcel_3wheeler` (`transport_type: "delivery"`). Load the goods list first: [GET /common/goods-types](#get-commongoods-types).

| Field | Required | Rule |
|---|---|---|
| `pickup_poc_name` | yes | Sender name, max 80 |
| `pickup_poc_mobile` | yes | Sender, 10 digits |
| `drop_poc_name` | yes | Receiver name, max 80 |
| `drop_poc_mobile` | yes | Receiver, 10 digits |
| `paid_at` | yes | `Sender` or `Receiver` (who pays) |
| `goods_type_id` | yes | An `id` from `/common/goods-types` (active ones only) |
| `goods_type_quantity` | no | Free text, max 40 (`"2 files"`, `"Loose"`) |
| `parcel_type` | no | `send` (default) or `receive` |
| `pickup_poc_instruction` | no | Max 255. For the driver at pickup |
| `drop_poc_instruction` | no | Max 255. For the driver at drop |
| `is_parcel` | no | Ignored; the module decides |

`book_for_other` does not apply to parcels (the receiver is in `drop_poc_*`).

### Request

```json
{
  "module_key": "parcel_bike",
  "transport_type": "delivery",
  "service_type": "normal",
  "pick_lat": 22.7196,
  "pick_lng": 75.8577,
  "drop_lat": 22.7533,
  "drop_lng": 75.8937,
  "pick_address": "Rajwada, Indore",
  "drop_address": "Vijay Nagar, Indore",
  "distance": "8500",
  "duration": "22",
  "polyline": "",
  "is_out_station": 0,
  "is_round_trip": 0,
  "schedule_datetime": "",
  "shared_ride": 0,
  "seats_taken": 1,
  "promo_code": "",
  "zone_type_id": "zt_11",
  "type_id": "vt_1",
  "request_eta_amount": 64,
  "payment_opt": 1,
  "promocode_id": "",
  "parcel_type": "send",
  "goods_type_id": 1,
  "goods_type_quantity": "2 files",
  "paid_at": "Sender",
  "pickup_poc_name": "Ankit",
  "pickup_poc_mobile": "9000000777",
  "pickup_poc_instruction": "Ring the bell, 2nd floor",
  "drop_poc_name": "Riya Sharma",
  "drop_poc_mobile": "9876543210",
  "drop_poc_instruction": "Leave with the security guard"
}
```

### 200

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "req_1106",
    "request_number": "OD1106",
    "status": "searching",
    "module_key": "parcel_bike",
    "module_name": "Parcel on Bike",
    "transport_type": "delivery",
    "service_type": "normal",
    "is_later": false,
    "is_completed": false,
    "is_cancelled": false,
    "accepted_ride": false,
    "pick_lat": 22.7196,
    "pick_lng": 75.8577,
    "drop_lat": 22.7533,
    "drop_lng": 75.8937,
    "pick_address": "Rajwada, Indore",
    "drop_address": "Vijay Nagar, Indore",
    "distance_meters": 8500,
    "duration_minutes": 22,
    "zone_type_id": "zt_11",
    "type_id": "vt_1",
    "vehicle_name": "Bike",
    "payment_opt": 1,
    "subtotal": 64,
    "promo_discount": 0,
    "request_eta_amount": 64,
    "currency": "INR",
    "promo_code": "",
    "promocode_id": "",
    "shared_ride": false,
    "seats_taken": 1,
    "is_round_trip": false,
    "schedule_datetime": "",
    "return_time": "",
    "pickup_poc_instruction": "Ring the bell, 2nd floor",
    "book_for_other": false,
    "other_contact_name": "",
    "contact_no_other": "",
    "parcel": {
      "parcel_type": "send",
      "goods_type_id": 1,
      "goods_type_name": "Documents",
      "goods_type_quantity": "2 files",
      "paid_at": "Sender",
      "pickup_poc_name": "Ankit",
      "pickup_poc_mobile": "9000000777",
      "drop_poc_name": "Riya Sharma",
      "drop_poc_mobile": "9876543210",
      "drop_poc_instruction": "Leave with the security guard"
    },
    "cancel_reason": "",
    "driver_detail": null,
    "vehicle_detail": null,
    "created_at": "2026-10-24T13:05:53.000Z"
  }
}
```

| `parcel` field | Meaning |
|---|---|
| `parcel_type` | `send` / `receive` |
| `goods_type_id`, `goods_type_name` | The goods type. The name is saved with the booking, so a later rename in the admin panel does not change old bookings |
| `goods_type_quantity` | As sent, or `""` |
| `paid_at` | `Sender` / `Receiver` |
| `pickup_poc_*`, `drop_poc_*` | Sender and receiver |

---

## Errors

| Status | message | When | Extra in `data` |
|---|---|---|---|
| 401 | `unauthorized`, `invalid_or_expired_token`, `session_revoked` | No or bad token | |
| 403 | `user_blocked` | Account blocked | |
| 409 | `active_booking_exists` | A ride is already `searching`, `accepted`, `arrived` or `on_trip` | `request_id`, `request_number`, `status` |
| 409 | `fare_changed` | The server's fare is not `request_eta_amount` (fare edited, promo ended, …) | `request_eta_amount`, `total` |
| 422 | `validation_error` | A missing or bad field | `errors.<field>` |
| 422 | `module_not_available`, `out_of_service_area` | Same as ETA | |
| 422 | `vehicle_not_available` | `zone_type_id` / `type_id` is not a vehicle ETA gives for this trip | `errors.type_id` |
| 422 | `payment_not_available` | `payment_opt` not allowed for this vehicle (online is off) | `errors.payment_opt` |
| 422 | `insufficient_wallet_balance` | Wallet lower than the fare | `wallet_balance`, `total` |
| 422 | `invalid_promo_code`, `promo_expired`, `promo_usage_limit`, `promo_min_fare_not_met` | Same rules as ETA | `errors.promo_code` |
| 422 | `not_available_yet` | `stops` or `preferences` with items | `errors.stops` / `errors.preferences` |

### What the app does

| message | App |
|---|---|
| `fare_changed` | Call ETA again with the same fields, show the new price, and let the user tap Book again. Do not resend with `data.total` without showing it |
| `active_booking_exists` | Open the ride screen for `data.request_id` |
| `vehicle_not_available`, `payment_not_available` | Refresh ETA; the admin changed the vehicle or its payment types |
| `insufficient_wallet_balance` | Ask the user to pick cash |
| promo errors | Remove the code, refresh ETA |

### Real error responses

409 — a ride is already searching:

```json
{ "success": false, "message": "active_booking_exists", "data": { "request_id": "req_1099", "request_number": "OD1099", "status": "searching" } }
```

409 — the fare changed (the app sent 136; the fare is 148):

```json
{ "success": false, "message": "fare_changed", "data": { "request_eta_amount": 136, "total": 148, "errors": { "request_eta_amount": "The fare has changed. Refresh the price and book again." } } }
```

422 — vehicle not in this trip's ETA list:

```json
{ "success": false, "message": "vehicle_not_available", "data": { "errors": { "type_id": "This vehicle is not available for this trip. Refresh the prices and choose again." } } }
```

422 — online payment while it is off:

```json
{ "success": false, "message": "payment_not_available", "data": { "errors": { "payment_opt": "online payment is not available for this ride" } } }
```

422 — wallet lower than the fare:

```json
{ "success": false, "message": "insufficient_wallet_balance", "data": { "wallet_balance": 0, "total": 148, "errors": { "payment_opt": "Wallet balance is lower than the fare" } } }
```

422 — promo:

```json
{ "success": false, "message": "promo_min_fare_not_met", "data": { "minimum_trip_amount": 200, "errors": { "promo_code": "This promo code needs a fare of at least ₹200" } } }
```

```json
{ "success": false, "message": "invalid_promo_code", "data": { "errors": { "promo_code": "This promo code is not valid" } } }
```

```json
{ "success": false, "message": "validation_error", "data": { "errors": { "promocode_id": "promocode_id does not match promo_code" } } }
```

422 — stops or preferences with items:

```json
{ "success": false, "message": "not_available_yet", "data": { "errors": { "stops": "Multi-stop rides are not available yet" } } }
```

```json
{ "success": false, "message": "not_available_yet", "data": { "errors": { "preferences": "Ride preferences are not available yet" } } }
```

422 — field checks:

| Case | Response |
|---|---|
| No `request_eta_amount` | `{ "success": false, "message": "validation_error", "data": { "errors": { "request_eta_amount": "request_eta_amount must be the total from ETA" } } }` |
| `zone_type_id: "5"` | `{ "success": false, "message": "validation_error", "data": { "errors": { "zone_type_id": "zone_type_id must be the zt_<number> value from ETA" } } }` |
| `payment_opt: 5` | `{ "success": false, "message": "validation_error", "data": { "errors": { "payment_opt": "payment_opt must be 0 (online), 1 (cash) or 2 (wallet)" } } }` |
| `book_for_other: 1` without a number | `{ "success": false, "message": "validation_error", "data": { "errors": { "contact_no_other": "contact_no_other is required when booking for someone else" } } }` |
| Round trip without `return_time` | `{ "success": false, "message": "validation_error", "data": { "errors": { "return_time": "return_time is required for round trips" } } }` |
| Scheduled 10 minutes ahead | `{ "success": false, "message": "validation_error", "data": { "errors": { "schedule_datetime": "schedule a ride at least 30 minutes from now" } } }` |
| Parcel without receiver mobile | `{ "success": false, "message": "validation_error", "data": { "errors": { "drop_poc_mobile": "drop_poc_mobile is required for parcels" } } }` |
| Parcel without `goods_type_id` | `{ "success": false, "message": "validation_error", "data": { "errors": { "goods_type_id": "goods_type_id is required for parcels" } } }` |
| Parcel with an unknown or switched-off goods type | `{ "success": false, "message": "validation_error", "data": { "errors": { "goods_type_id": "goods_type_id is not an active goods type" } } }` |
| `paid_at: "Both"` | `{ "success": false, "message": "validation_error", "data": { "errors": { "paid_at": "paid_at must be Sender or Receiver" } } }` |
| No token | `{ "success": false, "message": "unauthorized", "data": {} }` |

---

## Status values

| status | Meaning | App screen |
|---|---|---|
| `searching` | Looking for a driver | "Finding your driver" |
| `scheduled` | Booked for later | Confirmation, then home. Counts in `has_upcoming_ride` |
| `accepted`, `arrived`, `on_trip` | Driver phase (not live yet) | Live trip |
| `completed` | Trip finished | Trip summary |
| `cancelled` | Cancelled (by support for now; the rider cancel API comes later) | Show `cancel_reason` |
| `no_driver_found` | No driver took it within 5 minutes | "No driver found", Try again |

---

## GET /user — ride state on the home screen

`GET /user` · **Bearer**. The same profile as before, plus `favouriteLocations` ([home-api.md](home-api.md)) and three ride fields:

| Field | Type | Meaning |
|---|---|---|
| `has_ongoing_ride` | boolean | The user has a `searching`, `accepted`, `arrived` or `on_trip` booking |
| `has_upcoming_ride` | boolean | The user has a `scheduled` booking in the future |
| `onTripRequest` | object / null | `{ "data": <booking> }` for the ongoing ride (same object as BOOK-01), else `null` |

### 200 — a ride is searching

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "u_108",
    "name": "Ankit",
    "mobile": "9000000777",
    "country_code": "91",
    "profile_picture": "",
    "gender": "",
    "map_type": "",
    "wallet_balance": 0,
    "emergency_contact_name": "",
    "emergency_contact_number": "",
    "locale": "en",
    "favouriteLocations": {
      "data": []
    },
    "has_ongoing_ride": true,
    "has_upcoming_ride": false,
    "onTripRequest": {
      "data": {
        "id": "req_1099",
        "request_number": "OD1099",
        "status": "searching",
        "module_key": "one_way",
        "module_name": "One Way",
        "transport_type": "taxi",
        "service_type": "normal",
        "is_later": false,
        "is_completed": false,
        "is_cancelled": false,
        "accepted_ride": false,
        "pick_lat": 22.7196,
        "pick_lng": 75.8577,
        "drop_lat": 22.7533,
        "drop_lng": 75.8937,
        "pick_address": "Rajwada, Indore",
        "drop_address": "Airport Road, Indore",
        "distance_meters": 8500,
        "duration_minutes": 22,
        "zone_type_id": "zt_4",
        "type_id": "vt_4",
        "vehicle_name": "Sedan",
        "payment_opt": 1,
        "subtotal": 148,
        "promo_discount": 0,
        "request_eta_amount": 148,
        "currency": "INR",
        "promo_code": "",
        "promocode_id": "",
        "shared_ride": false,
        "seats_taken": 1,
        "is_round_trip": false,
        "schedule_datetime": "",
        "return_time": "",
        "pickup_poc_instruction": "Call when you reach the main gate",
        "book_for_other": false,
        "other_contact_name": "",
        "contact_no_other": "",
        "parcel": null,
        "cancel_reason": "",
        "driver_detail": null,
        "vehicle_detail": null,
        "created_at": "2026-10-24T13:05:53.000Z"
      }
    }
  }
}
```

### 200 — nothing ongoing, a scheduled ride is coming up

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "u_108",
    "name": "Ankit",
    "mobile": "9000000777",
    "country_code": "91",
    "profile_picture": "",
    "gender": "",
    "map_type": "",
    "wallet_balance": 0,
    "emergency_contact_name": "",
    "emergency_contact_number": "",
    "locale": "en",
    "favouriteLocations": {
      "data": []
    },
    "has_ongoing_ride": false,
    "has_upcoming_ride": true,
    "onTripRequest": null
  }
}
```

### 200 — idle

```json
{ "success": true, "message": "OK", "data": { "id": "u_108", "name": "Ankit", …, "has_ongoing_ride": false, "has_upcoming_ride": false, "onTripRequest": null } }
```

## GET /user?current_ride=req_… — one booking

Add `current_ride` with the `id` from BOOK-01. The response is the normal `GET /user` plus `current_ride` (the same object as BOOK-01). Use it on the ride screen to follow the status, also after the ride has ended (then `onTripRequest` is `null`, but `current_ride` still comes back).

`req_1099`, `OD1099` and `1099` all work. Only the user's own bookings are found.

### 200 — still searching

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "u_108",
    "name": "Ankit",
    …,
    "has_ongoing_ride": true,
    "onTripRequest": {
      "data": {
        "id": "req_1099",
        "status": "searching",
        …
      }
    },
    "current_ride": {
      "id": "req_1099",
      "request_number": "OD1099",
      "status": "searching",
      "module_key": "one_way",
      "is_later": false,
      "is_completed": false,
      "is_cancelled": false,
      "accepted_ride": false,
      "vehicle_name": "Sedan",
      "request_eta_amount": 148,
      "cancel_reason": "",
      "driver_detail": null,
      "vehicle_detail": null,
      …
    }
  }
}
```

### 200 — after 5 minutes without a driver

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "u_108",
    "name": "Ankit",
    …,
    "has_ongoing_ride": false,
    "onTripRequest": null,
    "current_ride": {
      "id": "req_1099",
      "request_number": "OD1099",
      "status": "no_driver_found",
      "module_key": "one_way",
      "is_later": false,
      "is_completed": false,
      "is_cancelled": true,
      "accepted_ride": false,
      "vehicle_name": "Sedan",
      "request_eta_amount": 148,
      "cancel_reason": "No driver accepted within 5 minutes",
      "driver_detail": null,
      "vehicle_detail": null,
      …
    }
  }
}
```

### 404 — not this user's booking, or no such booking

```json
{ "success": false, "message": "booking_not_found", "data": {} }
```

`current_ride` longer than 30 characters gives `422 validation_error` with `errors.current_ride`.

---

## GET /common/goods-types

`GET /common/goods-types` · **Public** (no token). The goods list for the parcel form, in the admin's order. Only active ones are returned. Send the `id` as `goods_type_id` in BOOK-01.

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 1,
      "name": "Documents",
      "icon": "",
      "order_by": 1
    },
    {
      "id": 2,
      "name": "Electronics",
      "icon": "",
      "order_by": 2
    },
    {
      "id": 3,
      "name": "Food",
      "icon": "",
      "order_by": 3
    },
    {
      "id": 4,
      "name": "Clothes",
      "icon": "",
      "order_by": 4
    },
    {
      "id": 5,
      "name": "Household",
      "icon": "",
      "order_by": 5
    },
    {
      "id": 6,
      "name": "Other",
      "icon": "",
      "order_by": 6
    }
  ]
}
```

| Field | Type | Meaning |
|---|---|---|
| `id` | number | Send as `goods_type_id` |
| `name` | string | Label |
| `icon` | string | Full URL, or `""` when the admin did not add one (show a default icon) |
| `order_by` | number | Already sorted |

The admin manages this list in the admin panel ([admin goods types API](../admin/goods-types-api.md)).
