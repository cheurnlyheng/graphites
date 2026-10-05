# Deploying GRAPHITES

Backend (Spring Boot + Postgres) on **Railway**, frontend (Next.js) on **Vercel**. Neither needs a
Dockerfile — Railway's Nixpacks builder detects the Maven project automatically (`mvn package`,
then `java -jar target/*.jar`), and Vercel is the native home for Next.js.

Domain: **graphites.world** (already purchased). Suggested split: `graphites.world` + `www` →
Vercel (frontend), `api.graphites.world` → Railway (backend) — a standard pattern that keeps the
storefront on the bare domain and the API on its own subdomain.

## 1. Backend + database (Railway)

1. Create a new Railway project, add a **Postgres** plugin to it, and a second service pointing at
   the `backend/` folder of this repo (root directory setting: `backend`).
2. Add a **volume** to the backend service, mounted at the path the app expects for uploads. Set
   `UPLOAD_DIR` to that mount path (e.g. a volume mounted at `/data/uploads` → `UPLOAD_DIR=/data/uploads`).
   Without this, every redeploy wipes product photos and hero banners — Railway's filesystem is
   otherwise ephemeral.
3. Set these environment variables on the backend service (values from `backend/.env.example`
   shows the shape of each):

   | Variable | Notes |
   |---|---|
   | `DB_USERNAME`, `DB_PASSWORD` | Use the values Railway's Postgres plugin generates — reference them with Railway's `${{Postgres.PGUSER}}` / `${{Postgres.PGPASSWORD}}` variable syntax rather than copy-pasting, so they stay in sync if the plugin ever rotates them. |
   | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` (overrides the `localhost` default baked into `application.yml` — Spring's env-var binding picks this up even though the yaml doesn't reference it directly). |
   | `JWT_SECRET` | Generate a **fresh** value for production — don't reuse your local `.env`'s secret. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
   | `SHIPPO_WEBHOOK_TOKEN` | Same idea — a fresh random value, same command as above. |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Start with Stripe **test** keys for the dry run in the verification section below; switch to live keys only after that dry run passes. |
   | `SHIPPO_API_TOKEN` | Your Shippo token (test or live). |
   | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | See the Resend/domain section below — don't launch with the `onboarding@resend.dev` fallback. |
   | `CORS_ALLOWED_ORIGINS` | `https://graphites.world` (no trailing slash; add `https://www.graphites.world` too if both resolve). |
   | `FRONTEND_BASE_URL` | `https://graphites.world` — used to build links inside emails. |
   | `UPLOAD_DIR` | The volume mount path from step 2. |
   | `WAREHOUSE_*` | Already set to the real address/phone/email in local `.env` — copy those same values across rather than leaving Railway on its own defaults. |

4. Flyway runs automatically on startup (`flyway.enabled: true` in `application.yml`) — no manual
   migration step needed, it just needs the database env vars above to be correct.
5. **Product photos won't carry over automatically.** `backend/uploads/` is gitignored on purpose
   (binary uploads don't belong in git), so the volume from step 2 starts empty on first deploy —
   the 6 real product photos only exist on your local machine right now. After the backend is live,
   go through each product in the admin panel and re-upload its photos once, directly against the
   production site. A one-time step, but easy to forget.

## 2. Frontend (Vercel)

1. Import this repo into Vercel, with the project root set to `frontend/`.
2. Set `NEXT_PUBLIC_API_BASE_URL` to `https://api.graphites.world` (or Railway's own `*.up.railway.app`
   URL until the `api.` DNS record is pointed at it).
3. Set `NEXT_PUBLIC_SITE_URL` to `https://graphites.world` (used to build the sitemap/robots.txt).
4. Add `graphites.world` (and `www.graphites.world`) as a domain on the Vercel project — it shows
   the exact DNS records to add at your registrar.

## 3. Domain + email sending (Resend)

Order confirmation/shipping/return emails currently fall back to Resend's shared
`onboarding@resend.dev` sender if `RESEND_FROM_EMAIL` isn't set to a verified domain — confirmed
during testing that this actually lands in spam on Gmail. Don't launch on that fallback.

1. In Resend, add and verify **graphites.world** — it gives you a handful of DNS records (SPF,
   DKIM, and usually a tracking CNAME) to add at whichever registrar the domain was bought through.
2. Set `RESEND_FROM_EMAIL` to an address on that domain, e.g. `orders@graphites.world`.

## 4. Stripe live mode

Stripe's own business verification (identity, bank account) can't be done on your behalf — do this
in the Stripe dashboard when ready. Until then, keep `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`
on **test** keys so the dry run below exercises the same code path safely.

## 5. Shippo webhook

In the Shippo dashboard, register the tracking webhook URL as:

```
https://api.graphites.world/api/webhooks/shippo?token=<SHIPPO_WEBHOOK_TOKEN>
```

using the same `SHIPPO_WEBHOOK_TOKEN` value set in step 1 — without it, that endpoint accepts
unauthenticated requests (fine for local dev, not for production).

## 6. Before flipping Stripe to live mode

Run one full order through the **deployed** environment, in Stripe test mode:
cart → checkout → webhook → confirmation email arrives → it shows up in the admin dashboard → buy
a shipping label → the Shippo webhook flips it to Delivered. Only switch to Stripe live keys once
that whole loop works against the real deployment, not just localhost.
