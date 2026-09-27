# 06-API-SPECIFICATION.md

## 1. Conventions

- Base URL: `/api/v1/`. All routes are versioned under `v1` from day one.
- Format: JSON request/response bodies (`application/json`), UTF-8.
- Resource naming: plural nouns, kebab/lowercase paths (`/api/v1/product-variants` not used directly — variants are nested under products: `/api/v1/products/{id}/variants`).
- Auth: `Authorization: Bearer <supabase_jwt>` header on all authenticated endpoints. Public endpoints (catalogue browsing) work without a token but accept one if present (for personalization, e.g., wishlist — not in V1 scope).
- Documentation: auto-generated OpenAPI/Swagger at `/api/v1/docs` (enabled in dev/staging, access-restricted or disabled in production per `08-SECURITY.md`).

## 2. Pagination

Cursor-free, offset-based pagination for V1 simplicity (data volumes are small for a single local shop):
- Query params: `page` (default 1), `page_size` (default 20, max 100).
- Response envelope for list endpoints:
```json
{
  "items": [ ... ],
  "page": 1,
  "page_size": 20,
  "total_items": 134,
  "total_pages": 7
}
```

## 3. Filtering & Sorting

- Filtering via query params, named after the field (`category`, `is_featured`, `min_price`, `max_price`, `status`, `q` for search).
- Sorting via `sort` param, values like `price_asc`, `price_desc`, `newest`, `-created_at` — documented per-endpoint in the OpenAPI schema; a consistent default is applied when omitted (usually `newest`/`display_order`).

## 4. Standard Response Envelope

Success (non-list):
```json
{ "data": { ... } }
```
Error (see `22-ERROR-HANDLING.md` for full detail):
```json
{
  "error": {
    "code": "COUPON_EXPIRED",
    "message": "This coupon has expired.",
    "details": null
  }
}
```

## 5. HTTP Status Codes

`200` OK, `201` Created, `204` No Content (delete), `400` validation error, `401` unauthenticated, `403` forbidden (authenticated but not authorized), `404` not found, `409` conflict (e.g., invalid status transition, duplicate coupon usage, slot full), `422` semantic validation failure (Pydantic), `429` rate limited, `500` unexpected server error (never leaks internals — see `22-ERROR-HANDLING.md`).

## 6. Endpoint Catalogue

### 6.1 Auth (`/api/v1/auth`)
Most identity operations happen client-side via the Supabase Auth SDK directly (OTP send/verify, session refresh) — the backend does not proxy these. Backend auth-adjacent endpoints:
- `POST /auth/sync-profile` — auth required. Called once after first login to create/update the corresponding `profiles` row from the verified Supabase identity (idempotent upsert).
- `GET /auth/me` — auth required. Returns current user's profile + role.

### 6.2 Catalogue
- `GET /categories` — public. List active categories (all for admin via `?include_inactive=true` + admin token).
- `GET /categories/{slug}` — public.
- `GET /products` — public. Supports `category`, `q`, `min_price`, `max_price`, `tags`, `is_featured`, `sort`, pagination.
- `GET /products/{slug}` — public. Includes variants, images, active-review summary (avg rating, count).
- `GET /products/{slug}/reviews` — public. Published reviews only, paginated.

### 6.3 Cart (`/api/v1/cart`) — auth required
- `GET /cart` — returns current active cart with computed subtotal.
- `POST /cart/items` — body: `{product_variant_id | gift_hamper_id, quantity}`.
- `PATCH /cart/items/{item_id}` — body: `{quantity}`.
- `DELETE /cart/items/{item_id}`.
- `POST /cart/merge` — body: `{items: [{product_variant_id, quantity}, ...]}` — merges a guest cart on login.

### 6.4 Addresses (`/api/v1/addresses`) — auth required
- `GET /addresses`
- `POST /addresses`
- `PATCH /addresses/{id}`
- `DELETE /addresses/{id}` (soft delete)
- `POST /addresses/{id}/set-default`
- `GET /addresses/check-serviceability?pincode=` — public or auth, quick check before full address entry.

### 6.5 Delivery Slots (`/api/v1/delivery-slots`)
- `GET /delivery-slots?date=YYYY-MM-DD` — public/auth. Returns available slots with remaining capacity for a date; excludes slots past cutoff.

### 6.6 Coupons (`/api/v1/coupons`)
- `POST /coupons/validate` — auth required. Body: `{code, cart_total}` (cart_total is for early UX feedback only; final validation happens again server-side at checkout using the real cart). Returns discount preview.

### 6.7 Checkout & Orders (`/api/v1/checkout`, `/api/v1/orders`) — auth required
- `POST /checkout` — body: `{address_id, delivery_slot_id, coupon_code (optional), payment_method, special_instructions (optional), packaging_notes (optional)}`, header `Idempotency-Key`. Returns created order; if `payment_method=ONLINE`, also returns `{razorpay_order_id, amount, key_id}`.
- `GET /orders` — current user's orders, paginated, filter by `status`.
- `GET /orders/{id}` — full order detail (must belong to current user, or requester is admin/staff).
- `POST /orders/{id}/reorder` — adds available items back to cart.
- `POST /orders/{id}/cancel` — customer-initiated cancel, only allowed while status ∈ {PLACED, CONFIRMED} and before preparation begins (configurable), body: `{reason}`.

