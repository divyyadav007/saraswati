# IMPLEMENTATION-PLAN.md — Saraswati V1

> Phased build plan derived from `docs/19-DEVELOPMENT-ROADMAP.md`, validated against all 26 specification documents. Do not start a later phase until the phase gate of the previous phase is met.

---

## Phase 0 — Project Foundation

**Objective**: Monorepo scaffolding, tooling, all apps running locally.

### Tasks
- [x] Initialize monorepo root (`package.json` or workspace config if using pnpm)
- [x] Scaffold FastAPI backend (`backend/`)
  - [x] `app/main.py` — FastAPI app, CORS middleware, health endpoint
  - [x] `app/config.py` — Pydantic `Settings` loading from `.env`
  - [x] `Dockerfile`
  - [x] `pyproject.toml` / `requirements.txt`
  - [x] `.env.example` per `docs/18-ENVIRONMENT-VARIABLES.md`
- [x] Scaffold Next.js app (`apps/web/`)
  - [x] App Router structure with `(storefront)/` and `admin/` route groups
  - [x] Tailwind CSS configured with design tokens from `docs/07-UI-UX-SPECIFICATION.md`
  - [x] shadcn/ui installed and configured
  - [x] `lib/design-tokens.ts`
  - [x] `.env.example`
- [x] Scaffold Expo app (`apps/mobile/`)
  - [x] Navigation shell (React Navigation: stack + bottom tabs)
  - [x] `app.config.ts`
  - [x] `.env.example`
- [x] Create `packages/shared/design-tokens.ts` for color/font constants
- [x] Configure Supabase dev project
  - [x] Enable `pgcrypto` extension
  - [x] Enable `pg_trgm` extension (for search)
  - [x] Configure Auth providers (Phone OTP, Email/Password)
  - [x] Create storage buckets (`product-images`, `banner-images`, `hamper-images`)
- [x] Set up `.gitignore` (Python, Node, env files, OS files)
- [x] Set up GitHub repo and basic CI (lint + build)

### Phase Gate
All three apps run locally. `GET /healthz` returns `200 OK` from the FastAPI backend. Next.js dev server shows a placeholder page. Expo app shows a navigation shell.

---

## Phase 1 — Database & Authentication

**Objective**: Schema foundation + working auth for customers and admin.

### Tasks
- [ ] SQLAlchemy models for foundation tables:
  - `profiles`, `addresses`, `categories`, `products`, `product_variants`, `product_images`, `store_settings`
- [ ] Define PostgreSQL enums (`user_role`, `stock_status`, etc.)
- [ ] Set up Alembic and generate initial migration
- [ ] Apply migrations to dev Supabase project
- [ ] Implement Supabase Auth JWT verification in FastAPI (`common/auth.py`)
  - [ ] `get_current_user` dependency
  - [ ] `require_role(*roles)` dependency
- [ ] Backend: `POST /auth/sync-profile` endpoint (idempotent upsert)
- [ ] Backend: `GET /auth/me` endpoint
- [ ] Web: Supabase Auth client setup, phone OTP login flow (customer)
- [ ] Web: Email/password login flow (admin at `/admin/login`)
- [ ] Mobile: Supabase Auth client setup, phone OTP login flow
- [ ] Web middleware: protect `/admin/**` routes by role
- [ ] Seed `store_settings` with defaults

### Phase Gate
Customer can sign up/log in on web and mobile via OTP. Admin can log in at `/admin/login`. Backend correctly rejects wrong-role tokens on a protected test endpoint.

---

## Phase 2 — Catalogue

**Objective**: Admin can manage products; customers can browse.

### Tasks
- [ ] Backend Admin endpoints:
  - [ ] Categories CRUD (`POST/PATCH/DELETE /admin/categories`)
  - [ ] Products CRUD (`POST/PATCH/DELETE /admin/products`)
  - [ ] Variants CRUD (`POST/PATCH/DELETE /admin/products/{id}/variants`)
  - [ ] Image upload (signed URL from Supabase Storage)
- [ ] Backend Public endpoints:
  - [ ] `GET /categories` (active only, with `?include_inactive=true` for admin)
  - [ ] `GET /products` (search, filter by category/price/tags/featured, sort, paginate)
  - [ ] `GET /products/{slug}` (includes variants, images, review summary)
- [ ] Admin UI: Products screen (table + add/edit form with variant management)
- [ ] Admin UI: Categories screen (table + add/edit form)
- [ ] Storefront: Home page (featured products, categories, banners placeholder)
- [ ] Storefront: Category listing page
- [ ] Storefront: Product detail page (image gallery, variant selector, price)
- [ ] Mobile: Home, Browse, Product detail screens (mirroring web IA)

