# 18-ENVIRONMENT-VARIABLES.md

> Rule: never commit real values. Each app ships a `.env.example` with these keys and placeholder/blank values. Real values live only in local `.env`/`.env.local` (git-ignored) or the hosting platform's secret manager.

## 1. Backend (`services/api/.env`)

| Variable | Description | Exposed to frontend? |
|---|---|---|
| `ENVIRONMENT` | `development` \| `staging` \| `production` | No |
| `DEBUG` | `true`/`false` — enables verbose error output; must be `false` outside local dev | No |
| `DATABASE_URL` | Supabase Postgres connection string | No |
| `SUPABASE_URL` | Supabase project URL | No (backend uses server-side; frontend has its own copy under a public var, see §2) |
| `SUPABASE_SERVICE_ROLE_KEY` | Full-privilege Supabase key, backend-only | **Never** |
| `SUPABASE_JWT_SECRET` / JWKS config | Used to verify incoming user JWTs | No |
| `RAZORPAY_KEY_ID` | Razorpay public key id | No (also duplicated as a public var for the frontend widget, see §2) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | **Never** |
| `RAZORPAY_WEBHOOK_SECRET` | Used to verify webhook signatures | **Never** |
| `FIREBASE_SERVICE_ACCOUNT_JSON` (or path to it) | FCM Admin SDK credentials | **Never** |
| `RESEND_API_KEY` | Transactional email provider key | **Never** |
| `GOOGLE_MAPS_SERVER_API_KEY` | Server-side Geocoding calls, if used server-side | **Never** |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins | No |
| `APP_BASE_URL` | Public URL of the web app, used in email links | No |
| `LOG_LEVEL` | e.g. `info`, `debug` | No |
| `RATE_LIMIT_DEFAULT` | e.g. requests/minute default for limiter | No |

## 2. Web (`apps/web/.env.local`)

| Variable | Description | Public? |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI backend base URL | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes (safe — public by design) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (RLS-protected, safe to expose) | Yes |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key id, used to open Checkout widget | Yes |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` | Client-side Maps JS/Places key, **restricted by HTTP referrer** in Google Cloud Console | Yes, but referrer-restricted |
| `NEXT_PUBLIC_APP_ENV` | `development`/`staging`/`production`, for client-side conditionals (e.g., analytics) | Yes |

**Never** create a `NEXT_PUBLIC_*` variable for: Supabase service-role key, Razorpay key secret, Razorpay webhook secret, Firebase service account, Resend API key, or any server-only Maps key without referrer restriction.

## 3. Mobile (`apps/mobile` — via `app.config.ts` reading EAS env/secrets)

| Variable | Description | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Backend base URL | Public by nature of a distributed app binary — treat all mobile-embedded values as effectively public, since APKs can be decompiled; no true secrets belong in the mobile app at all |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Public |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Public, RLS-protected |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key id | Public |
| `google-services.json` | Firebase/FCM Android config file | Not a plaintext env var but a config file bundled at build time via EAS; treat as semi-sensitive (don't commit to a public repo; store via EAS secrets/credentials) |

## 4. Per-Environment Values

Each of `development`, `staging`, `production` has its **own** complete set of the above values (own Supabase project, own Razorpay test/live keys, own Firebase project or at least its own Android app registration, own Resend sending identity). Cross-environment reuse of any key (especially `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`) is not permitted.

## 5. Secret Rotation

- If any secret is ever accidentally committed or exposed, rotate it immediately at the provider (Supabase service-role key regenerate, Razorpay key regenerate, Firebase service account key regenerate) and update all environments' stored values — do not merely remove it from a future commit, since git history retains it; treat exposure as a rotation event, not a revert event.

## 6. `.env.example` Requirement

Every app directory must contain a committed `.env.example` listing every variable name above (relevant to that app) with an empty or placeholder value and a one-line comment describing it, so a new developer/agent can `cp .env.example .env` and know exactly what to fill in without guessing variable names.
