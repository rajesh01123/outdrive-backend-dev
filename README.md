# OutDrive Backend

Node.js ES modules, Express, MySQL and Sequelize backend for the OutDrive mobile-only customer authentication flow. Every application table is prefixed with `tbl_`.

## Setup

```powershell
Copy-Item .env.example .env
npm.cmd install --cache .npm-cache
npm.cmd run db:migrate
npm.cmd run dev
```

Set `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, and `OTP_TOKEN_SECRET` in `.env` before starting. The database itself must already exist. For development, OTP is `123456` by default; in production a configured SMS adapter is mandatory and fixed OTPs are disabled.

To create the initial admin after migrations:

```powershell
$env:ADMIN_EMAIL = 'admin@example.com'
$env:ADMIN_PASSWORD = 'use-a-strong-password'
npm.cmd run db:seed
```

## API prefix

`/api/v1`

## Interactive API documentation

After the server starts, use [Swagger UI](http://localhost:3113/api-docs) to try every implemented user API. The raw OpenAPI document is available at `GET /api-docs.json`.

Module documentation is stored beside its audience, so new booking or driver APIs can update only their relevant document:

- [User authentication APIs](docs/user/auth-api.md)
- [User profile APIs](docs/user/profile-api.md)
- [Driver API documentation](docs/driver/README.md) — no driver endpoint exists yet

Admin APIs are also available in Swagger under the **Admin auth** tag. They provide profile updates, password reset/change, email-based 2FA, and a one-active-device login policy.

| Method | URL | Access |
| --- | --- | --- |
| POST | `/auth/validate-mobile` | Public |
| POST | `/auth/send-otp` | Public |
| POST | `/auth/verify-otp` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/register` | Public; JSON or multipart |
| POST | `/user/profile` | Bearer; multipart supported |
| GET | `/user` | Bearer |
| POST | `/auth/logout` | Bearer |
| POST | `/user/delete-account` | Bearer |

`/auth/social` is deliberately absent; it remains a future-phase endpoint.

## Tables

Required customer auth tables: `tbl_users`, `tbl_otp_verifications`, `tbl_user_sessions`, and `tbl_devices`.

Prepared for later modules: `tbl_admins`, `tbl_drivers`, and `tbl_migrations`.

## Important behavior

- Only country code `91`, 10-digit mobile numbers, and `android`/`ios` clients are accepted.
- OTP is hashed, expires after five minutes, has a 30-second resend cooldown, a daily cap, and five maximum attempts.
- New users must register with a name; login only works for existing active users.
- Logout revokes the selected device's session. Account deletion soft-deletes the user and revokes every session.
- `profile_picture` accepts JPEG, PNG, or WebP files up to 5 MB and is served from `/uploads/profiles`.