### Phase Gate
Admin adds a product with multiple weight variants and images → it appears correctly on the storefront and mobile app with correct per-variant pricing.

---

## Phase 3 — Cart & Checkout (COD Only)

**Objective**: End-to-end COD ordering.

### Tasks
- [ ] SQLAlchemy models: `carts`, `cart_items`, `delivery_slots`, `orders`, `order_items`, `payments`, `coupon_usage` (stubs)
- [ ] Alembic migration for new tables
- [ ] Backend Cart endpoints:
  - [ ] `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{id}`, `DELETE /cart/items/{id}`
  - [ ] `POST /cart/merge` (guest cart merge on login)
  - [ ] Server-computed subtotal on every cart fetch
- [ ] Backend Address endpoints:
  - [ ] CRUD (`GET/POST/PATCH/DELETE /addresses`)
  - [ ] `POST /addresses/{id}/set-default`
  - [ ] `GET /addresses/check-serviceability`
- [ ] Backend Delivery Slots:
  - [ ] `GET /delivery-slots?date=`
  - [ ] Admin: `POST /admin/delivery-slots` (bulk generate)
  - [ ] Slot capacity/cutoff enforcement
- [ ] Backend Checkout:
  - [ ] `POST /checkout` — server-side price recomputation, order creation (COD only initially)
  - [ ] `Idempotency-Key` handling
  - [ ] Order number generation (`SW-YYYYMMDD-NNNN`)
  - [ ] Stock decrement + slot capacity decrement in transaction
  - [ ] `SELECT ... FOR UPDATE` for concurrency safety
