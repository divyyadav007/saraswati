# Phase 8 — Implementation Plan: Analytics, Polish & Hardening

**Project:** Saraswati Sweets (Online Ordering Platform)  
**Phase:** 8 (Final Hardening & Production Readiness)  
**Status:** In Progress  
**Author:** AI Agent (Google Deepmind Antigravity)  
**Date:** September 2026

---

## 1. Current State Audit

Phases 1 through 7 are complete, verified, and operational:
- **Authentication & RBAC:** Supabase JWT integration with role extraction (`CUSTOMER`, `STAFF`, `ADMIN`, `DELIVERY`). Profile synchronization and addresses are functional.
- **Catalog & Inventory:** Category, Product, Product Variant, and Product Image management with hierarchical tags and stock tracking.
- **Cart & Pricing:** Guest + customer carts with live pricing calculations and variant constraints.
- **Checkout & Orders:** Slot selection, delivery addresses, COD + Razorpay integration, webhook verification, idempotency keys, order status machines.
- **Coupons & Promotions:** Coupon validation, cart application, usage limits, offers, and hero banners.
- **Delivery & Reviews:** Delivery partner management, order assignment, tracking, and product reviews with star ratings and moderation.
- **Gift Hampers & Bulk Enquiries:** Custom gift hamper builder with fixed & dynamic item sets, bulk enquiry forms with status workflows.
- **Test Suite Status:** 58/58 pytest suites passing in `backend`. Next.js web application building with zero TypeScript errors.

---

## 2. Existing Functionality Discovered

- **Database Models (`backend/app/db/models/`):**
  - `StoreSetting` and `AuditLog` models already exist in `operations.py` (§2.26, §2.27).
  - `Profile.notif_promotional_opt_in` exists in `auth.py`.
  - `Order`, `OrderItem`, `Payment`, `ProductVariant` exist with full status tracking (`PENDING`, `CONFIRMED`, `PAID`, etc.).
- **Middlewares & Logging (`backend/app/common/`):**
  - `RequestLoggingMiddleware` with `X-Request-Id` and structured access logging.
  - `setup_logging` with `JSONFormatter` already implemented.
  - Global error envelope `{"error": {"code": "...", "message": "...", "details": ...}}` configured.
- **Admin Layout (`apps/web/app/admin/layout.tsx`):**
  - Sidebar layout with links to Products, Categories, Orders, Gift Hampers, Bulk Enquiries, Coupons, Reviews, Delivery Partners, Customers, Settings.
- **Slowapi:** Installed in backend virtual environment (`slowapi==0.1.9`).

---

## 3. Missing Phase 8 Functionality

1. **Admin Dashboard Summary API & UI (`/api/v1/admin/dashboard/summary`):**
   - Server-side aggregation for Today's Orders, Today's Revenue, Pending Orders, Low Stock Alerts.
   - Interactive dashboard page at `/admin/dashboard`.
2. **Sales Reports & CSV Export API & UI (`/api/v1/admin/reports/sales`, `/api/v1/admin/reports/sales/export`):**
   - Date range filters, grouping by Category and Product, server-side revenue/order totals, streaming CSV export.
   - Interactive reports page at `/admin/reports`.
3. **Admin Customers Management API & UI (`/api/v1/admin/customers`):**
   - Paginated customer list with search by name/phone/email, total lifetime orders and spend aggregation, customer detail view with order history.
   - Customers page at `/admin/customers`.
4. **Store Settings API & UI (`/api/v1/admin/store-settings`):**
   - Retrieve and update store operational configurations (store name, phone, address, COD limits, delivery charges, free delivery threshold, pincodes, business hours).
   - Audit logging for setting modifications.
   - Settings page at `/admin/settings`.
5. **Rate Limiting:**
   - Configure `slowapi` limiter and attach to sensitive endpoints: coupon validation, checkout submission, bulk enquiry submission, reviews submission, and device token updates.
6. **Audit Logging Service (`AuditLog`):**
   - Centralized helper `log_audit_event` to record admin mutations (products, coupons, orders, settings, hampers, enquiries).
