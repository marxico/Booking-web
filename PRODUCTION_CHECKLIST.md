# Production Checklist

## Required secrets

Set these in `.env` on the production server. Do not commit `.env`.

```env
NODE_ENV=production
PORT=3000
SITE_URL=https://lawsonmobilemechanic.com
DB_PATH=data/production.sqlite
DATA_ENCRYPTION_KEY=replace-with-at-least-32-random-characters
ADMIN_PASSWORD=replace-with-a-long-unique-password
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=replace-with-live-square-token
SQUARE_APP_ID=replace-with-live-square-app-id
SQUARE_LOCATION_ID=replace-with-live-square-location-id
SQUARE_CURRENCY=USD
TURNSTILE_SITE_KEY=replace-with-cloudflare-turnstile-site-key
TURNSTILE_SECRET_KEY=replace-with-cloudflare-turnstile-secret-key
```

The server intentionally refuses to start in production if the admin password is weak, Square is not configured, or `DATA_ENCRYPTION_KEY` is missing.

## Before going live

1. Run `npm.cmd run build`.
2. Run `npm.cmd run production:check`.
3. Run `npm.cmd start` locally and check `/healthz`.
4. Confirm `/square/config` returns `"paymentMode":"square"` and `"enabled":true`.
5. Submit one real booking with a real Square payment.
6. Log in to `/lawson-portal` and confirm the booking appears in `/admin/operations/requests`.
7. Run `npm.cmd run backup:db` and verify an encrypted `.sqlite.enc` file is created in `backups/`.
8. Put the app behind HTTPS using Caddy, Nginx, Cloudflare Tunnel, or your host's managed TLS.
9. Confirm `/sitemap.xml` uses the public domain from `SITE_URL`.
10. Submit `/sitemap.xml` in Google Search Console.
11. Set up an automated daily backup of `data/production.sqlite`.

Restore an encrypted backup to a separate file before replacing production data:

```powershell
npm.cmd run restore:db -- -EncryptedBackupPath backups/production-YYYYMMDD-HHMMSS.sqlite.enc -OutputPath data/restored-production.sqlite
```

## Docker

Use Docker on a VPS or server when you want repeatable deploys and automatic restarts:

```powershell
docker compose up -d --build
```

The compose file persists the SQLite DB in the `booking_data` volume.

## Sources

Cloudflare Turnstile requires server-side validation of generated tokens via the Siteverify endpoint:
https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
