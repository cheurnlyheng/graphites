# Jess's Shop

A clothing shop: Next.js storefront + admin, Spring Boot API, PostgreSQL, Stripe (Checkout + Stripe Tax), Shippo (shipping rates/labels/tracking). Single warehouse, self-fulfilled with carrier-API-generated labels.

> Placeholder name — rename freely (Java package is `com.jess.shop`, artifact is `shop`).

## Repo layout

```
/backend   Spring Boot API (Java 17, Maven)
/frontend  Next.js 16 storefront + admin (React 19, Tailwind)
```

## Build status

- [x] Project foundation: pom.xml, config skeleton, git repo, docker-compose for local Postgres
- [x] Full schema (Flyway `V1`, `V2`): catalog, cart, customer, wishlist, orders, admin, shipping, returns, inventory/suppliers
- [x] Backend: catalog CRUD (admin) + public browse/search, cart, JWT auth (customer + admin, with a one-time admin bootstrap endpoint), Stripe Checkout + webhook (atomic stock decrement, oversell-safe), wishlist, Shippo rate lookup + label purchase, return/exchange flow with Stripe refunds, low-stock scheduled job generating draft purchase orders — **compiles clean, verified with `mvn compile`** (160 classes)
- [x] Frontend: storefront (browse, product detail w/ variants, cart, Stripe redirect checkout, order confirmation), customer auth + account (order history, wishlist, return requests), full admin panel (products, fulfillment queue + label buying, returns, suppliers, restock) — **builds clean, verified with `npm run build`** (Next.js 16 / React 19, 0 npm audit vulnerabilities)
- [x] Stripe Checkout **verified end-to-end against real Stripe test-mode API**, including a real browser payment flipping the order to PAID via webhook
- [x] Transactional email via **Resend**: order confirmation (with a no-login "track your order" link) on payment, shipping confirmation (with carrier tracking link) on label purchase — both verified delivered for real, not just compiled
- [x] Order status simplified to `PENDING → PAID → SHIPPED`, plus `CANCELLED` as the only manual admin action (real Stripe refund + restock, verified end-to-end). Dropped `FULFILLED` (redundant with `SHIPPED`, which already fires automatically off buying a label) and `REFUNDED` (a shipped order's refund is tracked on its return request instead — see `ReturnStatus.REFUNDED` — rather than duplicated on the order itself)
- [x] Guest order tracking: `GET /api/orders/{id}` was already public by design; added a real page for it (`/orders/[id]`) instead of only exposing it as a raw API, since most orders here are guest checkouts with no account to log into
- [ ] No automated tests (unit/integration) written yet
- [ ] Not deployed anywhere — local dev only so far

## Known simplifications (by design, for this stage)

- **Checkout offers two named flat-rate tiers** (Free Shipping / UPS Ground / 5-7 days, and a paid Express $14.99 / 2 days — `StripeCheckoutService`), not live per-address carrier rates. This is deliberate, not a placeholder: Stripe's hosted Checkout page collects the shipping address *after* the session (and its shipping options) is already created, so real carrier rates can't be looked up in time without replacing hosted Checkout with a custom page. The admin side *does* use real Shippo rates when buying the actual label after payment — the customer picks a speed tier, the shop picks the actual carrier (labeling the free tier "UPS Ground" is a display choice matching what most clothing DTC sites show; the shop isn't actually locked into UPS specifically when it comes time to buy the real label).
- **Supplier ↔ variant linking has no dedicated admin UI yet**, only a raw API call (`POST /api/admin/suppliers/variants/{variantId}/link`) — the suppliers page notes this.
- **Billing address isn't separately collected**; only shipping address (Stripe Checkout still handles payment method verification independently).
- Per-product Stripe tax codes (`product.taxCode`) are optional — when unset, Stripe falls back to the **account's default tax code**, which must be configured once in the Stripe Dashboard (or via the Tax Settings API) along with a **head office address**, or `automatic_tax` rejects every Checkout Session. For this project the default was set to `txcd_30011000` ("Clothing & Footwear" — looked up live via Stripe's own `/v1/tax_codes` API, not guessed), so most products can leave `taxCode` blank; set it explicitly only for a product needing a more specific category (e.g. children's clothing, athletic wear).

## Bugs found and fixed while first testing against real Stripe/Shippo

- **`.env` was silently not loading at all.** `me.paulschwarz:spring-dotenv` doesn't self-register (no `spring.factories`/`.imports` in the jar) — it requires manually adding `DotenvApplicationInitializer` via `SpringApplicationBuilder` in `ShopApplication.main()`. Before this fix, every `${VAR:default}` in `application.yml` was silently using its literal fallback instead of the real `.env` value — Stripe/Shippo keys looked "set" (curl'd fine against their APIs directly) but the running app itself was never actually using them. Fixed in `ShopApplication.java`.
- **`GlobalExceptionHandler`'s catch-all never logged anything**, so any unexpected error (like the Stripe issues below) produced a generic 500 with zero trace in the logs. Added `log.error(...)` there — worth keeping in mind if something fails "silently" again.

## Bugs found and fixed during a full CRUD pass (every endpoint exercised for real)

- **Deleting a product that had ever been added to a cart failed permanently.** `cart_item`, `order_item`, and `purchase_order_item` all referenced `product_variant` with the database default "block the delete" behavior instead of an explicit `ON DELETE` action. Fixed in migration `V3`: `cart_item` now cascades (a deleted product just disappears from carts), while `order_item`/`purchase_order_item` null out the reference instead (both already snapshot what they need to display historically, so past orders and purchase orders stay intact even after the product is gone). Also had to null-guard every place that reads `orderItem.getProductVariantId()` / `purchaseOrderItem.getProductVariantId()`, since those can now legitimately be `null`.
- **Wrong password returned a 500** instead of 401 — `BadCredentialsException` had no handler and fell through to the generic one. **A whole class of expected errors** (duplicate email on register, empty-cart checkout, "admin already exists," missing shipping address) had the same problem via `IllegalStateException`/`IllegalArgumentException`. Added proper handlers in `GlobalExceptionHandler` for all of these — they now return 400/401 with a real message instead of a generic 500.
- **Wishlist removal silently did nothing** — `WishlistService.remove()` was missing `@Transactional`, and Spring Data's derived `deleteBy...` method needs an active transaction to actually execute (it loads-then-removes rather than issuing a bulk `DELETE`). The item stayed in the list with no error.
- **Buying a real shipping label crashed** with a Postgres "value too long" error — `ShipmentService` was storing Shippo's `tracking_url_provider` (a full tracking-page URL) into the `carrier` column, which only expects a short code like `"USPS"`. The real carrier name was already available from the rate the admin picked; it just wasn't being passed through. Fixed by adding `carrier` to `BuyLabelRequest` and having the frontend pass `rate.provider` when buying a label.

Everything above was found by actually exercising each endpoint (not just reading the code) — categories, products (create/update/delete, variants, images), cart, guest checkout → real Stripe Checkout Session, customer register/login, wishlist, admin order status updates, real Shippo rate lookup + real label purchase, the full return/exchange flow (request → approve → resolve with restock + refund), and the supplier → low-stock → draft purchase order → mark-sent pipeline.

## Bugs found and fixed while wiring up email + cleaning up order status

- **A guest's paid order had no way to ever be seen again.** Guest checkout auto-creates a password-less "shell" `Customer` row (see `CustomerAuthService.register`, which upgrades that same row instead of duplicating it if the guest later signs up with the same email) — but until then, there was no email confirmation and no page for a guest to check order status without an account. Fixed by adding real order-confirmation/shipping emails (Resend) with a link to a new public `/orders/[id]` page — matching how Baggu/Rains and most guest-first storefronts actually work (an account is a convenience, never the only way to see your order).
- **The admin "Mark refunded" / "Mark fulfilled" buttons never did anything real.** They just relabeled the order via a generic `PATCH .../status` endpoint — "fulfilled" had no logic attached (buying a label already flips `SHIPPED`), and "refunded" didn't call Stripe or restock, so clicking it would say REFUNDED while the customer's card was never touched. Replaced with a single `POST .../cancel` endpoint that only allows cancelling a pending/unshipped order, and actually calls Stripe's refund API and restocks the items — verified against a real Stripe test payment (refund confirmed via `stripe refunds list`, stock confirmed incremented in Postgres).
- **Local Stripe webhook forwarding was silently broken**: the Stripe CLI was running as bare `stripe listen` with no `--forward-to`, so every payment succeeded on Stripe's side but the backend never found out, leaving orders stuck at `PENDING` forever with no email/tax/shipping filled in. Also, this CLI version requires `--events` explicitly or it refuses to start at all. Fixed and documented in the setup steps below so it doesn't silently regress again.

## Running locally

Postgres: either `docker compose up -d` (db `jess_shop`, user/pass `postgres`/`postgres`), **or** your own local Postgres install — this machine's setup uses the latter, pointed at the existing `jess` database (kept separate from other unrelated projects/tables on the same local Postgres server) with `root`/`root` credentials, matching `backend/.env` and `application.yml`.

1. **Backend**: `backend/.env` is already filled in with DB credentials and a dev JWT secret; add real Stripe/Shippo test keys and warehouse address when you're ready to test those. Then `cd backend && mvn spring-boot:run` (Java 17 + Maven required). Flyway runs migrations automatically on startup.
3. **Frontend**: copy `frontend/.env.local.example` to `frontend/.env.local`, then `cd frontend && npm install && npm run dev` (Node 18+ required) — runs on `localhost:3000`.
4. First-time setup: visit `/admin/login`, use "First time setup? Create the first admin account" to bootstrap your one admin login (only works once — refuses if an admin already exists).
5. For Stripe webhooks locally, use the Stripe CLI: `stripe listen --events checkout.session.completed --forward-to localhost:8080/api/webhooks/stripe` (the `--events` flag is required by newer CLI versions — running bare `stripe listen` either exits immediately or, worse, listens without forwarding, silently leaving every order stuck at `PENDING` after payment). This process must stay running the entire time you're testing checkout locally — if it's not running, Stripe still charges the test card but your backend never finds out, so the order never leaves `PENDING`. It prints a `whsec_...` signing secret on startup; this account's has stayed stable across restarts, but if it ever changes, update `STRIPE_WEBHOOK_SECRET` in `backend/.env` and restart the backend.
6. **Email**: set `RESEND_API_KEY` in `backend/.env` (get one from resend.com). Without a verified sending domain, Resend's sandbox (`onboarding@resend.dev`, the default `RESEND_FROM_EMAIL`) can only deliver to the email address you signed up to Resend with — sending to any other address gets rejected by Resend with a 403. `EmailService` catches and logs that (`log.error`, visible in the backend log) rather than failing the checkout/shipment it's attached to, but the customer won't actually receive anything until a real domain is verified in Resend.

## Design notes worth remembering

- **Entities use plain UUID foreign key fields, not JPA `@ManyToOne`/`@OneToMany` object graphs.** Keeps entities flat and avoids lazy-loading surprises; related data is fetched explicitly via repository queries in the service layer.
- **`orders` table is named `orders`, not `order`** — `order` is a reserved SQL keyword in Postgres.
- **Every product has at least one variant**, even simple ones (an auto-created variant with null size/color) — carts and orders always reference `product_variant_id`, so there's one code path regardless of whether a product has real size/color options.
- **`product.tax_code`** should be set to the Stripe Tax clothing category code so state clothing-sales-tax exemptions (NY, NJ, PA, MN, RI, etc.) apply correctly.
- **Stock changes happen atomically with marking an order `PAID`**, inside the Stripe webhook handler, via a conditional `UPDATE ... WHERE stock_qty >= ?` to prevent overselling the last unit to two simultaneous buyers. If it still fails (already sold out), the order is still marked paid (the customer already paid) and an `OVERSOLD` error is logged for manual handling rather than silently failing the order.
- A guest checkout still creates a `Customer` row (no password) so their order history can later be "claimed" by registering with the same email.
- `SecurityConfig`: admin routes need `ROLE_ADMIN`; cart/checkout/product-browse are public; order/return detail pages rely on an unguessable UUID rather than login, so guests can view their own confirmation without an account.
