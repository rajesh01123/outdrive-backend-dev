# Apps — Content pages (WebView) · FAQs · Help & Support

**Audience:** Flutter rider app and driver app
**Page base URL:** `https://outdrivebackend.cyberimpulses.com/pages/<slug>` (local: `http://localhost:3113/pages/<slug>`)
**API base URL:** `https://outdrivebackend.cyberimpulses.com/api/v1`
**Swagger:** `/api-docs` → section **Content (app)**

All content is edited in **admin → Content**. The app should not hard-code page URLs: it calls `GET /common/pages` and builds its menu from the list.

Every JSON example below is a **real response** captured from the API. Only the host was changed from `localhost:3113` to the live domain.

| | |
|---|---|
| Envelope | `{ "success": true, "message": "machine_readable", "data": ... }` |
| Auth | None. All CMS endpoints and pages are public |
| `audience` query | `user` (rider app, default) or `driver` (driver app). Anything else returns `422 validation_error` |

## Flow

```
Profile / menu screen → GET /common/pages?audience=user   (menu: title + url)
Tap an item           → open item.url in a WebView        (add ?theme=dark / ?header=0 if needed)
Native screens (opt.) → GET /common/faqs, GET /common/support-contacts
```

---

## WebView page URLs

| Page | URL |
|---|---|
| About Us | `https://outdrivebackend.cyberimpulses.com/pages/about-us` |
| Terms & Conditions | `https://outdrivebackend.cyberimpulses.com/pages/terms-and-conditions` |
| Privacy Policy | `https://outdrivebackend.cyberimpulses.com/pages/privacy-policy` |
| Refund Policy (rider) | `https://outdrivebackend.cyberimpulses.com/pages/refund-policy` |
| Cancellation Policy (rider) | `https://outdrivebackend.cyberimpulses.com/pages/cancellation-policy` |
| Driver Terms (driver) | `https://outdrivebackend.cyberimpulses.com/pages/driver-terms` |
| FAQs | `https://outdrivebackend.cyberimpulses.com/pages/faq` |
| Help & Support | `https://outdrivebackend.cyberimpulses.com/pages/help-and-support` |

Pages that an admin adds later get their own `/pages/<slug>` URL and appear in `GET /common/pages` automatically.

### Query options (on any page)

| Query | Effect |
|---|---|
| `theme=dark` | Dark colours (default is light) |
| `header=0` | Hides the page title bar. Use this when the app shows its own AppBar |
| `audience=driver` | Only on `/pages/faq` and `/pages/help-and-support`: shows the driver FAQs and contacts. Default is the rider app |

Example: `https://outdrivebackend.cyberimpulses.com/pages/privacy-policy?theme=dark&header=0`

### Page behaviour

- Fully server-rendered HTML with no JavaScript, built mobile-first.
- `200`: the page. `404`: the slug does not exist **or** the page is a draft. A small "Page not found" HTML page is returned, so the WebView never stays blank.
- Headers: `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; base-uri 'none'; form-action 'none'` and `Cache-Control: public, max-age=60`. Edits in admin appear within about a minute.
- Links inside pages: `tel:`, `mailto:`, `https://wa.me/...` and map links. **Flutter:** in the WebView's `NavigationDelegate`, open any non-`http(s)` URL (and `wa.me` / Google Maps) with `url_launcher` instead of loading it in the WebView.

---

## CMS-01 — List pages (app menu)

`GET /common/pages?audience=user` · no auth

Returns published pages for that app, in admin order, plus the two built-in pages (`faq`, `help-and-support`) at the end. Pages marked "Rider app only" are not shown to the driver app, and pages marked "Driver app only" are not shown to the rider app.

| `type` | Meaning |
|---|---|
| `page` | Rich-text page written in admin |
| `faq` | The FAQ page (built from admin → Content → FAQs) |
| `support` | The Help & Support page (built from admin → Content → Support contacts) |

### 200 — rider app

```json
{
  "success": true,
  "message": "OK",
  "data": [
    { "slug": "about-us", "title": "About Us", "type": "page", "url": "https://outdrivebackend.cyberimpulses.com/pages/about-us", "updated_at": "2026-10-23T11:42:13.000Z" },
    { "slug": "terms-and-conditions", "title": "Terms & Conditions", "type": "page", "url": "https://outdrivebackend.cyberimpulses.com/pages/terms-and-conditions", "updated_at": "2026-10-23T11:42:13.000Z" },
    { "slug": "privacy-policy", "title": "Privacy Policy", "type": "page", "url": "https://outdrivebackend.cyberimpulses.com/pages/privacy-policy", "updated_at": "2026-10-23T11:42:13.000Z" },
    { "slug": "refund-policy", "title": "Refund Policy", "type": "page", "url": "https://outdrivebackend.cyberimpulses.com/pages/refund-policy", "updated_at": "2026-10-23T11:42:13.000Z" },
    { "slug": "cancellation-policy", "title": "Cancellation Policy", "type": "page", "url": "https://outdrivebackend.cyberimpulses.com/pages/cancellation-policy", "updated_at": "2026-10-23T11:42:13.000Z" },
    { "slug": "faq", "title": "FAQs", "type": "faq", "url": "https://outdrivebackend.cyberimpulses.com/pages/faq", "updated_at": "2026-10-23T11:44:00.000Z" },
    { "slug": "help-and-support", "title": "Help & Support", "type": "support", "url": "https://outdrivebackend.cyberimpulses.com/pages/help-and-support", "updated_at": "2026-10-23T11:42:13.000Z" }
  ]
}
```