7. **Customer Profile & Notification Preferences (`/api/v1/auth/me`, `/api/v1/notifications/preferences`):**
   - `PATCH /api/v1/auth/me` to update customer profile fields (`full_name`, `email`).
   - `GET /api/v1/notifications/preferences` & `PATCH /api/v1/notifications/preferences` for promotional notification opt-in.
   - Customer profile page at `/profile`.
8. **SEO & Performance Hardening:**
   - Next.js dynamic metadata for products, categories, hampers, and static pages.
   - `sitemap.ts` and `robots.ts` with `noindex` protection on all `/admin/*` routes.
   - Semantic HTML, visible focus styles, ARIA labels, and WCAG AA accessibility passes.

---

## 4. Files/Modules That Need Modification

- `backend/app/main.py`: Include admin dashboard, reports, customers, and store-settings routers; bind rate-limiter exception handler.
- `backend/app/modules/auth/router.py` & `service.py`: Add `PATCH /api/v1/auth/me` for profile updates with role preservation.
- `backend/app/modules/notifications/router.py` & `service.py`: Add notification preference endpoints.
- `backend/app/common/response.py` or middleware: Ensure rate-limit exceeded returns standard error envelope.
- `apps/web/app/admin/layout.tsx`: Update navigation links to point to active Dashboard, Reports, Customers, and Settings pages.
- `apps/web/app/admin/page.tsx`: Redirect to `/admin/dashboard`.
- `apps/web/lib/api-client.ts`: Add typed API clients for Dashboard, Reports, Customers, Settings, Profile, and Preferences.
- `apps/web/app/layout.tsx`: Add metadata, OpenGraph tags, and canonical hints.

---

## 5. New Files/Modules Required

### Backend:
- `backend/app/common/rate_limit.py`: Slowapi Limiter setup.
- `backend/app/common/audit.py`: Centralized audit logging utility.
- `backend/app/modules/analytics/schemas.py`: Summary & sales report schemas.
- `backend/app/modules/analytics/service.py`: Aggregation logic for dashboard and reports (with CSV generation).
- `backend/app/modules/analytics/router.py`: Dashboard summary & sales report endpoints.
- `backend/app/modules/admin/schemas.py`: Customer listing schemas.
- `backend/app/modules/admin/customers_router.py`: Customer management endpoints.
- `backend/app/modules/store_settings/schemas.py`: Store settings schemas.
- `backend/app/modules/store_settings/service.py`: Settings read/update logic with audit logging.
- `backend/app/modules/store_settings/router.py`: Settings endpoints.
- `backend/tests/test_phase8_analytics_and_hardening.py`: Test suite for Phase 8 features.

### Frontend:
- `apps/web/app/admin/dashboard/page.tsx`: Admin dashboard summary screen.
- `apps/web/app/admin/reports/page.tsx`: Admin sales reports screen with date pickers & CSV download.
- `apps/web/app/admin/customers/page.tsx`: Admin customer directory and order history modal.
- `apps/web/app/admin/settings/page.tsx`: Store operational settings screen.
- `apps/web/app/(storefront)/profile/page.tsx`: Customer profile and notification preferences screen.
- `apps/web/app/robots.ts`: Next.js robots configuration.
- `apps/web/app/sitemap.ts`: Dynamic sitemap generator.

---

## 6. Database Changes

**None required.**  
Careful audit of `backend/app/db/models/` confirms that:
- `StoreSetting` (`store_settings` table) is already defined with all operational fields.
- `AuditLog` (`audit_logs` table) is already defined with `actor_user_id`, `action`, `entity_type`, `entity_id`, `before_data`, `after_data`, `created_at`.
- `Profile.notif_promotional_opt_in` is already defined in `profiles` table.
Existing schema is 100% sufficient.

---

## 7. API Changes

