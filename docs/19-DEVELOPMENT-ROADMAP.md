# 19-DEVELOPMENT-ROADMAP.md

## Purpose

Defines the build order for Antigravity (or any implementer) so that dependent pieces are always built on top of working, tested foundations. Do not start a later phase until the phase gate criteria of the previous phase are met. See `20-AI-CODING-RULES.md` for the behavioral rules that apply throughout.

## Phase 0 — Scaffolding & Environment (prerequisite for everything)

- Initialize monorepo structure per `04-ARCHITECTURE.md` §5.
- Create Supabase project (dev), enable extensions/providers per `16-DEPLOYMENT.md` §3.
- Scaffold FastAPI app (`services/api`) with health-check endpoint, CORS config, Pydantic settings loaded from env.
- Scaffold Next.js app (`apps/web`) with Tailwind + shadcn/ui installed and design tokens from `07-UI-UX-SPECIFICATION.md` wired in.
- Scaffold Expo app (`apps/mobile`) with navigation shell.
- Set up `.env.example` files per `18-ENVIRONMENT-VARIABLES.md`.
- Set up GitHub repo, branch protection, basic CI (lint + build) per `21-CODING-CONVENTIONS.md`.

**Phase gate**: all three apps run locally and can reach a trivial "hello/health" endpoint end-to-end.

## Phase 1 — Database & Auth Foundation

- Implement SQLAlchemy models + Alembic migrations for: `profiles`, `addresses`, `categories`, `products`, `product_variants`, `product_images`, `store_settings` (subset needed for catalogue) per `05-DATABASE-SCHEMA.md`.
- Implement Supabase Auth wiring: phone OTP flow (web + mobile), email/password flow (admin), JWT verification dependency in FastAPI, `profiles` sync endpoint.
- Implement RBAC dependency (`require_role`) per `08-SECURITY.md`.

**Phase gate**: a user can sign up/log in on web and mobile; an admin can log in separately; the backend correctly distinguishes roles on a protected test endpoint.

## Phase 2 — Catalogue (Backend + Admin + Storefront read side)

- Backend: categories/products/variants/images CRUD (admin) + public read endpoints (search/filter/sort/pagination) per `06-API-SPECIFICATION.md` §6.2, §6.13.
- Admin: Products, Categories screens per `11-ADMIN-PANEL.md` §3.2–3.3.
- Storefront: Home, Category listing, Product detail per `07-UI-UX-SPECIFICATION.md` §3.

**Phase gate**: admin can add a product with multiple weight variants and images; it appears correctly, with correct pricing, on the storefront.

## Phase 3 — Cart & Checkout Core (no payment yet)

- Backend: `carts`/`cart_items` models + endpoints; `addresses` CRUD; `delivery_slots` model + generation + read endpoint.
- Storefront + mobile: Cart screen, address management, slot selection.
- Backend: checkout endpoint implementing server-side price computation (§3.2 of `03-FEATURE-SPECIFICATION.md`), initially forcing `payment_method=COD` only (payment gateway added in Phase 4) so the order-creation and state-machine logic can be validated in isolation first.

**Phase gate**: a COD order can be placed end-to-end from web and mobile, appears correctly in the customer's order history and in the admin order list, with a server-computed total matching expectations under manual verification (including with a coupon applied, once Phase 5's coupon logic exists — coupons may be stubbed/skipped until Phase 5, or built here if convenient; if skipped, checkout ignores `coupon_code` until Phase 5 wires it in).

## Phase 4 — Payments (Razorpay)

- Implement `PaymentGateway` interface + `RazorpayGateway` adapter per `04-ARCHITECTURE.md` §9 and `09-PAYMENTS.md`.
- Implement order creation with Razorpay, `/payments/verify`, `/payments/webhook/razorpay`, idempotency handling.
- Storefront + mobile: integrate Razorpay Checkout widget/SDK.
- Admin: refund action.

**Phase gate**: full online-payment order flow works end-to-end in Razorpay test mode, including a deliberately failed test payment leaving the order correctly un-confirmed, and a webhook-driven confirmation matching the client-side confirmation.

## Phase 5 — Admin Order Management & Delivery

- Backend + Admin: order status transitions (state machine enforcement), delivery partner CRUD, delivery assignment.
- Storefront + mobile: order tracking/status timeline UI.
- Notifications: order-placed and status-change notifications (push + email) per `10-NOTIFICATIONS.md` (basic implementation; polish in Phase 8).

**Phase gate**: the full "Customer places order → Admin processes → Customer sees DELIVERED" flow from `02-PRD.md` §Epic H works end-to-end on both COD and online-payment orders.

## Phase 6 — Coupons, Offers, Banners, Reviews

- Backend + Admin: coupons CRUD, coupon validation wired into checkout, offers/banners CRUD.
- Storefront + mobile: coupon field at checkout, homepage banners/offers display, reviews (submission gated on delivered purchase, admin moderation).

**Phase gate**: a coupon correctly discounts an order end-to-end, including hitting its usage limit; a review can be submitted only after delivery and appears publicly only after admin approval.

## Phase 7 — Sweets-Specific Features

- Backend + Admin: gift hampers CRUD + composition; bulk-order enquiry endpoint + admin management.
- Storefront + mobile: gift hampers browsing/detail/add-to-cart-as-line-item; bulk-enquiry form; special instructions/packaging notes fields at checkout.

**Phase gate**: a gift hamper can be ordered through the normal cart/checkout flow; a bulk-order enquiry can be submitted and appears in admin with status management working.

## Phase 8 — Analytics, Polish, Hardening

- Admin: dashboard summary, sales reports, CSV export.
- Cross-cutting: rate limiting, structured logging/observability (`23-OBSERVABILITY.md`), error-handling consistency review (`22-ERROR-HANDLING.md`), accessibility pass, performance pass (image optimization, skeleton states), security review checklist from `08-SECURITY.md`.
- Testing: fill out the critical-flow automated test suite per `15-TESTING-STRATEGY.md` if not already continuously maintained through prior phases (tests should ideally be written alongside each phase, not deferred entirely to this phase — this phase is for closing gaps).

**Phase gate**: the full pre-launch manual checklist in `15-TESTING-STRATEGY.md` §11 passes; automated critical-path tests pass in CI.

## Phase 9 — Launch Preparation & Deployment

- Set up `staging` and `production` environments per `16-DEPLOYMENT.md`.
- Configure backups/monitoring per `24-BACKUP-AND-RECOVERY.md` / `23-OBSERVABILITY.md`.
- Submit Android app for Play Store review (or arrange APK distribution).
- Final production configuration checklist (`16-DEPLOYMENT.md` §7).

**Phase gate**: production environment live, a real (small) test order successfully completes end-to-end in production with real (or carefully controlled minimal) payment.

## Post-Launch

- Monitor error rates, payment failures, and customer feedback closely for the first 2–4 weeks.
- Address `25-FUTURE-ROADMAP.md` items based on real business priorities, not speculative build-ahead.

## Rules Across All Phases

- No phase's UI work should get ahead of its backend counterpart being tested and working — build backend-first within each phase where practical, per `20-AI-CODING-RULES.md`.
- Any deviation from this order (e.g., building admin reports before checkout works) requires explicit justification recorded in `26-CHANGELOG.md`.
