# Atelier Nigeria

Multivendor handcraft marketplace for Nigerian artisans — Next.js storefront + Laravel API.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, Zustand, TanStack Query
- **Backend:** Laravel REST API in `backend/`
- **Payments:** Paystack (split / subaccounts) with demo fallback when keys are missing
- **Database (local):** SQLite by default

## Quick start

### Frontend

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run dev` / `build` use Webpack (`--webpack`) for Windows compatibility.

Set `NEXT_PUBLIC_USE_DEMO=true` in `.env.local` to run the storefront on local demo data without the API. With `false` (default after setup), pages load from the Laravel API.

### Backend

```bash
cd backend
composer install
cp .env.example .env   # if needed
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan serve
```

API base: `http://localhost:8000/api/v1`

### Demo accounts (after seeding)

| Role     | Email                 | Password  |
|----------|-----------------------|-----------|
| Customer | customer@atelier.ng   | password  |
| Vendor   | vendor@atelier.ng     | password  |
| Admin    | admin@atelier.ng      | password  |

## Brand

- White / Black / Deep Burgundy `#5C0A14` / Crimson `#E0313A`
- Display: Fraunces · UI: Inter
- Logos in `public/brand/`

## Paystack

Set in `backend/.env`:

```
PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_SECRET_KEY=sk_test_xxx
FRONTEND_URL=http://localhost:3000
```

Without keys, checkout runs in demo mode and still creates orders.
