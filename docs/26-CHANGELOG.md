# 26-CHANGELOG.md

Log of documentation and architecture changes. This file is updated **in the same change** whenever an approved architectural decision is made or an existing spec document is revised (per `20-AI-CODING-RULES.md` rule 17/25). New entries go at the top.

Format:
```
## YYYY-MM-DD — Short Title
- What changed
- Why
- Documents affected
```

## 2026-09-27 — Phase 9: Local Integration & Pre-Deployment Validation
- Executed comprehensive end-to-end local integration validation across Backend (FastAPI), Web Storefront & Admin (Next.js 16), Mobile (Expo), and Supabase Dev Project (`pdovuxqbymgqzvaxcwuk`).
- Verified 70 automated backend unit/integration tests with 100% pass rate, covering RBAC isolation, customer checkout lifecycle, Razorpay test mode & webhook idempotency, gift hampers, bulk enquiries, reviews moderation, sales analytics, and audit logging.
- Created `docs/LOCAL-DEVELOPMENT.md` providing unified setup, environment variable guidance, local network configuration, and startup commands.
- Created `docs/phase-9-deployment-readiness.md` cataloging deployment readiness per module.
- Generated `docs/phase-9-local-validation-report.md` detailing test results, local network topology, and staging prerequisites.
- **Explicit Note**: Production deployment was intentionally NOT executed. This phase establishes local stability and deployment readiness only; the next phase is Staging Deployment.
- Documents affected: `docs/LOCAL-DEVELOPMENT.md`, `docs/phase-9-deployment-readiness.md`, `docs/phase-9-local-validation-report.md`, `docs/26-CHANGELOG.md`.

---

## 2026-09-26 — Initial Documentation Set Created

- Created the full V1 specification set: `PROJECT-CONTEXT.md` and `01` through `25`, covering project overview, PRD, feature spec, architecture, database schema, API spec, UI/UX spec, security, payments, notifications, admin panel, mobile app, web app, delivery system, testing strategy, deployment, free-tier services, environment variables, development roadmap, AI coding rules, coding conventions, error handling, observability, backup and recovery, and future roadmap.
- Key architectural decisions recorded at creation time (see `04-ARCHITECTURE.md` for full detail):
  - **ADR-0001**: Admin dashboard implemented as a protected route group inside the same Next.js app as the storefront, not a separate deployable app, for V1.
  - **ADR-0002**: Backend implemented as a single FastAPI modular monolith organized by domain module, not microservices.
- Documents affected: all files in `docs/`.

---

*(Future entries continue above this line, most recent first.)*
