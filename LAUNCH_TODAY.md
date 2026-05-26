# Launch Today

## Current blockers

Fill these real values in `.env` before production:

```env
SQUARE_ACCESS_TOKEN=
SQUARE_APP_ID=
SQUARE_LOCATION_ID=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
SITE_URL=https://your-real-domain.com
ADMIN_EMAIL=owner@your-real-domain.com
```

`ADMIN_PASSWORD` and `DATA_ENCRYPTION_KEY` have been generated locally. Store both in a password manager before deploying.

## Final local check

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run production:check
```

The production check must pass before launch.

## Docker launch

```powershell
docker compose up -d --build
docker compose logs -f booking
```

Then verify:

```powershell
curl https://your-real-domain.com/healthz
curl https://your-real-domain.com/square/config
curl https://your-real-domain.com/sitemap.xml
```

Expected:

- `/healthz` returns `ok: true`.
- `/square/config` returns `enabled: true`.
- `/admin` redirects to `/lawson-portal`.
- `/admin/appointments` returns `401` when logged out.

## First live booking test

1. Open the public site.
2. Submit one real booking with a real Square payment.
3. Log in at `/lawson-portal`.
4. Confirm the request appears in `/admin/operations/requests`.
5. Run an encrypted backup:

```powershell
npm.cmd run backup:db
```

## SEO launch

Submit this in Google Search Console:

```text
https://your-real-domain.com/sitemap.xml
```

## Do not deploy if any of these are true

- `.env` still contains `REPLACE_WITH`.
- `npm.cmd run production:check` fails.
- Backups include plain `.sqlite` files.
- The app is not behind HTTPS.
- Square config returns `enabled: false`.
- Turnstile keys are missing.
