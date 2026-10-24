# Rider app — HOME-09 Onboarding · HOME-10 Promo list · Apply promo (ETA-01)

**Audience:** Flutter rider app
**Base URL:** `https://outdrivebackend.cyberimpulses.com/api/v1` (local: `http://localhost:3113/api/v1`)
**Swagger:** `/api-docs` → sections **Common** (on-boarding) and **Ride request** (promocode-list, eta)

Every example is a **real response** captured from the API. Only the host was changed to the live domain, and long lists are shortened with `…`.

| | |
|---|---|
| Envelope | `{ "success": true, "message": "...", "data": ... }` |
| Errors | `{ "success": false, "message": "error_key", "data": { "errors": { "<field>": "..." } } }` |
| Keys | snake_case · JSON |

## App flow

```
First launch      → HOME-09 GET /common/on-boarding   (empty list → show the built-in slides)
Offers sheet      → HOME-10 GET /request/promocode-list
User taps a code  → ETA-01 POST /request/eta with promo_code   → show the new total from the API
Remove the code   → ETA-01 again with promo_code ""
Book              → BOOK-01 sends the same promo_code and promocode_id (booking-api.md)
```

> **Do not calculate a discount in the app.** The server works out the discount for every vehicle and checks every rule: dates, module, zone, minimum fare and usage limits.

---

## HOME-09 — Onboarding slides

`GET /common/on-boarding` · **Public** (no token)

| Query | Rule |
|---|---|
| `locale` | `en` (default) or `hi`. With `hi`, Hindi text is used where the admin wrote it; otherwise English |

### 200 — `?locale=en`

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "ob_5",
      "order_by": 1,
      "title": "Book in seconds",
      "description": "Choose pickup and drop, see the fare, then ride.",
      "image": "https://outdrivebackend.cyberimpulses.com/uploads/onboarding/88377e8a-13dd-4c63-a73c-7db61b5567ca.webp",
      "active": true
    },
    {
      "id": "ob_6",
      "order_by": 2,
      "title": "Send parcels too",
      "description": "Deliver documents and packages across the city.",
      "image": "https://outdrivebackend.cyberimpulses.com/uploads/onboarding/80844f4f-d798-472d-ae4d-a20ec86c739d.webp",
      "active": true
    }
  ]
}
```

### 200 — `?locale=hi`

The second slide has no Hindi text, so it stays in English.

```json
{
  "success": true,
  "message": "OK",
  "data": [
    { "id": "ob_5", "order_by": 1, "title": "सेकंडों में बुक करें", "description": "पिकअप और ड्रॉप चुनें, किराया देखें, फिर सवारी करें।", "image": "https://outdrivebackend.cyberimpulses.com/uploads/onboarding/88377e8a-13dd-4c63-a73c-7db61b5567ca.webp", "active": true },
    { "id": "ob_6", "order_by": 2, "title": "Send parcels too", "description": "Deliver documents and packages across the city.", "image": "https://outdrivebackend.cyberimpulses.com/uploads/onboarding/80844f4f-d798-472d-ae4d-a20ec86c739d.webp", "active": true }
  ]
}
```

### 200 — no slides yet

```json
{ "success": true, "message": "OK", "data": [] }
```

The app shows its built-in slides in this case.

### 422 — bad locale (`?locale=fr`)

```json
{ "success": false, "message": "validation_error", "data": { "errors": { "locale": "locale must be en or hi" } } }
```

| Field | Type | Rule |
|---|---|---|
| `id` | string | `ob_<id>` |
| `order_by` | number | Ascending; the list is already sorted |
| `title` | string | Max 80 |
| `description` | string | Max 200; `""` when empty |
| `image` | string | Full URL; the admin uploads a square image (1080 × 1080 recommended) |
| `active` | boolean | Always `true`; inactive slides are not returned |

---

## HOME-10 — Promo / offers list

`GET /request/promocode-list` · **Bearer**

Only coupons that are active, inside their dates, fit the module and zone, and that **this user can still use** are returned (used-up codes are left out). Newest first.

| Query | Rule |
|---|---|
| `module_key` | Optional; leaves out coupons made only for other modules |
| `zone_id` | Optional number; leaves out coupons made only for other zones |
| `promo_code` | Optional; the code currently applied in ETA. That item comes back with `is_applied: true` |

### 200 — `GET /request/promocode-list` (the 4 demo coupons from the seeder)

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "promo_4",
      "code": "OUTSTATION10",
      "title": "10% off outstation",
      "description": "Up to ₹300 off on trips outside the city",
      "discount_type": "percent",
      "discount_value": 10,
      "minimum_trip_amount": 1000,
      "maximum_discount_amount": 300,
      "discount_percent": 10,
      "uses_per_user": 2,
      "from": "2026-10-23T18:30:00.000Z",
      "to": "2027-01-22T18:29:59.000Z",
      "active": true,
      "is_applied": false
    },
    {
      "id": "promo_3",
      "code": "PARCEL30",
      "title": "₹30 off on parcels",
      "description": "On parcel deliveries above ₹150",
      "discount_type": "flat",
      "discount_value": 30,
      "minimum_trip_amount": 150,
      "maximum_discount_amount": 30,
      "discount_percent": 0,
      "uses_per_user": 2,
      "from": "2026-10-23T18:30:00.000Z",
      "to": "2027-01-22T18:29:59.000Z",
      "active": true,
      "is_applied": false
    },
    {
      "id": "promo_2",
      "code": "RIDE20",
      "title": "20% off",
      "description": "Max discount ₹100",
      "discount_type": "percent",
      "discount_value": 20,
      "minimum_trip_amount": 100,
      "maximum_discount_amount": 100,
      "discount_percent": 20,
      "uses_per_user": 1,
      "from": "2026-10-23T18:30:00.000Z",
      "to": "2027-01-22T18:29:59.000Z",
      "active": true,
      "is_applied": false
    },
    {
      "id": "promo_1",
      "code": "SAVE50",
      "title": "Flat ₹50 off",
      "description": "Valid on rides above ₹200",
      "discount_type": "flat",
      "discount_value": 50,
      "minimum_trip_amount": 200,
      "maximum_discount_amount": 50,
      "discount_percent": 0,
      "uses_per_user": 3,
      "from": "2026-10-23T18:30:00.000Z",
      "to": "2027-01-22T18:29:59.000Z",
      "active": true,
      "is_applied": false
    }
  ]
}
```

