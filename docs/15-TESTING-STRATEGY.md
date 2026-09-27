# 15-TESTING-STRATEGY.md

## 1. Philosophy

Testing effort is concentrated on the money-and-order-critical path (§6 checklist) and security-sensitive logic (price computation, payment verification, auth/role checks). Exhaustive UI snapshot testing of every screen is not required for V1; correctness of business logic and the critical flow is what matters most.

## 2. Backend Unit Tests

- Framework: `pytest` (+ `pytest-asyncio` for FastAPI async routes).
- Cover: price/discount/delivery-charge/total computation logic, coupon validation rules (expired, min order value, usage limits), order state-machine transition validation (valid and invalid transitions both tested), Razorpay signature verification function (with known good/bad signature fixtures), stock/slot capacity decrement logic under concurrent access (simulate two simultaneous checkouts for the last slot/stock unit).
- Target: business-logic-heavy modules (`checkout`, `orders`, `payments`, `coupons`, `delivery`) at meaningfully high coverage (aim ≥80%); thinner coverage acceptable for simple CRUD-only admin modules.

## 3. Backend API (Integration) Tests

- Use FastAPI's `TestClient`/`httpx.AsyncClient` against a real test database (a disposable Postgres — e.g., a local Supabase/Postgres test instance or a Dockerized Postgres for CI) rather than mocking the DB, to catch real SQL/constraint issues.
- Cover: full request/response cycles for auth-protected endpoints (401/403 cases), pagination correctness, validation error shapes (`422`), idempotency behavior on retried checkout.

## 4. Payment Flow Tests

- Mock the Razorpay SDK/HTTP calls in most tests (no real network calls in CI); include a small number of tests against Razorpay's official test-mode sandbox (manual or a gated CI job) before major releases.
- Cover: successful payment → order PLACED; signature mismatch → order stays PENDING_PAYMENT/marked FAILED; webhook idempotency (same event delivered twice → single effect); refund flow updates state correctly; COD orders bypass payment gateway entirely.

## 5. Authentication Tests

- Cover: valid JWT accepted, expired/invalid JWT rejected (401), role-gated admin endpoint rejects a CUSTOMER-role token (403), `STAFF` vs `ADMIN` permission boundaries where they differ.

## 6. Order Flow Tests (End-to-End Critical Checklist)

### Customer: Browse → Cart → Checkout → Payment → Order → Tracking
- [ ] Can view home, categories, product listing, product detail with correct variant prices.
- [ ] Can add a variant to cart; cart subtotal matches server computation.
- [ ] Out-of-stock variant cannot be added to cart.
- [ ] Can select a saved address or add a new one; unserviceable pincode is blocked with a clear message.
- [ ] Can select a delivery slot; a full/past-cutoff slot is not selectable.
- [ ] Can apply a valid coupon and see the correct discount; an expired/invalid coupon is rejected with a clear message.
- [ ] COD option is available/unavailable correctly based on order total vs `cod_limit_amount`.
- [ ] Placing a COD order succeeds and shows a confirmation with correct order number/total.
- [ ] Placing an online-payment order opens Razorpay checkout with the correct amount; a successful test payment results in an order visible as PLACED with `payment_status=CAPTURED`.
- [ ] A failed/cancelled payment leaves the order in a non-PLACED state and does not falsely confirm the order.
- [ ] Order appears correctly in order history with an accurate status timeline.
- [ ] Reorder adds available items to a fresh cart and clearly flags any now-unavailable items.
- [ ] Order confirmation/status-change notifications are received (push and/or email) at each relevant transition.

### Admin: Login → View Order → Accept → Prepare → Assign Delivery → Deliver
- [ ] Admin/staff login works; wrong-role or unauthenticated access to `/admin` is blocked.
- [ ] New order appears in the admin order list promptly (within the polling interval).
- [ ] Admin can open the order and see full correct detail (items, address, slot, payment status, instructions).
- [ ] Admin can move the order `PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP`; an invalid transition (e.g., skipping to DELIVERED directly) is rejected.
- [ ] Admin can assign a delivery partner.
- [ ] Admin can mark the order `OUT_FOR_DELIVERY` then `DELIVERED`; customer sees the corresponding status update.
- [ ] Admin can cancel an order at an allowed stage and, if paid, issue a refund; order and payment status update correctly.

## 7. Admin Tests (beyond the order flow)

- Product/category/variant CRUD correctness (including image upload and primary-image constraint).
- Coupon CRUD and validation edge cases (min order value boundary, usage-limit-reached rejection).
- Store settings updates take effect immediately for subsequent checkouts (e.g., changing COD limit).
- Bulk-enquiry status updates persist and are reflected in the list/filter views.

## 8. Frontend Tests (Web)

- Component/unit tests (e.g., React Testing Library + Vitest/Jest) for critical interactive components: variant selector, cart item quantity control, checkout form validation, coupon-apply UI feedback.
- A small number of end-to-end tests (e.g., Playwright) covering the customer critical path against a staging environment/test backend, run before each production deploy at minimum.

## 9. Mobile Tests

- React Native Testing Library for critical screens (cart, checkout form validation, order tracking rendering of statuses).
- Manual smoke test on at least one mid-range and one low-end/older Android device before each release, given the target user base's likely device profile.

## 10. CI Gates

- Backend: lint (`ruff`/`flake8`) + type-check (`mypy`, if adopted) + unit + integration tests must pass before merge.
- Web: lint (`eslint`) + type-check (`tsc --noEmit`) + unit tests must pass before merge; Playwright E2E run at minimum before a production deploy (can be a separate, slower pipeline stage).
- Mobile: lint + type-check + unit tests must pass before merge; EAS build triggered manually or on release-branch merge.

## 11. Manual Pre-Launch Checklist (in addition to automated tests)

- Full critical-flow walkthrough on a real Android device with a real (test-mode) Razorpay payment.
- Verify no secrets are present in the deployed frontend bundle (`grep` the built JS for known secret patterns as a sanity check).
- Verify CORS is locked to the actual production origins, not `*`.
- Verify Swagger docs are disabled/restricted in production.
- Verify error responses in production do not leak stack traces.
