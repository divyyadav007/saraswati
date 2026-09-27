# Phase 9 — Deployment Readiness Audit

This document assesses the deployment readiness of the Saraswati Sweets platform against the deployment specifications in `docs/16-DEPLOYMENT.md`, `docs/18-ENVIRONMENT-VARIABLES.md`, and `docs/04-ARCHITECTURE.md`.

---

## 1. Readiness Summary by Category

| Category | Definition | Modules / Components |
|---|---|---|
| **READY** | Implemented, tested locally, build-verified, and architecture-compliant. | Backend Core API, Next.js Web Storefront & Admin, Database Schema & Migrations, Role-Based Access Control (RBAC), Order State Machine, Gift Hampers, Bulk Order Enquiries, Store Settings, Audit Logging, Sales Reporting & CSV Export. |
| **READY AFTER ENV CONFIG** | Fully implemented; requires setting environment variables on the staging/production host. | Razorpay Test/Live Keys, Supabase Production URL & Service Keys, Resend Email API Key, Production CORS Origins. |
| **REQUIRES STAGING** | Requires public URL, staging network environment, or external provider webhook routing to fully test end-to-end. | Razorpay Webhook Callbacks (`/api/v1/payments/webhook/razorpay`), Supabase SMS OTP Provider (Twilio/Msg91), Resend Live Email Deliverability. |
| **REQUIRES PRODUCTION** | Requires live production credentials, Play Store submission, or legal/merchant credentials. | Razorpay Live Account Verification, Google Play Console AAB Submission & Signing, Production Custom Domain DNS/TLS Configuration. |
| **NOT YET IMPLEMENTED** | Deferred features per roadmap (Phase 10+ / V2). | Native Mobile Push Notifications (FCM device token integration), Live GPS Rider Tracking, Real-time WebSockets / SSE for live order tracking. |
| **NOT VERIFIED** | Features that could not be verified in the local offline sandbox without external third-party callbacks. | Real-time SMS Gateway delivery to physical mobile phones, external Razorpay server-to-server webhook delivery under network firewalls. |

---

## 2. Detailed Component Breakdown

### 2.1 Backend API (FastAPI)
- **Status**: **READY**
- **Artifacts**: Portable `Dockerfile`, `app/main.py`, 13 modular routers, 77 registered OpenAPI endpoints.
- **Verification**: `GET /healthz` and OpenAPI schema verified; 70 automated tests passing with 0 linting errors via Ruff.
- **Staging Step**: Deploy to PaaS host (Render / Railway / Fly.io) with container health checks.

### 2.2 Database & Migrations (PostgreSQL / Supabase)
- **Status**: **READY**
- **Artifacts**: All 4 migration scripts applied on Supabase dev (`pdovuxqbymgqzvaxcwuk`). 27 core tables, foreign keys, triggers, and RLS enabled.
- **Verification**: Database pooler connectivity, RLS boundaries, and seed data verified.
- **Staging Step**: Apply migrations to a dedicated staging Supabase project.

### 2.3 Web Storefront & Admin Dashboard (Next.js 16)
- **Status**: **READY**
- **Artifacts**: 26 routes (customer storefront, catalogue, hampers, cart, checkout, tracking, and full admin dashboard).
- **Verification**: Production build (`next build`) compiled with 0 errors.
- **Staging Step**: Connect GitHub repository to Vercel preview/staging environment.

### 2.4 Mobile Application (Expo / React Native)
- **Status**: **READY AFTER ENV CONFIG**
- **Artifacts**: Full tab and stack navigation, catalogue browsing, cart, checkout, profile screens.
- **Verification**: TypeScript typecheck (`npx tsc --noEmit`) clean with 0 errors.
- **Staging Step**: Build preview APK using EAS (`eas build --profile preview`).

### 2.5 Payments Integration (Razorpay)
- **Status**: **REQUIRES STAGING**
- **Artifacts**: Order creation, client checkout options, cryptographic signature verification (`/payments/verify`), and webhook handler (`/payments/webhook/razorpay`).
- **Verification**: Tested locally with mock payloads; cryptographic failure verified on forged signatures; webhook idempotency verified.
- **Staging Step**: Register public staging URL in Razorpay Test Dashboard webhook settings.

### 2.6 Notifications & Email (Resend & In-App)
- **Status**: **REQUIRES STAGING**
- **Artifacts**: Database-persisted notifications table, order status event dispatchers, Resend client wrapper.
- **Verification**: In-app notifications verified across order lifecycle; Resend sandbox keys configured.
- **Staging Step**: Verify sending domain SPF/DKIM records in Resend for live email dispatch.

### 2.7 Backup & Disaster Recovery Readiness
- **Status**: **READY AFTER ENV CONFIG** (Production Backup: **NOT ACTIVE — PRODUCTION DEPLOYMENT PENDING**)
- **Artifacts**: Documented backup plan in `docs/24-BACKUP-AND-RECOVERY.md`.
- **Verification**: Database schema dumpable via `pg_dump`; Supabase automated backup tier identified.
- **Staging Step**: Configure automated GitHub Action or nightly cron job for staging/production database snapshots.

---

## 3. Staging Deployment Gate Checklist

Before promoting the application to Staging:
- [x] Backend test suite 100% green (70 tests passing).
- [x] Web storefront compiles without errors (`next build`).
- [x] Mobile codebase passes TypeScript typecheck with 0 errors.
- [x] All database migrations verified and idempotent.
- [x] Role-Based Access Control and IDOR boundaries verified.
- [ ] Create dedicated Staging Supabase Project (separate from Dev & Prod).
- [ ] Set up staging environment variables on Vercel and PaaS host.
- [ ] Register Staging Webhook URL in Razorpay Test Dashboard.