### 200 — `?module_key=one_way&promo_code=SAVE50`

The outstation and parcel coupons are left out, and SAVE50 is marked as applied:

```
RIDE20  → is_applied: false
SAVE50  → is_applied: true
```

### 401 — no token

```json
{ "success": false, "message": "unauthorized", "data": {} }
```

| Field | Type | Meaning |
|---|---|---|
| `id` | string | `promo_<id>`; the same value comes back as `promocode_id` in ETA |
| `code` | string | What the user types or taps |
| `discount_type` | string | `flat` or `percent` |
| `discount_value` | number | ₹ for flat, % for percent |
| `discount_percent` | number | The % for percent coupons, `0` for flat |
| `minimum_trip_amount` | number | The fare (before the promo) must be at least this |
| `maximum_discount_amount` | number | The cap. For flat it equals the value; for percent, `0` means no cap |
| `uses_per_user` | number | How many bookings one user can make with it |
| `from` / `to` | string | ISO time (UTC); `""` = no start or no end |
| `is_applied` | boolean | `true` only for the `promo_code` sent in the query |

---

## Apply a promo — ETA-01 with `promo_code`

`POST /request/eta` · Bearer · JSON. The body is the same as ETA-01 ([ride-api.md](ride-api.md)), plus `promo_code`:

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
  "promo_code": "SAVE50"
}
```

- To remove the code, send the same call with `"promo_code": ""`.
- The code is not case-sensitive (`save50` works) and is at most 20 characters.

### New fields on every vehicle

They are also present when no code is sent, so the app can always read them.

| Field | Without a code | With a code that applies to this vehicle |
|---|---|---|
| `subtotal` | Fare (tax included) | Fare before the promo |
| `total` / `min_amount` | Same as `subtotal` | `subtotal − promo_discount`: **show this** |
| `promo_discount` / `discount_total` | `0` | ₹ taken off (whole rupees, never more than the fare) |
| `has_discount` / `promo_applied` | `false` | `true` |
| `promo_code` | `""` | The applied code |
| `promocode_id` | `""` | `promo_<id>` (send it with BOOK-01) |
| `promo_message` | `""` | `""`; when the code fits the trip but **this** vehicle's fare is below the minimum: `"Add ₹52 more to use SAVE50"` |

### How the discount is worked out

- **Flat:** `discount_value`, at most the fare.
- **Percent:** `fare × discount_value %`, rounded to whole rupees, at most `maximum_discount_amount`.
- The discount comes off the **payable fare, tax included**.
- **Minimum fare is checked per vehicle.** Vehicles below it keep their normal price, with a `promo_message`. The whole call fails with `promo_min_fare_not_met` only when **no** vehicle reaches the minimum.

### 200 — `promo_code: "SAVE50"` (flat ₹50, minimum fare ₹200)

Only the promo fields of each vehicle are shown here; every other ETA-01 field is unchanged.

```json
{
  "success": true,
  "message": "OK",
  "enabled_dispatch_type": { "ondemand": true, "bidding": false, "shared": false },
  "data": [
    { "zone_type_id": "zt_1", "type_id": "vt_1", "name": "Bike", "subtotal": 49, "total": 49, "min_amount": 49, "has_discount": false, "discount_total": 0, "promo_discount": 0, "promo_code": "", "promocode_id": "", "promo_applied": false, "promo_message": "Add ₹151 more to use SAVE50", "is_default": true },
    { "zone_type_id": "zt_2", "type_id": "vt_2", "name": "Auto", "subtotal": 113, "total": 113, "min_amount": 113, "has_discount": false, "discount_total": 0, "promo_discount": 0, "promo_code": "", "promocode_id": "", "promo_applied": false, "promo_message": "Add ₹87 more to use SAVE50", "is_default": false },
    { "zone_type_id": "zt_3", "type_id": "vt_3", "name": "Hatchback", "subtotal": 143, "total": 143, "min_amount": 143, "has_discount": false, "discount_total": 0, "promo_discount": 0, "promo_code": "", "promocode_id": "", "promo_applied": false, "promo_message": "Add ₹57 more to use SAVE50", "is_default": false },
    { "zone_type_id": "zt_4", "type_id": "vt_4", "name": "Sedan", "subtotal": 148, "total": 148, "min_amount": 148, "has_discount": false, "discount_total": 0, "promo_discount": 0, "promo_code": "", "promocode_id": "", "promo_applied": false, "promo_message": "Add ₹52 more to use SAVE50", "is_default": false },
    { "zone_type_id": "zt_5", "type_id": "vt_5", "name": "SUV", "subtotal": 205, "total": 155, "min_amount": 155, "has_discount": true, "discount_total": 50, "promo_discount": 50, "promo_code": "SAVE50", "promocode_id": "promo_1", "promo_applied": true, "promo_message": "", "is_default": false },
    { "zone_type_id": "zt_6", "type_id": "vt_6", "name": "Premium", "subtotal": 313, "total": 263, "min_amount": 263, "has_discount": true, "discount_total": 50, "promo_discount": 50, "promo_code": "SAVE50", "promocode_id": "promo_1", "promo_applied": true, "promo_message": "", "is_default": false }
  ]
}
```

One full vehicle item (SUV) with every field:

```json
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
  "subtotal": 205,
  "total": 155,
  "min_amount": 155,
  "currency": "INR",
  "unit_in_words": "KM",
  "is_default": false,
  "dispatch_type": "normal",
  "enable_bidding": false,
  "enable_shared_ride": false,
  "seats_taken": 1,
  "has_discount": true,
  "discount_total": 50,
  "promo_discount": 50,
  "promo_code": "SAVE50",
  "promo_applied": true,
  "promo_message": "",
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
  "promocode_id": "promo_1",
  "user_wallet_balance": 0,
  "preference": []
}
```

### 200 — `promo_code: "RIDE20"` (20 %, max ₹100, minimum fare ₹100)

Bike is below ₹100; Auto gets 20 % of ₹113 = ₹22.6, rounded to ₹23.

```json
[
  { "name": "Bike", "subtotal": 49, "total": 49, "promo_discount": 0, "promo_code": "", "promocode_id": "", "promo_applied": false, "promo_message": "Add ₹51 more to use RIDE20" },
  { "name": "Auto", "subtotal": 113, "total": 90, "promo_discount": 23, "promo_code": "RIDE20", "promocode_id": "promo_2", "promo_applied": true, "promo_message": "" }
]
```

### Errors (all 422)

| Case | Response |
|---|---|
| Unknown or switched-off code (`NOPE`) | `{ "success": false, "message": "invalid_promo_code", "data": { "errors": { "promo_code": "This promo code is not valid" } } }` |
| Code made for another module or zone (`PARCEL30` on One Way) | `{ "success": false, "message": "invalid_promo_code", "data": { "errors": { "promo_code": "This promo code is not valid for this ride" } } }` |
| Past its end date | `{ "success": false, "message": "promo_expired", "data": { "errors": { "promo_code": "This promo code has expired" } } }` |
| Before its start date | `promo_expired` with `"This promo code is not active yet"` |
| User already used it `uses_per_user` times | `{ "success": false, "message": "promo_usage_limit", "data": { "errors": { "promo_code": "You have already used this promo code" } } }` |
| Overall limit reached | `promo_usage_limit` with `"This promo code has reached its limit"` |
| No vehicle reaches the minimum fare (₹500 coupon on an 8.5 km trip) | `{ "success": false, "message": "promo_min_fare_not_met", "data": { "minimum_trip_amount": 500, "errors": { "promo_code": "This promo code needs a fare of at least ₹500" } } }` |
| Code longer than 20 characters | `validation_error` with `errors.promo_code` |

On any promo error the app should keep the last good ETA (without a promo) and show `data.errors.promo_code` under the code field.

A use is counted only when a booking with the code is **not** cancelled. Cancelled bookings and bookings where no driver was found do not use up the coupon.

---

## BOOK-01

BOOK-01 takes the same `promo_code` and `promocode_id`, and `request_eta_amount` = the vehicle's `total` from this ETA. The server checks the code again with the same rules and saves the discount on the booking. The app never sends a discount; the amount is only compared, and a different fare returns `409 fare_changed`. See [booking-api.md](booking-api.md).
