# 16-DEPLOYMENT.md

## 1. Environments

| Environment | Purpose | Database | Notes |
|---|---|---|---|
| `development` | Local machine work | Local/dev Supabase project (or Supabase local dev via CLI + Docker) | Test-mode Razorpay keys, sandbox Resend, verbose logging allowed |
| `staging` | Pre-production verification | Separate Supabase project | Mirrors production config as closely as possible, test-mode Razorpay, used for QA/E2E before promoting |
| `production` | Live | Separate Supabase project | Live Razorpay keys, verified email sending domain, restricted docs/logging |

Never point more than one environment at the same Supabase project/database.

## 2. Local Development Setup

1. Clone repo; install dependencies per app (`apps/web`, `apps/mobile`, `services/api`).
2. Copy each app's `.env.example` to `.env`/`.env.local` and fill in development values (Supabase dev project URL/keys, Razorpay test keys, etc. — see `18-ENVIRONMENT-VARIABLES.md`).
3. Run database migrations against the dev Supabase Postgres (`alembic upgrade head` from `services/api`).
4. Start backend: `uvicorn app.main:app --reload` (from `services/api`).
5. Start web: `pnpm dev` (or `npm run dev`) from `apps/web`.
6. Start mobile: `npx expo start` from `apps/mobile`; use a development build (EAS dev client) if native modules (Razorpay SDK, FCM) are in use, otherwise Expo Go is sufficient for pure-JS iteration.

## 3. Supabase Setup

1. Create a Supabase project per environment.
2. Enable required extensions: `pgcrypto` (uuid generation), `pg_trgm` (search performance) if used.
3. Configure Auth: enable Phone provider (OTP) with an SMS provider configured per Supabase's supported integrations (check current Supabase-supported SMS providers for phone auth at setup time, since this can change — a step explicitly worth a fresh check against Supabase's docs during implementation rather than assuming a specific vendor here); enable Email/Password provider for admin/staff.
4. Configure Storage: create buckets (e.g., `product-images`, `banner-images`, `hamper-images`) with public read where appropriate for catalogue images, and upload write access restricted to the backend's service-role key (not public anon-key writable).
5. Note the project's URL, anon key, and service-role key; store per environment per `18-ENVIRONMENT-VARIABLES.md` (service-role key is backend-only, never frontend).
6. Run Alembic migrations against this project's Postgres connection string.

## 4. Backend Deployment

- Target: a free/low-cost container or PaaS host suitable for a single FastAPI service (e.g., Render, Railway, Fly.io free/hobby tier — final choice made at implementation time based on then-current free-tier terms; see `17-FREE-TIER-SERVICES.md` for the decision framework and re-verify current limits before committing, since free-tier terms change).
- Containerized via a `Dockerfile` in `services/api/` for portability across hosting providers.
- Health-check endpoint (`GET /healthz`) required by most PaaS platforms for readiness checks.
- Environment variables injected via the hosting platform's secret/env configuration UI — never baked into the Docker image.
- Migrations run as a deploy step (e.g., `alembic upgrade head` executed before the new app version starts serving traffic), with a rollback plan (previous image/tag redeploy) if a migration or deploy fails.

## 5. Web Deployment (Vercel)

- Connect the GitHub repo; set the project root to `apps/web` (monorepo-aware build).
- Environment variables set per Vercel environment (Preview/Production) matching `18-ENVIRONMENT-VARIABLES.md`'s `NEXT_PUBLIC_*` and server-side variables.
- Preview deployments automatically created per pull request for review before merge.
- Production domain: custom domain configured with HTTPS (automatic via Vercel) once the business has a domain name; until then, the default `*.vercel.app` domain is acceptable for early testing.

## 6. Mobile Build (Android APK/AAB)

- EAS Build (`eas.json` profiles: `development`, `preview`, `production`).
- `development`/`preview` profiles produce installable APKs for internal testing (sideload or internal Play testing track).
- `production` profile produces an AAB for Play Store submission.
- Signing credentials managed via EAS (recommended) or the shop's own upload keystore, backed up in a secure location (e.g., a password manager or encrypted storage) — losing this blocks future app updates.
- Environment-specific config (API base URL, Firebase config) injected via Expo config (`app.config.ts`) reading from EAS environment variables/secrets per build profile.

## 7. Production Configuration Checklist

- [ ] All secrets set via the hosting platform's env var UI, none in the repo.
- [ ] CORS allow-list contains only real production origins.
- [ ] Swagger/OpenAPI docs disabled or access-restricted.
- [ ] Razorpay live keys + live webhook secret configured, webhook URL registered in the Razorpay dashboard pointing at the production backend.
- [ ] Resend sending domain verified (SPF/DKIM).
- [ ] Firebase project's production FCM credentials configured for the production Android build variant.
- [ ] `DEBUG`/verbose-error flags disabled.
- [ ] Database backups enabled (see `24-BACKUP-AND-RECOVERY.md`).
- [ ] Monitoring/alerting configured (see `23-OBSERVABILITY.md`).

## 8. Domain & HTTPS

- Web: custom domain via Vercel (automatic HTTPS/TLS).
- Backend: HTTPS enforced by the hosting platform (most free-tier PaaS providers provide this automatically); if a custom API subdomain is used (e.g., `api.sweetshop.example`), configure DNS + TLS via the hosting platform's domain settings.

## 9. Database Migrations in Production

- Migrations reviewed in a PR, applied to `staging` first and verified, then applied to `production` during a low-traffic window.
- Destructive migrations (column/table drops) require a backup confirmation step (`24-BACKUP-AND-RECOVERY.md`) before running, and ideally a two-step deploy (stop writing to the old column, deploy, then drop it in a later migration) for zero-downtime safety once the app has real users.

## 10. Logging & Monitoring in Production

See `23-OBSERVABILITY.md` for full detail; summary: structured JSON logs shipped to the hosting platform's log viewer at minimum, with a plan to add a free-tier log aggregation/alerting tool (e.g., a free tier of a hosted logging/error-tracking service such as Sentry's free tier for error tracking) once launched.
