# Jumia-grade marketplace: storefront, customer account, Seller Center, admin console and backend hardening

## Why
Atelier's storefront was partly adapted to Jumia's look, but the dashboards were incomplete and the API had serious
correctness and security gaps (sellers could be paid for unpaid orders, vendor bank details were public, payments
weren't amount-checked, stock could oversell). This branch finishes the Jumia-style experience in Atelier's own
colours and makes the backend production-ready.

## What changed (one commit per phase)
- **Backend hardening** — bank details hidden from public payloads; forward-only order status machine (sellers act
  only on paid orders); payment ownership/amount/currency checks; demo payments need `PAYSTACK_DEMO`; stock reserved
  at checkout and released after 30 min; pending/suspended stores can't sell; edited live listings re-moderated;
  returns clawed back on statements; rate limiting; no DB writes on public GETs.
- **Auth** — hashed per-device tokens (30-day expiry), sign out other devices, email verification, 60-min reset
  links, change password, close account; Jumia-style sign-in/register/reset pages; open-redirect fix.
- **Catalogue model & uploads** — brands, SKU, condition, key features, box contents, warranty, dimensions, SEO,
  real variants (price/SKU/stock), soft deletes; image uploads resized to WebP; faceted product API.
- **Storefront** — Jumia-style header (category drawer, live search), home (hero, promo tiles, flash-sale countdown,
  coloured rails), category/search pages with facet filters and pagination, product page (delivery & returns card,
  seller card with follow, specs, verified reviews), server-priced cart, checkout with address book and vouchers,
  help/policy pages, 404/error, sitemap, robots.
- **Customer account** — orders & tracking, cancel, returns with photos and escalation, inbox, pending reviews,
  vouchers, saved items, followed sellers, addresses, account management.
- **Seller Center** — dashboard with sales chart and to-dos, fulfilment with tracking and packing slip, full product
  editor with variants, inventory, promotions, ads, returns, review replies, payouts, store settings, onboarding.
- **Admin console** — users, sellers, product moderation, orders & refunds, returns arbitration, categories, brands,
  vouchers, banners (placement + schedule), reviews, payouts, support inbox, settings, audit log.
- **Seed data & docs** — realistic seed data, README, `.env` examples.

## Testing
- `npm run test:backend` — 146 PHPUnit tests pass
- `npm test` — 53 Vitest tests pass
- `npm run lint` and `npx tsc --noEmit` — clean (baseline had 16 lint errors)
- `npm run build` — succeeds
- Manually checked in the browser: checkout (Paystack demo), My Account, Seller Center, admin console, desktop + mobile.

## Reviewer notes
- **Migrations:** 6 new migrations. The old `users.api_token` column is dropped, so everyone signs in again.
- **New env:** `PAYSTACK_DEMO` (local only, ignored in production). Set up the scheduler
  (`php artisan schedule:run` every minute) and `php artisan storage:link` on the server.
- **Known gap:** Paystack sub-account creation sends the bank name, not the bank code, so automatic split payments
  won't work in live mode yet; sellers are paid via weekly statements.
- Terms and Privacy pages are templates and need legal review.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
