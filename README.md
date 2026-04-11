# Booking-web

Booking application with a React frontend and a modular TypeScript backend. The current flow is set up so an appointment can only be booked after paying the required amount through Square or the mock test mode.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create your `.env` file from the example and fill in the Square credentials:

```bash
copy .env.example .env
```

Important variables:

- `SQUARE_ENVIRONMENT`: `sandbox` or `production`
- `SQUARE_ACCESS_TOKEN`: Square access token
- `SQUARE_APP_ID`: application ID for the Web Payments SDK
- `SQUARE_LOCATION_ID`: location ID where the charge will be registered

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
- `public/`: static admin and shared assets
- `server/`: backend configuration, database, and services
- `server.ts`: main server bootstrap
- `appointments.db`: local SQLite database
- `.env` and `.env.example`: variables required for local development

## Square

When Square is configured:

- The frontend loads the Square Web Payments SDK according to the configured environment.
- The form tokenizes the card in the browser.
- The backend charges the configured booking fee and then saves the appointment.
- The admin panel shows payment status, amount, and `square_payment_id`.

## Pricing

- Public prices are served from the `service_pricing` table.
- The admin can edit the name, description, price, order, and visibility of each service.
- Exactly one service must be marked as `Required booking fee`; that amount is what gets charged to complete a booking.