### 200 — driver app (`?audience=driver`)

```json
{
  "success": true,
  "message": "OK",
  "data": [
    { "slug": "about-us", "title": "About Us", "type": "page", "url": "https://outdrivebackend.cyberimpulses.com/pages/about-us", "updated_at": "2026-10-23T11:42:13.000Z" },
    { "slug": "terms-and-conditions", "title": "Terms & Conditions", "type": "page", "url": "https://outdrivebackend.cyberimpulses.com/pages/terms-and-conditions", "updated_at": "2026-10-23T11:42:13.000Z" },
    { "slug": "privacy-policy", "title": "Privacy Policy", "type": "page", "url": "https://outdrivebackend.cyberimpulses.com/pages/privacy-policy", "updated_at": "2026-10-23T11:42:13.000Z" },
    { "slug": "driver-terms", "title": "Driver Terms", "type": "page", "url": "https://outdrivebackend.cyberimpulses.com/pages/driver-terms", "updated_at": "2026-10-23T11:42:13.000Z" },
    { "slug": "help-and-support", "title": "Help & Support", "type": "support", "url": "https://outdrivebackend.cyberimpulses.com/pages/help-and-support", "updated_at": "2026-10-23T11:42:13.000Z" }
  ]
}
```

There are no driver FAQs yet, so the FAQ entry is left out. It appears automatically once an admin publishes a driver FAQ.

> **For the driver app:** open the built-in URLs with `?audience=driver` added (for example `/pages/help-and-support?audience=driver`).

---

## CMS-02 — One page as JSON

`GET /common/pages/{slug}` · no auth

Use this only to render a page natively instead of in a WebView. `content` is sanitized HTML, limited to `h2`–`h4`, `p`, `strong`, `em`, lists, `blockquote`, `hr`, links and tables.

### 200

`GET /common/pages/refund-policy`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "slug": "refund-policy",
    "title": "Refund Policy",
    "content": "<p>If you were charged incorrectly, we will make it right.</p>\n<h2>When you can get a refund</h2>\n<ul><li>You were charged for a trip or delivery that did not happen.</li><li>You were charged twice for the same booking.</li><li>A cancellation fee was charged when it should not have been.</li></ul>\n<h2>How refunds are paid</h2>\n<p>Approved refunds go back to the original payment method or to your OutDrive wallet. Bank and card refunds can take a few working days to show.</p>\n<h2>How to ask</h2>\n<p>Contact support from <strong>Help &amp; Support</strong> with your booking ID.</p>",
    "url": "https://outdrivebackend.cyberimpulses.com/pages/refund-policy",
    "updated_at": "2026-10-23T11:42:13.000Z"
  }
}
```

### 404 — unknown slug, draft page, or a built-in slug (`faq`, `help-and-support`)

```json
{ "success": false, "message": "page_not_found", "data": {} }
```

---

## CMS-03 — FAQs as JSON

`GET /common/faqs?audience=user` · no auth

Published FAQs in admin order. `answer` is plain text, and `\n` is a line break. Group them by `category` in the order they arrive.

### 200 (first 2 and the last of 9 shown)

```json
{
  "success": true,
  "message": "OK",
  "data": [
    { "id": "faq_1", "question": "How do I book a ride?", "answer": "Open the app, choose a service such as One Way, set your pickup and drop, pick a vehicle and tap Book. You will see the fare before you confirm.", "category": "Booking" },
    { "id": "faq_2", "question": "Can I book a ride for later?", "answer": "Yes. Choose Scheduled on the home screen and pick a time from 30 minutes to 7 days ahead.", "category": "Booking" },
    { "id": "faq_9", "question": "How do I delete my account?", "answer": "Go to Profile → Delete account. You will receive an OTP to confirm. Deleting your account signs you out of every device.", "category": "Account" }
  ]
}
```

### 422 — bad audience

`GET /common/faqs?audience=admin`

```json
{ "success": false, "message": "validation_error", "data": { "errors": { "audience": "audience must be user or driver" } } }
```

---

## CMS-04 — Support contacts as JSON

`GET /common/support-contacts?audience=user` · no auth

Active contacts in admin order. Open `action_url` with `url_launcher`. It is `""` for `hours`, which is text only.

| `type` | `action_url` |
|---|---|
| `phone` | `tel:+91XXXXXXXXXX` |
| `whatsapp` | `https://wa.me/91XXXXXXXXXX` |
| `email` | `mailto:...` |
| `address` | Google Maps search link |
| `website` | The URL itself |
| `hours` | `""` |

### 200

```json
{
  "success": true,
  "message": "OK",
  "data": [
    { "type": "email", "label": "Email support", "value": "support@outdrive.app", "action_url": "mailto:support@outdrive.app" },
    { "type": "address", "label": "Office", "value": "Indore, Madhya Pradesh, India", "action_url": "https://www.google.com/maps/search/?api=1&query=Indore%2C%20Madhya%20Pradesh%2C%20India" }
  ]
}
```

The phone, WhatsApp and support-hours entries are seeded **inactive** with placeholder values. They show up here, and on `/pages/help-and-support`, once an admin enters the real values and switches them on.
