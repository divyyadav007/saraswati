# 21-CODING-CONVENTIONS.md

## 1. General

- All code in TypeScript (web/mobile) or Python (backend) — no plain JavaScript files added going forward.
- Consistent formatting enforced by tooling, not manual review: `prettier` (web/mobile), `black` + `ruff` (backend), run via pre-commit hook and/or CI gate.
- No commented-out dead code left in commits; delete it (git history preserves it if needed).

## 2. Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Python variables/functions | `snake_case` | `compute_order_total()` |
| Python classes | `PascalCase` | `RazorpayGateway` |
| Python constants | `UPPER_SNAKE_CASE` | `MAX_CART_QUANTITY` |
| TypeScript variables/functions | `camelCase` | `computeCartSubtotal()` |
| TypeScript types/interfaces/components | `PascalCase` | `ProductCard`, `OrderStatus` |
| TypeScript constants | `UPPER_SNAKE_CASE` or `camelCase` for config objects | `MAX_CART_QUANTITY` |
| Database tables/columns | `snake_case`, plural tables | `order_items`, `created_at` |
| API routes | kebab/lowercase, plural nouns | `/api/v1/bulk-enquiries` |
| React component files | `PascalCase.tsx` | `ProductCard.tsx` |
| Non-component TS files | `camelCase.ts` | `apiClient.ts` |
| Python module files | `snake_case.py` | `order_service.py` |
| Environment variables | `UPPER_SNAKE_CASE`, `NEXT_PUBLIC_`/`EXPO_PUBLIC_` prefix only for genuinely public values | `RAZORPAY_KEY_SECRET` |

## 3. Backend Folder Conventions

Per module, per `04-ARCHITECTURE.md` §3: `router.py`, `schemas.py`, `service.py`, `repository.py`. Shared cross-module utilities (pagination helper, auth dependency, error types, base response envelope) live in `app/common/`. Database models live centrally in `app/db/models/` (one file per domain group), not scattered per module, so Alembic autogeneration has a single source to scan.

## 4. Frontend Folder Conventions

Per `13-WEB-APP.md` §2 and `12-MOBILE-APP.md`. Shared, reusable UI goes in `components/ui` (shadcn/ui generated) and `components/shared`; feature-specific components live under `components/storefront` or `components/admin`. Avoid a God-component; prefer composing small, named components over deeply nested inline JSX.

## 5. API Client Pattern

A single typed API client module per frontend app (`lib/api-client.ts` web, an equivalent in mobile) is the **only** place that constructs fetch/axios calls to the backend. Components/screens call functions exported from this client, never `fetch()` directly, so auth-header attachment, base URL, and error handling stay centralized and consistent (`13-WEB-APP.md` §4).

## 6. Error Handling Pattern (Backend)

- Business logic raises typed exceptions (e.g., `CouponExpiredError`, `SlotFullError`, `InvalidStatusTransitionError`) defined in `app/common/exceptions.py`.
- A single FastAPI exception handler maps these to the standard error envelope (`22-ERROR-HANDLING.md`) and correct HTTP status code — routes do not manually construct error JSON inline.

## 7. Commit & PR Conventions

- Conventional-ish commit messages: `feat(orders): add status transition validation`, `fix(cart): prevent negative quantity`, `docs: update payments spec for refund idempotency`.
- One logical change per PR where practical; large features may be split into multiple sequential PRs following the phase breakdown in `19-DEVELOPMENT-ROADMAP.md`.
- PR description references the relevant spec doc section(s) implemented.

## 8. Comments & Documentation in Code

- Comment the *why*, not the *what*, for non-obvious business-rule code (e.g., "// coupon usage recorded in the same transaction as order creation to avoid orphaned usage records — see 09-PAYMENTS.md §8").
- Every public backend endpoint has a docstring/FastAPI `summary`/`description` sufficient to render meaningfully in the auto-generated OpenAPI docs.

## 9. Dependency Management

- Backend: `pyproject.toml`/`requirements.txt` pinned versions (not loose ranges) for reproducibility; dependency additions justified per `20-AI-CODING-RULES.md` rule 6.
- Frontend: lockfiles (`pnpm-lock.yaml` or `package-lock.json`) committed; avoid adding a heavy library for something a few lines of custom code could do.

## 10. Linting/Type-Checking Baseline

- Backend: `ruff` (lint) is required to pass in CI; `mypy` strongly recommended for the payment/order/coupon modules at minimum given their correctness importance.
- Frontend: `eslint` + `tsc --noEmit` required to pass in CI. `any` types are avoided except where genuinely unavoidable (e.g., some third-party SDK typing gaps), and must be commented when used.
