# Atelier Nigeria

Multivendor marketplace for Nigerian makers — a Jumia-style Next.js storefront, customer account,
Seller Center and admin console on top of a Laravel REST API.

## Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, TanStack Query, Zustand, Embla
- **Backend:** Laravel 13 REST API in `backend/` (`/api/v1`)
- **Payments:** Paystack redirect checkout (+ split payments for single-seller orders)
- **Database (local):** SQLite by default
- **Tests:** PHPUnit (backend) and Vitest + Testing Library (frontend)

## Quick start

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan storage:link   # optional: uploads are also served by a fallback route
php artisan serve          # http://127.0.0.1:8000
```

For local checkout without Paystack keys, set `PAYSTACK_DEMO=true` in `backend/.env`
(it is ignored when `APP_ENV=production`).

Run the scheduler so unpaid checkouts release their stock and sponsored ads are billed:

```bash
php artisan schedule:work          # local
# production cron: * * * * * cd /path/to/backend && php artisan schedule:run
```

### Frontend

```bash
npm install
cp .env.example .env.local
npm run dev                         # http://localhost:3000
```

`npm run dev` / `build` use Webpack (`--webpack`) for Windows compatibility.

### Tests

```bash
npm run test:backend   # PHPUnit
npm test               # Vitest
npm run lint
npx tsc --noEmit
```

### Demo accounts (after seeding)

| Role     | Email                                  | Password  |
|----------|----------------------------------------|-----------|
| Customer | customer@atelier.ng                    | password  |
| Seller   | vendor1@atelier.ng … vendor8@atelier.ng | password  |
| Admin    | admin@atelier.ng                       | password  |

Demo vouchers: `WELCOME10` (first order, 10% off up to ₦5,000) and `FREESHIP` (free delivery over ₦50,000).

## What's where

| Area | Routes | Notes |
|------|--------|-------|
| Storefront | `/`, `/shop`, `/category/[slug]`, `/product/[slug]`, `/makers/[slug]`, `/cart`, `/checkout` | Filters with facet counts, flash sales, server-priced cart, vouchers |
| Customer | `/account/*` | Orders & tracking, cancel, returns, inbox, reviews, vouchers, saved items, addresses |
| Seller Center | `/vendor/*` | Dashboard, order fulfilment, full product editor with variants, inventory, promotions, ads, returns, reviews, payouts |
| Admin | `/admin/*` | Moderation, users, orders & refunds, returns, categories, brands, vouchers, banners, payouts, support inbox, audit log |
| Help & policies | `/help`, `/returns`, `/shipping`, `/terms`, `/privacy`, `/contact` | Terms and privacy are templates — have them reviewed |

## Key business rules

- **Orders** are split into one package per seller. Package status only moves forward
  (`paid → processing → shipped → delivered`, or `cancelled` before shipping, `returned` after delivery).
  Sellers only see paid orders.
- **Stock** is reserved at checkout and released if payment fails or isn't completed within 30 minutes.
- **Payments** are verified for owner, amount and currency before an order is marked paid.
- **Returns:** 7 days after delivery, with photos for damage claims. Seller approves/declines; customers can
  escalate to admin. Received returns create a refund due and are deducted from the seller's next statement.
- **Vouchers** are platform-funded — the seller's earning is unchanged.
- **Payouts:** delivered earnings minus commission, ad fees and returns are paid weekly by admin
  ("Close this week" → transfer → record reference).
- **Moderation:** new products and content changes to live products are reviewed; price/stock edits go live instantly.
- **Accounts:** per-device login tokens (hashed, 30-day expiry), email verification, rate-limited sign-in.

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

Webhook URL: `{APP_URL}/api/v1/webhooks/paystack`.

Note: automatic split payments use the seller's Paystack sub-account. Sub-account creation currently
sends the bank **name**; Paystack expects a bank **code**, so in live mode sellers are paid through the
weekly statements until bank codes are wired in.