- `GET /api/v1/admin/dashboard/summary` — Returns today's orders & revenue, pending orders, and low-stock items.
- `GET /api/v1/admin/reports/sales` — Filterable sales summary grouped by category or product.
- `GET /api/v1/admin/reports/sales/export` — Streamed CSV export of sales report.
- `GET /api/v1/admin/customers` — Paginated list of registered customers with search, order counts, and total spend.
- `GET /api/v1/admin/customers/{id}` — Customer profile detail and order history.
- `GET /api/v1/admin/store-settings` — Get current store settings.
- `PATCH /api/v1/admin/store-settings` — Update store settings with audit logging.
- `PATCH /api/v1/auth/me` — Customer updates own profile (`full_name`, `email`).
- `GET /api/v1/notifications/preferences` — Get user notification preferences.
- `PATCH /api/v1/notifications/preferences` — Update promotional notification preference.

---

## 8. Frontend Changes

- Implement rich responsive admin screens with loading skeletons, error states, and responsive tables.
- Customer profile screen with tabbed sections for personal details, addresses, and notification preferences.
- Storefront header integration linking to `/profile`.

---

## 9. Security Changes

- **Rate Limiting:** Enforce per-IP / per-user rate limits on public write and validation endpoints (`5/minute` on coupon validation, `10/minute` on bulk enquiries, `20/minute` on checkout).
- **Admin Authorization:** All new `/admin/*` routes strictly require `require_staff_or_admin` or `require_admin`.
- **Role Tampering Protection:** `PATCH /api/v1/auth/me` accepts only allowed customer fields; rejects any attempt to elevate `role` or tamper with `is_active`.
- **Audit Logging:** Admin state changes are recorded in `audit_logs` table.

---

## 10. Testing Strategy

- Pytest tests in `test_phase8_analytics_and_hardening.py` covering:
  - Dashboard summary metrics calculation and status exclusions (cancelled/failed orders excluded from revenue).
  - Sales report filtering by date range, category grouping, and product grouping.
  - CSV export format, headers, and escaping.
  - Customer directory pagination, search, and unauthorized access rejection.
  - Store settings retrieval, updates, and audit log generation.
  - Rate limiting triggers and HTTP 429 response structure.
  - Profile update and notification preferences toggling.
- Complete regression test run (`pytest backend/tests`).
- Ruff linter check across all backend code.
- Next.js build verification (`pnpm run build`).

---

## 11. Performance Strategy

- Server-side SQL aggregations using `COUNT`, `SUM`, and group-by indices to eliminate N+1 queries.
- Next.js image optimization (`<Image />` from `next/image` with proper width, height, and priority attributes where appropriate).
- Lazy loading and loading skeletons for data-heavy admin tables and storefront cards.

---

## 12. SEO Strategy

- Dynamic metadata generator for products, categories, and hampers using Next.js `generateMetadata`.
- Robots exclusion on `/admin` and `/checkout`.
- Dynamic `sitemap.xml` listing all active categories, products, and hampers.

---

## 13. Lighthouse Strategy

- Target: Lighthouse score >= 85 on the storefront.
- Ensure semantic headings (`h1` per page, hierarchical `h2`/`h3`).
- Contrast checking for buttons and badges.
- Accessible ARIA attributes for modals and mobile menus.
- Preconnect and font display optimizations.

---

## 14. Risks & Mitigations

- **Risk:** Revenue calculations misrepresenting cancelled or refunded orders.  
  *Mitigation:* Explicitly filter orders by `payment_status in ('PAID', 'CAPTURED')` or confirmed COD orders, excluding `CANCELLED`, `REFUNDED`, and `FAILED`.
- **Risk:** Rate limiting blocking legitimate users.  
  *Mitigation:* Conservative limits on sensitive write endpoints only; standard read endpoints remain unmetered.
- **Risk:** Frontend build failure due to server-side metadata or missing types.  
  *Mitigation:* Comprehensive TypeScript interfaces matching backend Pydantic schemas.

---

## 15. Verification Commands

```bash
# 1. Backend tests
cd backend && venv\Scripts\python -m pytest tests/ -v

# 2. Ruff linting
cd backend && venv\Scripts\python -m ruff check app tests

# 3. Frontend production build
cd apps/web && pnpm run build
```
