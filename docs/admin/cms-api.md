# Admin — Content (pages, FAQs, support contacts)

**Audience:** Admin panel (`/admin/content`)
**Base URL:** `https://outdrivebackend.cyberimpulses.com/api/v1/admin/cms`
**Swagger:** `/api-docs` → section **Admin content**
**App side:** [docs/user/cms-api.md](../user/cms-api.md)

Every example is a **real response** captured from the API. Only the host was changed to the live domain, and long `content` values are shortened with `…`.

| | |
|---|---|
| Auth | `Authorization: Bearer <admin access_token>` |
| View (`GET`) | All roles: `super_admin`, `operations`, `support` |
| Changes (all `POST`) | `super_admin`, `operations`. `support` gets `403 admin_forbidden` |
| Body | JSON |
| Errors | `{ "success": false, "message": "error_key", "data": { "errors": { "<field>": "..." } } }` |

## Tables

| Table | What it holds |
|---|---|
| `tbl_cms_pages` | Rich-text pages. `slug` is unique and **locked after create**; `content` is sanitized HTML; `audience` all/user/driver; `status` published/draft; `sort_order`; `updated_by` → `tbl_admins` |
| `tbl_faqs` | `question`, `answer` (plain text), `category`, `audience`, `status` published/draft, `sort_order` |
| `tbl_support_contacts` | `type` phone/whatsapp/email/address/website/hours, `label`, `value`, `audience`, `status` active/inactive, `sort_order` |

The same six routes exist for each resource:

| Route | Pages | FAQs | Support contacts |
|---|---|---|---|
| `GET /` | list + stats | list + stats | list + stats |
| `POST /` | `page_created` (201) | `faq_created` (201) | `support_contact_created` (201) |
| `POST /{id}/update` | `page_updated` | `faq_updated` | `support_contact_updated` |
| `POST /{id}/status` | `page_status_updated` | `faq_status_updated` | `support_contact_status_updated` |
| `POST /reorder` | `pages_reordered` | `faqs_reordered` | `support_contacts_reordered` |
| `POST /{id}/delete` | `page_deleted` | `faq_deleted` | `support_contact_deleted` |

Prefixes: `/admin/cms/pages`, `/admin/cms/faqs`, `/admin/cms/support-contacts`. `reorder` takes `{ "ids": [...] }` listing **every** row once, in the new order.

---

## Pages

### Fields

| Field | Rule |
|---|---|
| `title` | Required on create; 2–120 characters |
| `slug` | Create only. Optional; it is made from the title when empty (`Safety Guidelines` → `safety-guidelines`). Lowercase `a-z 0-9 -`, max 80. `faq` and `help-and-support` are reserved. Sending it on update returns `422 page_slug_locked` |
| `content` | Required on create; HTML from the editor. Sanitized on save: scripts, event handlers, `javascript:` links, images and inline styles are removed, `h1` becomes `h2`, empty paragraphs are dropped. Max 200 000 characters. Empty after sanitizing → `422` |
| `audience` | `all` (default), `user`, `driver` |
| `status` | `draft` (default) or `published`. Drafts return 404 to the apps |

### GET /admin/cms/pages

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "stats": { "total": 6, "published": 6, "draft": 0 },
    "built_in": [
      { "slug": "faq", "title": "FAQs", "url": "https://outdrivebackend.cyberimpulses.com/pages/faq" },
      { "slug": "help-and-support", "title": "Help & Support", "url": "https://outdrivebackend.cyberimpulses.com/pages/help-and-support" }
    ],
    "pages": [
      { "id": 3, "title": "Privacy Policy", "slug": "privacy-policy", "content": "<p>This policy explains what information OutDrive collects, why, and the choices…", "audience": "all", "status": "published", "sort_order": 3, "url": "https://outdrivebackend.cyberimpulses.com/pages/privacy-policy", "updated_at": "2026-10-23T11:42:13.000Z", "updated_by": null }
    ]
  }
}
```

`updated_by` is `null` for seeded pages; after an admin edit it is `{ "id": 49, "name": "Rajesh Admin" }`.

### POST /admin/cms/pages → 201

```json
{ "title": "Safety Guidelines", "content": "<h2>Before the ride</h2><p>Match the <strong>vehicle number</strong> and share the OTP only with your driver.</p><script>alert(1)</script>", "audience": "user", "status": "draft" }
```

```json
{
  "success": true,
  "message": "page_created",
  "data": {
    "page": {
      "id": 11, "title": "Safety Guidelines", "slug": "safety-guidelines",
      "content": "<h2>Before the ride</h2><p>Match the <strong>vehicle number</strong> and share the OTP only with your driver.</p>",
      "audience": "user", "status": "draft", "sort_order": 7,
      "url": "https://outdrivebackend.cyberimpulses.com/pages/safety-guidelines",
      "updated_at": "2026-10-23T11:52:11.000Z", "updated_by": { "id": 49, "name": "Rajesh Admin" }
    }
  }
}
```

The `<script>` was removed. New pages go to the end of the list.

### POST /admin/cms/pages/{id}/update

Send only what changes: `title`, `content`, `audience`, `status`. The response is `page_updated` with the same `page` object.

### POST /admin/cms/pages/{id}/status

```json
{ "status": "published" }
```

Response: `page_status_updated` with `page.status: "published"`.

### Page errors

| Case | Status | Response |
|---|---|---|
| Slug sent on update | 422 | `{ "message": "page_slug_locked", "data": { "errors": { "slug": "the slug is part of the app URL and cannot be changed" } } }` |
| Slug already used (here: title "Privacy Policy") | 409 | `{ "message": "page_slug_exists", "data": { "errors": { "slug": "another page already uses this slug" } } }` |
| Empty content (`<p> </p>`) | 422 | `{ "message": "validation_error", "data": { "errors": { "content": "content is required" } } }` |
| Unknown id | 404 | `page_not_found` |

### POST /admin/cms/pages/{id}/delete

```json
{ "success": true, "message": "page_deleted", "data": { "id": 11 } }
```

---

## FAQs

| Field | Rule |
|---|---|
| `question` | 5–255 characters |
| `answer` | 1–5000 characters, **plain text** (HTML is shown as text; line breaks are kept) |
| `category` | Max 60, default `General`. The FAQ page groups by category in list order |
| `audience` | `all`, `user`, `driver` |
| `status` | `published` (default) or `draft` |

### GET /admin/cms/faqs

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "stats": { "total": 9, "published": 9, "categories": 4 },
    "url": "https://outdrivebackend.cyberimpulses.com/pages/faq",
    "faqs": [
      { "id": 1, "question": "How do I book a ride?", "answer": "Open the app, choose a service such as One Way, set your pickup and drop, pick a vehicle and tap Book. You will see the fare before you confirm.", "category": "Booking", "audience": "user", "status": "published", "sort_order": 1, "updated_at": "2026-10-23T11:44:00.000Z" }
    ]
  }
}
```

