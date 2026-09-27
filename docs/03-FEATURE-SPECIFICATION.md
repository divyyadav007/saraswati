# 03-FEATURE-SPECIFICATION.md

Detailed functional behavior for every feature area. Read alongside `05-DATABASE-SCHEMA.md` (data shapes) and `06-API-SPECIFICATION.md` (endpoints).

## 1. Catalogue

### 1.1 Categories
- Flat list for V1 (no nested subcategories) — `categories.parent_id` exists in schema for future nesting but is nullable/unused in V1 logic.
- Fields: name, slug (unique, URL-safe), image, display_order, is_active.
- Inactive categories are hidden from customer-facing endpoints but visible in admin.

### 1.2 Products
- Belongs to exactly one category (V1 simplification; schema allows future many-to-many via a join table if needed — not built in V1).
- Fields: name, slug, description, is_active, is_featured, tags (array, for filtering e.g. "festival", "eggless", "bestseller"), created_at/updated_at.
- A product's own `is_active=false` hides it everywhere customer-facing regardless of variant stock.

### 1.3 Product Variants
- A product has 1..N variants. Each variant is independently priced and stocked.
- Variant fields: `label` (e.g. "250g", "500g", "1kg", or "Box of 12"), `weight_grams` (nullable — null for non-weight variants like hamper boxes), `price` (INR, integer paise or decimal — see schema), `mrp` (optional strike-through price), `sku` (unique), `is_active`, `stock_status` (`IN_STOCK` / `OUT_OF_STOCK` / `LIMITED`), `stock_quantity` (nullable — used only if the shop tracks exact counts; if null, stock is managed purely via `stock_status` toggled by staff).
- At least one variant must be active for a product to be purchasable; if zero active variants remain, the product shows as "Currently Unavailable" but stays visible (not deleted).

### 1.4 Product Images
- Multiple images per product, one marked `is_primary`. Stored in Supabase Storage, referenced by URL + storage path in `product_images`.
- Image optimization: served via Next.js `<Image>` with responsive sizes; originals uploaded at a max dimension enforced client-side before upload (e.g., 2000px) to control storage costs.

### 1.5 Search & Filtering
- Search: case-insensitive `ILIKE` match on `products.name` (and optionally `description`) for V1 — full-text search (Postgres `tsvector`) is a documented future upgrade if search quality becomes an issue, not required for V1.
- Filters: `category`, `min_price`/`max_price` (evaluated against variant price range), `tags`, `is_featured`. All combinable via query params.
- Sorting: `price_asc`, `price_desc`, `newest`, `popularity` (popularity = order count over trailing 30 days, computed, not stored live in V1 — acceptable to compute via query with reasonable index; revisit if slow).

## 2. Cart

- One active cart per authenticated user (`carts` row with `status='ACTIVE'`), containing `cart_items` (product_variant_id, quantity, snapshot of unit price at add-time for display only — **never** trusted at checkout).
- Guest browsing is allowed; cart for a non-authenticated visitor is held client-side (localStorage/AsyncStorage) and merged into the server cart immediately after login/OTP verification. Merge rule: if the same variant exists in both, quantities are summed (capped at a max-per-item quantity, default 20, admin-configurable in `store_settings`).
- Adding an out-of-stock or inactive variant is rejected with a clear error; if a variant already in the cart goes out of stock before checkout, the cart view flags it and blocks checkout until resolved (removed or replaced).
- Cart subtotal, discounts, and totals shown in the cart UI are always freshly computed by the backend on fetch (`GET /cart`), never cached client-side beyond the current render.

## 3. Checkout & Orders

### 3.1 Checkout Steps (both web & mobile, same backend calls)
1. Review cart (server-validated).
2. Select/create delivery address; validate pincode against serviceable list.
3. Select delivery date + slot (see `14-DELIVERY-SYSTEM.md`).
4. Apply coupon (optional) — server validates and returns discount breakdown.
5. Choose payment method: COD (if eligible) or Razorpay online payment.
6. Place order.

### 3.2 Server-Side Order Computation (mandatory, see `08-SECURITY.md`)
On `POST /checkout` (or equivalent), the backend, inside a single DB transaction:
1. Re-fetches each cart item's current variant price and stock status from the DB — ignores any price sent by the client.
2. Recomputes subtotal.
3. Re-validates and applies coupon (if any) per its current rules.
4. Computes delivery charge per `store_settings`/delivery zone rules (flat fee or free-above-threshold — configurable).
5. Computes tax if `store_settings.tax_enabled` (GST is typically not charged by small unregistered sweets sellers, but the field exists for compliance flexibility).
6. Computes final total.
7. Creates `orders` + `order_items` (snapshotting product name, variant label, unit price, quantity at order time — historical accuracy even if catalogue changes later).
8. Decrements/flags variant stock if `stock_quantity` tracking is enabled for that variant.
9. If COD: order status starts at `PLACED`, `payment_status = 'COD_PENDING'`.
10. If online payment: a Razorpay order is created and returned to the client to open the checkout widget; the platform order stays in a `PENDING_PAYMENT` sub-state (or `orders.payment_status='PENDING'`) until the webhook/verification step confirms payment (see `09-PAYMENTS.md`). The platform `orders` row is created before payment to reserve stock/slot capacity, with a short expiry (e.g., 15 minutes) after which unpaid orders are auto-cancelled and stock/slot capacity released (background job or on-access check).
11. Idempotency: checkout accepts an `Idempotency-Key` header; a retried request with the same key and same cart state returns the original created order rather than creating a duplicate (see `08-SECURITY.md` §13, `09-PAYMENTS.md` §Idempotency).

