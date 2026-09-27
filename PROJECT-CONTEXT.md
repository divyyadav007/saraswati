# PROJECT-CONTEXT.md — Saraswati (Sweetshop)

> **For AI coding agents**: Read this file first, then the numbered documents in `docs/` relevant to your current task.

## 1. What This Project Is

An online ordering platform for a local Indian sweets (mithai) shop in Barabanki, Uttar Pradesh. Customers browse products, order by weight variant, choose delivery slots, and pay via COD or Razorpay. An admin dashboard manages the entire lifecycle.

## 2. Architecture (V1)

**Modular monolith** — a single FastAPI backend, one Next.js web app (storefront + admin), one Expo React Native mobile app (customer-facing, Android).

```
Customer Web / Mobile → FastAPI Backend → Supabase PostgreSQL
Admin Dashboard (Next.js /admin) → FastAPI Backend → Supabase PostgreSQL
```

All writes go through FastAPI. Supabase is used for Postgres, Auth (identity provider), and Storage (images). See `docs/04-ARCHITECTURE.md` for full detail.

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLAlchemy (async), Alembic, Pydantic |
| Database | Supabase PostgreSQL 17 |
| Auth | Supabase Auth (Phone OTP for customers, Email/Password for admin) |
| Web Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Mobile | Expo (managed workflow), React Native, TypeScript |
| Payments | Razorpay (Standard Checkout) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Transactional Email | Resend |
| Maps (minimal) | Google Maps Platform |
| Hosting | Vercel (web), Free/low-cost PaaS (backend), Supabase (DB) |

## 4. Repository Structure

```
saraswati/
├── docs/                   # 26 specification files — source of truth
├── apps/
│   ├── web/                # Next.js (storefront + admin dashboard)
│   └── mobile/             # Expo React Native (Android, customer-only)
├── backend/                # FastAPI modular monolith
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── db/             # models, session, migrations
│   │   ├── common/         # auth, exceptions, pagination, response
│   │   └── modules/        # auth, catalog, cart, checkout, orders, payments, ...
│   ├── alembic/
│   ├── tests/
│   └── Dockerfile
├── packages/shared/        # Design tokens shared between web and mobile
├── scripts/                # Utility scripts
├── .github/workflows/      # CI
├── PROJECT-CONTEXT.md      # This file
├── IMPLEMENTATION-PLAN.md  # Phased build plan
├── README.md
├── .gitignore
└── .env.example
```

## 5. Key Business Rules

- **Single store, single delivery area** (Barabanki + surrounding pincodes).
- **Currency**: INR only. **Language**: English UI for V1.
- **Products sold by weight variants** (250g, 500g, 1kg) with per-variant pricing.
- **COD allowed** up to a configurable limit (default ₹5,000); above that, online payment required.
- **Delivery by shop's own staff**, coordinated manually by admin.
- **Reviews** require verified purchase (DELIVERED order), admin-moderated.
- **Festival/advance orders** supported via delivery slots generated days/weeks ahead.

## 6. Security Non-Negotiables

1. Server recomputes all prices at checkout — never trust client.
2. Razorpay webhook is the source of truth for payment status.
3. Service-role key is backend-only — never in frontend bundles.
4. RBAC enforced on every admin endpoint.
5. All secrets in env vars — never in git.
6. See `docs/08-SECURITY.md` for complete rules.

## 7. Current Project State

- **Phase**: Architecture & Planning (pre-implementation)
- **Supabase Project**: `pdovuxqbymgqzvaxcwuk` ("Saraswati Sweets"), active, clean (no tables)
- **Database**: PostgreSQL 17, no schema deployed yet
- **Code**: Documentation only — no application code written

## 8. Document Index

| # | File | Topic |
|---|------|-------|
| 01 | `PROJECT-OVERVIEW.md` | Goals, non-goals, assumptions |
| 02 | `PRD.md` | User stories, acceptance criteria, prioritization |
| 03 | `FEATURE-SPECIFICATION.md` | Detailed functional behavior |
| 04 | `ARCHITECTURE.md` | System design, modules, data flow |
| 05 | `DATABASE-SCHEMA.md` | Tables, columns, constraints, indexes |
| 06 | `API-SPECIFICATION.md` | Endpoints, pagination, validation |
| 07 | `UI-UX-SPECIFICATION.md` | Brand, design system, screens, UX rules |
| 08 | `SECURITY.md` | Auth, RBAC, payments, secrets, CORS |
| 09 | `PAYMENTS.md` | Razorpay flow, COD, refunds, idempotency |
| 10 | `NOTIFICATIONS.md` | Push, email, in-app, triggers |
| 11 | `ADMIN-PANEL.md` | Screens, roles, real-time |
| 12 | `MOBILE-APP.md` | Expo stack, auth, payments, offline |
| 13 | `WEB-APP.md` | Next.js structure, rendering, SEO |
| 14 | `DELIVERY-SYSTEM.md` | Slots, charges, assignment |
| 15 | `TESTING-STRATEGY.md` | Test types, critical checklists |
| 16 | `DEPLOYMENT.md` | Environments, setup, production checklist |
| 17 | `FREE-TIER-SERVICES.md` | Provider limits, migration paths |
| 18 | `ENVIRONMENT-VARIABLES.md` | All env vars, per app |
| 19 | `DEVELOPMENT-ROADMAP.md` | Phase order, gates |
| 20 | `AI-CODING-RULES.md` | Agent behavioral rules |
| 21 | `CODING-CONVENTIONS.md` | Naming, folder, commit conventions |
| 22 | `ERROR-HANDLING.md` | Error codes, envelope, principles |
| 23 | `OBSERVABILITY.md` | Logging, metrics, alerting |
| 24 | `BACKUP-AND-RECOVERY.md` | Backups, DR plan |
| 25 | `FUTURE-ROADMAP.md` | Deferred features, schema readiness |
| 26 | `CHANGELOG.md` | Documentation/architecture change log |

## 9. Implementation Order

See `IMPLEMENTATION-PLAN.md` for the full phased plan. High-level:

Phase 0 → Scaffolding & Environment
Phase 1 → Database & Auth
Phase 2 → Catalogue
Phase 3 → Cart & Checkout (COD)
Phase 4 → Payments (Razorpay)
Phase 5 → Admin Order Management & Delivery
Phase 6 → Coupons, Offers, Banners, Reviews
Phase 7 → Sweets-Specific Features
Phase 8 → Analytics, Polish, Hardening
Phase 9 → Deployment & Launch