- [ ] Backend Orders:
  - [ ] `GET /orders` (customer's own, paginated)
  - [ ] `GET /orders/{id}`
  - [ ] Order state machine validation
- [ ] Web: Cart page, Address management, Slot selection, Checkout page, Order confirmation
- [ ] Mobile: Same screens mirroring web flow
- [ ] Guest cart (localStorage on web, AsyncStorage on mobile) with merge on login

### Phase Gate
A COD order can be placed end-to-end from both web and mobile. Order appears in customer's history and admin order list with server-computed totals.

---

## Phase 4 — Razorpay Payments

**Objective**: Online payment flow working end-to-end.

### Tasks
- [ ] `PaymentGateway` interface + `RazorpayGateway` implementation
- [ ] Checkout enhanced: Razorpay order creation for `payment_method=ONLINE`
- [ ] `POST /payments/verify` endpoint (client-side verification)
- [ ] `POST /payments/webhook/razorpay` endpoint (signature verification, idempotent)
- [ ] `processed_webhook_events` table + migration
- [ ] Unpaid order timeout (background cleanup or on-access check)
- [ ] Web: Razorpay Checkout.js integration
- [ ] Mobile: Razorpay React Native SDK (or WebView fallback)
- [ ] Admin: Refund action (`POST /admin/orders/{id}/refund`)
- [ ] Payment status display in order detail (customer + admin)

### Phase Gate
Full online-payment order flow works end-to-end in Razorpay test mode. Failed payment leaves order un-confirmed. Webhook matches client-side confirmation. Refund works.

---

## Phase 5 — Admin Order Management & Delivery

**Objective**: Full order lifecycle from PLACED to DELIVERED.

### Tasks
- [ ] SQLAlchemy models: `delivery_partners`, `delivery_assignments`
- [ ] Backend: Order status transitions with state machine enforcement (`PATCH /admin/orders/{id}/status`)
- [ ] Backend: Delivery partner CRUD (`/admin/delivery-partners`)
- [ ] Backend: Delivery assignment (`POST /admin/orders/{id}/assign-delivery`)
- [ ] Backend: Customer order cancel (`POST /orders/{id}/cancel`)
- [ ] Backend: Reorder (`POST /orders/{id}/reorder`)
- [ ] Admin UI: Order list with status filter tabs, search, pagination
- [ ] Admin UI: Order detail with status update control, delivery assignment
- [ ] Admin UI: Delivery Partners screen
- [ ] Admin UI: Delivery Slots management screen
- [ ] Storefront + Mobile: Order tracking/status timeline UI
- [ ] Notifications: `NotificationSender` interface
  - [ ] `FCMPushSender` implementation
  - [ ] `ResendEmailSender` implementation
  - [ ] Order placed, status changed triggers
  - [ ] In-app `notifications` table writes

### Phase Gate
Full "Customer places order → Admin processes through all statuses → Customer sees DELIVERED" flow works on both COD and online-payment orders. Notifications received.

---

## Phase 6 — Coupons, Offers, Banners, Reviews

**Objective**: Promotional features and social proof.

### Tasks
- [ ] SQLAlchemy models: `coupons`, `coupon_usage`, `offers`, `banners`, `reviews`
- [ ] Backend: Coupons CRUD (`/admin/coupons`) + `POST /coupons/validate`
- [ ] Backend: Wire coupon validation into checkout flow
- [ ] Backend: Offers CRUD (`/admin/offers`)
- [ ] Backend: Banners CRUD (`/admin/banners`)
- [ ] Backend: Reviews (`POST /reviews` with verified-purchase check)
- [ ] Backend: `GET /products/{slug}/reviews` (published only)
- [ ] Admin UI: Coupons screen, Offers screen, Banners screen
- [ ] Storefront: Coupon field at checkout, homepage banners/offers display
- [ ] Storefront + Mobile: Review submission + display on product detail
- [ ] Mobile: Same coupon/banner/review features

### Phase Gate
Coupon correctly discounts an order; usage limit enforced. Banner displays on homepage. Review submitted after delivery, appears after admin approval.

---

## Phase 7 — Sweets-Specific Features

**Objective**: Gift hampers and bulk enquiries.

### Tasks
- [ ] SQLAlchemy models: `gift_hampers`, `gift_hamper_items`, `gift_hamper_images`, `bulk_order_enquiries`
- [ ] Backend: Gift hampers CRUD + composition management (`/admin/gift-hampers`)
- [ ] Backend: Public hamper endpoints (`GET /gift-hampers`, `GET /gift-hampers/{slug}`)
- [ ] Backend: Cart/checkout support for hamper line items
- [ ] Backend: Bulk enquiry endpoint (`POST /bulk-enquiries`)
- [ ] Backend: Admin bulk enquiry management (`GET/PATCH /admin/bulk-enquiries`)
- [ ] Admin UI: Gift Hampers screen, Bulk Enquiries screen
- [ ] Storefront + Mobile: Gift hampers listing/detail, bulk enquiry form
- [ ] Checkout: Special instructions + packaging notes fields

### Phase Gate
Gift hamper ordered through normal checkout. Bulk enquiry submitted without login, appears in admin with status management.

---

## Phase 8 — Analytics, Polish, Hardening

**Objective**: Production readiness.

### Tasks
- [ ] Admin: Dashboard summary (today's orders/revenue, pending, low-stock)
- [ ] Admin: Sales reports (date range, group by category/product, CSV export)
- [ ] Admin: Customers screen (list, search, order history)
- [ ] Admin: Store Settings screen
- [ ] Rate limiting (`slowapi`) on sensitive endpoints
- [ ] Structured JSON logging (`23-OBSERVABILITY.md`)
- [ ] Error handling consistency review (`22-ERROR-HANDLING.md`)
- [ ] Audit logging for admin actions
- [ ] Accessibility pass (WCAG AA contrast, keyboard nav, semantic HTML)
- [ ] Performance pass (image optimization, skeletons, LCP)
- [ ] SEO: title tags, meta descriptions, sitemap.xml, robots.txt, OG tags
- [ ] Fill automated test gaps per `15-TESTING-STRATEGY.md`
- [ ] `GET /auth/me`, notification preferences UI
- [ ] Profile management UI

### Phase Gate
`15-TESTING-STRATEGY.md` §11 manual pre-launch checklist passes. CI tests green. Lighthouse ≥85 on storefront.

---

## Phase 9 — Deployment & Launch

**Objective**: Production environment live with real orders.

### Tasks
- [ ] Set up staging Supabase project + environment
- [ ] Deploy backend to staging (Docker on chosen PaaS)
- [ ] Deploy web to staging (Vercel)
- [ ] Build staging Android APK (EAS Build)
- [ ] Full E2E testing on staging with Razorpay test mode
- [ ] Set up production Supabase project + environment
- [ ] Configure production Razorpay (live keys, webhook URL)
- [ ] Configure production Resend (verified sending domain)
- [ ] Configure production FCM
- [ ] Deploy to production
- [ ] Production configuration checklist (`16-DEPLOYMENT.md` §7)
- [ ] Database backup strategy (pg_dump + Supabase backups)
- [ ] Monitoring/alerting setup
- [ ] Android app: Play Store submission (or APK distribution)
- [ ] Real test order in production

### Phase Gate
Production live. A real test order completes end-to-end with real (controlled) payment. Monitoring active. Backups running.

---

## Rules Across All Phases

1. Build backend-first within each phase; frontend follows tested backend.
2. Write tests alongside implementation, not deferred entirely to Phase 8.
3. Follow `docs/20-AI-CODING-RULES.md` at all times.
4. Follow `docs/21-CODING-CONVENTIONS.md` for naming/style.
5. Update relevant docs if implementation reveals spec issues.
6. Log deviations in `docs/26-CHANGELOG.md`.
