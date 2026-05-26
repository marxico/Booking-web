# Render deploy

This app is ready to deploy as a Render Blueprint from `render.yaml`.

## Recommended setup

1. Push this repository to GitHub.
2. In Render, create a new Blueprint and select this repository.
3. Use the `main` branch.
4. Before the first deploy, fill the secret environment variables that are marked `sync: false` in `render.yaml`.

Required production values:

- `SITE_URL`: the public Render URL or your custom domain, for example `https://lawson-booking.onrender.com`
- `ADMIN_EMAIL`: the first admin account email
- `SQUARE_ACCESS_TOKEN`: production Square access token
- `SQUARE_APP_ID`: production Square application ID
- `SQUARE_LOCATION_ID`: production Square location ID
- `TURNSTILE_SITE_KEY`: Cloudflare Turnstile site key
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key

Optional:

- `GOOGLE_CLIENT_ID`: enables Google admin login when configured

Render will generate:

- `ADMIN_PASSWORD`
- `DATA_ENCRYPTION_KEY`

Save the generated `ADMIN_PASSWORD` from the Render dashboard before handing the site to the admin team.

## Database

The app uses SQLite at:

```text
/opt/render/project/src/data/production.sqlite
```

The Render service mounts a persistent disk at `/opt/render/project/src/data`, so appointments and admin/pricing data survive deploys and restarts. Do not remove the disk after launch unless you have a verified backup.

For a temporary free test without a persistent disk, this same path is writable but ephemeral. Any bookings can disappear after restarts or redeploys, so use it only for testing.

## Commands

Render uses:

```bash
npm run render:build
npm start
```

`render:build` installs dev dependencies for TypeScript/Vite, rebuilds the native `sqlite3` module from source on Render's Linux image, and then builds the frontend.

Health check:

```text
/healthz
```

## Important launch checks

- Confirm `/healthz` returns `ok: true`.
- Confirm the public booking page loads with the Render/custom domain.
- Confirm Square production payment opens and completes a test booking.
- Confirm `/admin` redirects to `/lawson-portal` when logged out.
- Confirm the admin dashboard loads after login.
- Confirm the first booking appears in the admin dashboard.
