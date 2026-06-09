# TinkerBell Garden

Full-stack web app for the TinkerBell Garden children play center management system.

## Implemented Modules

- Customer portal: park information, ticket prices, facilities, event listing, online event booking, VIP registration.
- Staff authentication: Manager and Cashier login with signed tokens.
- Cashier module: ticket sale, check-in, paid service add-ons, active sessions, checkout, overtime fee calculation, invoice creation.
- VIP module: register/renew membership, annual fee tracking, points and accumulated play hours.
- Facility module: manage play zones, operating status, asset status, capacity.
- Paid services module: manage extra services such as statue painting, painting sheets, game tickets and stock.
- Event module: campaign CRUD, booking list, QR/payment/check-in status.
- Reports: visitor statistics and revenue split by ticket, overtime, paid services, VIP and event bookings.

## Run With Docker

```powershell
docker compose up -d --build
```

Open:

- Web app: http://localhost:5173
- API health: http://localhost:5000/api/health

The MySQL container is internal to Docker Compose, so it does not conflict with a local MySQL service on port `3306`.

## Seed Accounts

- Manager: `admin` / `Admin@123`
- Cashier: `cashier` / `Cashier@123`
- Customer: `parent@example.com` / `Customer@123`

Change `JWT_SECRET`, database password and these seed passwords before production deployment.

## Local Development

Server:

```powershell
cd server
npm install
npm run dev
```

Client:

```powershell
cd client
npm install
npm run dev
```

For local development without Docker, import `server/database.sql` into MySQL and update `server/.env`.

## Email

Event booking writes every confirmation to `EmailOutbox`. To send real email, configure:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Without SMTP values, bookings still work and email records are stored with `PendingConfiguration`.

## Verification

Current verified commands:

```powershell
cd client
npm run lint
npm run build

cd ../server
Get-ChildItem src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Docker build and runtime smoke tests were also run against `http://localhost:5173` and `http://localhost:5000/api/health`.