### POST /admin/cms/faqs → 201

```json
{ "question": "How do I change my pickup point?", "answer": "Before the driver arrives, tap the pickup address on the trip screen and move the pin.", "category": "Booking", "audience": "user", "status": "published" }
```

```json
{
  "success": true,
  "message": "faq_created",
  "data": { "faq": { "id": 11, "question": "How do I change my pickup point?", "answer": "Before the driver arrives, tap the pickup address on the trip screen and move the pin.", "category": "Booking", "audience": "user", "status": "published", "sort_order": 10, "updated_at": "2026-10-23T11:52:11.599Z" } }
}
```

- **Update:** `{ "category": "Trips" }` returns `faq_updated` with `category: "Trips"`.
- **Status:** `{ "status": "draft" }` returns `faq_status_updated`.
- **Delete:** returns `faq_deleted`, `{ "id": 11 }`.
- **Validation:** `{ "question": "Hi?", "answer": "" }` returns 422 with `{ "errors": { "question": "question must be between 5 and 255 characters" } }`.
- **Unknown id:** returns 404 `faq_not_found`.

---

## Support contacts

| Field | Rule |
|---|---|
| `type` | `phone`, `whatsapp`, `email`, `address`, `website`, `hours` |
| `label` | 1–60 characters, e.g. "Customer care" |
| `value` | Checked against `type`. Phone and WhatsApp need 10–15 digits (a 10-digit number gets `91` added in the link). Email must be valid. Website must be `http(s)://`. When `type` changes on update, the stored value is checked again |
| `audience` | `all`, `user`, `driver` |
| `status` | `active` (default) or `inactive` |

### GET /admin/cms/support-contacts

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "stats": { "total": 5, "active": 2 },
    "url": "https://outdrivebackend.cyberimpulses.com/pages/help-and-support",
    "contacts": [
      { "id": 1, "type": "email", "label": "Email support", "value": "support@outdrive.app", "action_url": "mailto:support@outdrive.app", "audience": "all", "status": "active", "sort_order": 1, "updated_at": "2026-10-23T11:42:13.000Z" },
      { "id": 2, "type": "address", "label": "Office", "value": "Indore, Madhya Pradesh, India", "action_url": "https://www.google.com/maps/search/?api=1&query=Indore%2C%20Madhya%20Pradesh%2C%20India", "audience": "all", "status": "active", "sort_order": 2, "updated_at": "2026-10-23T11:42:13.000Z" },
      { "id": 3, "type": "phone", "label": "Customer care", "value": "+91 90000 00000", "action_url": "tel:+919000000000", "audience": "all", "status": "inactive", "sort_order": 3, "updated_at": "2026-10-23T11:42:13.000Z" }
    ]
  }
}
```

### POST /admin/cms/support-contacts → 201

```json
{ "type": "whatsapp", "label": "Driver helpline", "value": "+91 98765 43210", "audience": "driver", "status": "active" }
```

```json
{
  "success": true,
  "message": "support_contact_created",
  "data": { "contact": { "id": 7, "type": "whatsapp", "label": "Driver helpline", "value": "+91 98765 43210", "action_url": "https://wa.me/919876543210", "audience": "driver", "status": "active", "sort_order": 6, "updated_at": "2026-10-23T11:52:11.642Z" } }
}
```

- **Update:** `{ "type": "phone" }` returns `support_contact_updated` with `action_url: "tel:+919876543210"`.
- **Status:** `{ "status": "inactive" }` returns `support_contact_status_updated`.
- **Delete:** returns `support_contact_deleted`, `{ "id": 7 }`.
- **Bad value:** `{ "type": "email", "value": "not-an-email" }` returns 422 with `{ "errors": { "value": "enter a valid email address" } }`.
- **Unknown id:** returns 404 `support_contact_not_found`.

---

## Seed data (`npm run db:seed`)

| What | Seeded | On later runs |
|---|---|---|
| Pages | about-us, terms-and-conditions, privacy-policy, refund-policy, cancellation-policy, driver-terms (published) | Only missing slugs are added. Edits and deletes stay |
| FAQs | 9 rider FAQs (Booking, Payments, Parcel, Account) | Only when the table is empty |
| Contacts | Email + office **active**; phone, WhatsApp, hours **inactive** placeholders | Only when the table is empty |

> The legal texts (Terms, Privacy, Refund, Cancellation, Driver Terms) are starter drafts. Have them reviewed before launch, and enter the real phone and WhatsApp numbers in admin.