### 6.8 Payments (`/api/v1/payments`)
- `POST /payments/verify` — auth required. Body: `{order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature}`. Verifies signature, updates payment/order status (idempotent alongside the webhook — see `09-PAYMENTS.md`).
- `POST /payments/webhook/razorpay` — **no user auth** (verified via Razorpay webhook signature header instead — see `09-PAYMENTS.md`). Source of truth for payment status.

### 6.9 Reviews (`/api/v1/reviews`) — auth required to create
- `POST /reviews` — body: `{product_id, order_id, rating, comment}`. Server verifies purchase (`DELIVERED` order containing the product) before insert.

### 6.10 Bulk Enquiries (`/api/v1/bulk-enquiries`)
- `POST /bulk-enquiries` — public (login optional). Body per `03-FEATURE-SPECIFICATION.md` §6.5.

### 6.11 Gift Hampers (`/api/v1/gift-hampers`)
- `GET /gift-hampers` — public, paginated.
- `GET /gift-hampers/{slug}` — public, includes composition.

### 6.12 Notifications (`/api/v1/notifications`) — auth required
- `GET /notifications` — current user's notifications, paginated.
- `PATCH /notifications/{id}/read`
- `POST /notifications/device-token` — body: `{fcm_token}`, registers/updates push token.
- `PATCH /notifications/preferences` — body: `{promotional_opt_in: bool}`.

### 6.13 Admin — Catalogue (`/api/v1/admin/...`) — admin/staff only
- `POST /admin/categories`, `PATCH /admin/categories/{id}`, `DELETE /admin/categories/{id}`
- `POST /admin/products`, `PATCH /admin/products/{id}`, `DELETE /admin/products/{id}`
- `POST /admin/products/{id}/variants`, `PATCH /admin/variants/{id}`, `DELETE /admin/variants/{id}`
- `POST /admin/products/{id}/images` (returns a signed upload URL, or accepts multipart and proxies to Supabase Storage — see `13-WEB-APP.md`/`11-ADMIN-PANEL.md` for chosen upload flow), `DELETE /admin/images/{id}`

### 6.14 Admin — Orders
- `GET /admin/orders` — filter by `status`, `date_from`, `date_to`, `q` (order number/customer phone), paginated.
- `GET /admin/orders/{id}`
- `PATCH /admin/orders/{id}/status` — body: `{status, notes (optional)}`, validated against the state machine in `04-ARCHITECTURE.md` §6.
- `POST /admin/orders/{id}/assign-delivery` — body: `{delivery_partner_id}`.
- `POST /admin/orders/{id}/refund` — body: `{amount (optional, defaults full), reason}`.

### 6.15 Admin — Customers
- `GET /admin/customers` — paginated, search by phone/name.
- `GET /admin/customers/{id}` — profile + order history summary.

### 6.16 Admin — Coupons/Offers/Banners
- Full CRUD: `/admin/coupons`, `/admin/offers`, `/admin/banners`.

### 6.17 Admin — Gift Hampers & Bulk Enquiries
- Full CRUD: `/admin/gift-hampers`, `/admin/gift-hampers/{id}/items`.
- `GET /admin/bulk-enquiries`, `PATCH /admin/bulk-enquiries/{id}` (status/admin_notes).

### 6.18 Admin — Delivery
- Full CRUD: `/admin/delivery-partners`.
- `GET /admin/delivery-slots`, `POST /admin/delivery-slots` (generate slots for a date range), `PATCH /admin/delivery-slots/{id}`.

### 6.19 Admin — Reports & Settings
- `GET /admin/dashboard-summary` — today's orders/revenue, pending count, low-stock list.
- `GET /admin/reports/sales?from=&to=&group_by=day|week|month|category|product`.
- `GET /admin/store-settings`, `PATCH /admin/store-settings`.

## 7. Validation

- All request bodies validated via Pydantic models; invalid input returns `422` with field-level error details.
- Business-rule validation (e.g., "coupon expired", "slot full") returns `409` or `400` with a specific `error.code` from a documented enum (see `22-ERROR-HANDLING.md`).

## 8. Rate Limiting

See `08-SECURITY.md` §Rate Limiting for policy; enforced at the API gateway/reverse-proxy or via a lightweight in-app limiter (e.g., `slowapi`) on sensitive endpoints (auth-adjacent, checkout, coupon validation, bulk-enquiry submission).

## 9. Idempotency

`POST /checkout` requires an `Idempotency-Key` header (client-generated UUID per checkout attempt). The backend stores this on the created `orders.idempotency_key` and, on a retried request with the same key, returns the original order (HTTP 200) instead of creating a duplicate.

## 10. Versioning Policy

Breaking changes require a new version prefix (`/api/v2/`) once the API has real external consumers (mobile app users on older app versions). Additive, backward-compatible changes (new optional fields, new endpoints) do not require a version bump.