### 3.3 Order Status Lifecycle
```
PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED
                                                                     
Any of PLACED/CONFIRMED/PREPARING → CANCELLED (admin or customer, before dispatch)
PENDING_PAYMENT / online-payment orders → PAYMENT_FAILED (if verification fails)
DELIVERED or CANCELLED(paid) → REFUNDED (if a refund is issued)
```
- Forward-only transitions enforced server-side via an explicit allowed-transitions map (see `04-ARCHITECTURE.md` §Order State Machine). No status may move backwards except into `CANCELLED`/`REFUNDED` from an allowed prior state.
- Every transition is recorded (timestamp + actor) — either as columns on `orders` (e.g., `confirmed_at`, `delivered_at`) or a lightweight `order_status_history` pattern via `audit_logs`. V1 uses discrete timestamp columns for the common statuses plus `audit_logs` for a full trail.

### 3.4 Order History & Tracking
- Customer sees own orders only (`orders.user_id = current_user`), paginated, newest first.
- Order detail includes a simple vertical timeline UI showing completed vs pending steps.

### 3.5 Reorder
- `POST /orders/{id}/reorder`: for each `order_item`, checks if the same `product_variant_id` is still active/in-stock; adds available ones to the current cart at current price (not historical price); returns a summary of what was added vs skipped.

## 4. Addresses

- `addresses`: belongs to a user, fields: label (Home/Work/Other), recipient_name, phone, line1, line2, city, state, pincode, landmark, latitude/longitude (optional, from Maps autocomplete), delivery_instructions, is_default.
- Serviceability check: pincode must be in `store_settings.serviceable_pincodes` (array or a small `serviceable_areas` table if the list grows/needs per-area delivery fees — V1 uses a simple array in `store_settings` unless per-area fees are required, in which case a `delivery_zones` table is introduced — see `05-DATABASE-SCHEMA.md` notes).

## 5. Coupons & Offers

- **Coupons**: code (unique, case-insensitive), type (`PERCENTAGE`/`FLAT`), value, min_order_value, max_discount_amount (cap for percentage coupons), valid_from/valid_until, usage_limit_total, usage_limit_per_user, is_active. Tracked usage in `coupon_usage` (coupon_id, user_id, order_id, used_at) to enforce per-user limits and prevent double-use on the same order.
- **Offers**: simpler, display-only promotional callouts (e.g., "10% off on hampers this Diwali") optionally linked to a coupon code for the actual mechanics; managed via `offers` table for homepage/banner display.
- **Banners**: homepage carousel/promo images with optional link target (category, product, or offer), display order, active window (start/end date), is_active.

## 6. Sweets-Specific Features

### 6.1 Weight Variants
Covered in §1.3. UI must show weight prominently next to price (e.g., "500g — ₹450").

### 6.2 Gift Hampers
- `gift_hampers`: name, description, images, hamper_price (can be flat or sum-of-items with a discount), is_active.
- `gift_hamper_items`: hamper_id, product_id, product_variant_id, quantity — defines composition, shown on the hamper's detail page ("What's inside").
- A hamper is ordered as a single line item (its own pseudo "product" in the cart/order context) — implemented either as a special product type or a distinct order-item kind; V1 approach: hampers are represented as `order_items` with `item_type='HAMPER'` referencing `gift_hamper_id` instead of `product_variant_id` (schema supports nullable FKs for both, with a `CHECK` ensuring exactly one is set — see `05-DATABASE-SCHEMA.md`).

### 6.3 Festival Collections
- Implemented via `categories` (e.g., "Diwali Specials") or `tags` on products — no separate table needed. Admin toggles a category/tag active for the relevant season.

### 6.4 Scheduled / Advance Orders
- Standard checkout flow already requires a delivery date/slot; "advance order" is simply a delivery date further in the future than the next available slot. `delivery_slots` must support generating slots several weeks ahead (see `14-DELIVERY-SYSTEM.md`).

### 6.5 Bulk-Order / Corporate / Wedding Enquiries
- Separate lightweight flow, not a checkout: a form capturing name, phone, email (optional), event_type (`BULK`/`CORPORATE`/`WEDDING`/`OTHER`), event_date, estimated_quantity_or_budget, items_of_interest (free text or selected product tags), message/notes.
- Creates `bulk_order_enquiries` row with status `NEW`; triggers an admin notification/email. No payment, no order created. Admin manages status (`NEW → CONTACTED → QUOTED → WON/LOST`) from the admin panel.

### 6.6 Special Instructions & Packaging Notes
- Free-text fields on the order (`orders.special_instructions`, `orders.packaging_notes`), shown to admin/staff on the order detail and any kitchen/prep view.

## 7. Reviews

- A review may only be created by a user for a `product_id` they have a `DELIVERED` order containing that product (verified-purchase model) — enforced server-side by checking `order_items`/`orders` before insert.
- Fields: rating (1–5), comment (optional), is_published (defaults false; admin moderates before it appears publicly) — reduces spam/abuse risk given no other moderation system exists in V1.

## 8. Notifications

Covered in detail in `10-NOTIFICATIONS.md`. Summary of triggers: order placed, order status changed, payment failed, promotional (opt-in only).

## 9. Delivery Management

Covered in detail in `14-DELIVERY-SYSTEM.md`.

## 10. Analytics (Admin)

- V1 scope: dashboard summary counts (today's orders/revenue, pending orders, low-stock variants) computed via straightforward SQL aggregate queries (no separate analytics pipeline/warehouse in V1).
- Sales report: date-range revenue and order-count, optionally grouped by category/product, via parameterized queries — see `11-ADMIN-PANEL.md`.

## 11. Explicitly Deferred (see `25-FUTURE-ROADMAP.md`)
Loyalty points, referrals, multi-branch, delivery-partner app, WhatsApp integration, AI support, advanced analytics/warehouse, dynamic pricing.
