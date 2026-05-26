# Booking-web

Booking application with a React frontend and a modular TypeScript backend. The current production flow requires a real Square payment before a booking request can be saved.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create your `.env` file from the example and fill in production-safe values:

```bash
copy .env.example .env
```

Important variables:

- `SITE_URL`: public HTTPS domain used for SEO, sitemap, and canonical URLs
- `DATA_ENCRYPTION_KEY`: at least 32 random characters for customer-field encryption and encrypted backups
- `ADMIN_PASSWORD`: strong unique admin password
- `SQUARE_ENVIRONMENT`: `sandbox` or `production`
- `SQUARE_ACCESS_TOKEN`: Square access token
- `SQUARE_APP_ID`: application ID for the Web Payments SDK
- `SQUARE_LOCATION_ID`: location ID where the charge will be registered
- `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile anti-bot protection

If you do not fill in the Square variables and the booking fee is still enabled in the admin panel, the site disables online booking until Square is configured.

3. Start the server:

```bash
npm start
```

4. Open in your browser:

```text
http://localhost:3000
```

## Structure

- `frontend/`: public frontend with React + Vite
- `public/`: static login and shared assets
- `server/`: backend configuration, database, and services
- `server.ts`: main server bootstrap
- `data/production.sqlite`: local SQLite database, ignored by git
- `.env` and `.env.example`: variables required for local development

## Square

When Square is configured:

- The frontend loads the Square Web Payments SDK according to the configured environment.
- The form tokenizes the card in the browser.
- The backend charges the configured booking fee and then saves the appointment.
- The admin panel shows payment status, amount, and `square_payment_id`.

## Production safety

- Production startup is blocked if Square is not configured, the admin password is weak, or `DATA_ENCRYPTION_KEY` is missing.
- Customer name, phone, email, and vehicle details are encrypted in SQLite when `DATA_ENCRYPTION_KEY` is set.
- Database backups are encrypted by default with `npm run backup:db`.
- The admin dashboard is not served unless a valid admin session exists.

## Deploy on Render

Use the included `render.yaml` Blueprint for Render. It creates one Node web service with a persistent disk mounted at `/var/data`, and the app stores SQLite data at `/var/data/production.sqlite`.

See `RENDER_DEPLOY.md` for the exact environment variables and launch checks.

## Pricing

- Public prices are served from the `service_pricing` table.
- The admin can edit the name, description, price, order, and visibility of each service.
- Exactly one service must be marked as `Required booking fee`; that amount is what gets charged to complete a booking.
