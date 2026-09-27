# 02-PRD.md — Product Requirements Document

## 1. Purpose

Defines *what* must be built for V1, expressed as user stories with concrete acceptance criteria. This is the contract against which "done" is measured. See `03-FEATURE-SPECIFICATION.md` for the deeper functional detail behind each story, and `15-TESTING-STRATEGY.md` for the test checklist derived from these criteria.

## 2. Personas

- **Priya (Customer)** — orders sweets for family occasions and festivals, sometimes plans a delivery days in advance, occasionally orders in bulk for an office.
- **Ramesh (Owner/Admin)** — runs the shop, not a technical person, needs the dashboard to be obvious.
- **Staff (Order Manager)** — helps Ramesh process orders during busy periods.

## 3. Epics and User Stories

### Epic A — Catalogue Browsing

- **A1.** As a customer, I can view a home page with featured/seasonal products, categories, and banners, so I can quickly find what I want.
  - AC: Home page loads product data from `GET /api/v1/home` (or equivalent) within 2s on 4G; shows at least categories, featured products, active banners.
- **A2.** As a customer, I can browse products by category, so I can narrow my search.
  - AC: `GET /api/v1/categories` and `GET /api/v1/products?category=<slug>` return paginated results; empty category shows a friendly empty state, not an error.
- **A3.** As a customer, I can search products by name, so I can find a specific sweet quickly.
  - AC: `GET /api/v1/products?q=<term>` performs case-insensitive partial match on product name (and optionally description); results paginated.
- **A4.** As a customer, I can filter products (category, price range, availability), so I can narrow choices.
  - AC: Filters are query params, combinable, documented in `06-API-SPECIFICATION.md`.
- **A5.** As a customer, I can view a product detail page showing images, description, all weight/variant options with per-variant price and stock status, so I can choose the right variant.
  - AC: Out-of-stock variants are visibly disabled, not purchasable; price shown always matches server-side `product_variants.price`.

### Epic B — Cart & Checkout

- **B1.** As a customer, I can add a specific product variant and quantity to my cart, so I can buy more than one item.
  - AC: Cart is persisted server-side per authenticated user (`carts`/`cart_items`); guest cart may be stored client-side and merged into server cart on login (see `03-FEATURE-SPECIFICATION.md` §Cart).
- **B2.** As a customer, I can view/edit/remove cart items and see a live subtotal, so I know what I'm about to pay.
  - AC: Subtotal is server-computed on every cart fetch; client never computes the trusted total.
- **B3.** As a customer, I can select or add a delivery address during checkout, so my order goes to the right place.
  - AC: Address form validates required fields (line1, city, state, pincode, phone); pincode checked against serviceable pincodes list in `store_settings` — unserviceable pincode blocks checkout with a clear message.
- **B4.** As a customer, I can choose a delivery date and time slot, so my order arrives when I need it (including advance/scheduled orders for festivals).
  - AC: Slots are drawn from `delivery_slots` for the selected date; a slot cannot be selected once its capacity is reached or its cutoff time has passed.
- **B5.** As a customer, I can apply a coupon code at checkout, so I can get the discount I'm entitled to.
  - AC: Coupon validity (date range, min order value, usage limit, per-user limit) is validated server-side at both "apply" time and again at order-placement time.
- **B6.** As a customer, I can choose COD or online payment (Razorpay), so I can pay how I prefer.
  - AC: COD option is hidden/disabled automatically if the order total exceeds the configured COD limit or the item set is COD-ineligible (e.g., gift hampers above a value threshold, admin-configurable).
- **B7.** As a customer, after placing an order I see an order confirmation with order number, items, amount, delivery slot, and payment status.
  - AC: Order is only created after price/discount/delivery-charge recomputation server-side; for online payment, order is marked `PLACED`/paid only after Razorpay signature verification succeeds.

### Epic C — Order Tracking & History

- **C1.** As a customer, I can view my order history, so I can see past and current orders.
- **C2.** As a customer, I can view a single order's current status and a simple status timeline, so I know where my order stands.
- **C3.** As a customer, I can reorder a past order in one action, so I don't have to re-browse everything.
  - AC: Reorder adds all still-available items/variants from the past order to the current cart; unavailable items are flagged and skipped with a message.

### Epic D — Account & Addresses

- **D1.** As a customer, I can register/log in via phone number + OTP.
- **D2.** As a customer, I can save multiple delivery addresses and mark a default.
- **D3.** As a customer, I can view/edit my profile (name, email optional, phone).

### Epic E — Sweets-Specific Ordering

- **E1.** As a customer, I can browse and order gift hampers (pre-composed sets of items), so I can gift conveniently.
- **E2.** As a customer, I can submit a bulk-order enquiry (event date, estimated quantity, items of interest, contact details) without needing to complete a full cart checkout, so I can get a custom quote for weddings/corporate/functions.
  - AC: Enquiry creates a `bulk_order_enquiries` record and triggers an admin notification (and optionally email); it is not an order and does not go through payment.
- **E3.** As a customer, I can add special instructions and custom packaging notes to my order.

### Epic F — Notifications

- **F1.** As a customer, I receive a push notification (mobile) and/or email when my order is confirmed and when its status changes.
- **F2.** As a customer, I can opt out of promotional notifications while still receiving transactional ones.

### Epic G — Admin: Catalogue Management

- **G1.** As an admin, I can create/edit/deactivate categories and products, including images and multiple weight variants with individual prices and stock flags.
- **G2.** As an admin, I can mark a variant temporarily out of stock without deleting it.

### Epic H — Admin: Order Management

- **H1.** As an admin, I can see a list of incoming orders (newest first), filterable by status and date.
- **H2.** As an admin, I can open an order and see full details: items, customer, address, slot, payment status, special instructions.
- **H3.** As an admin, I can move an order through its status lifecycle (`PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED`), or cancel it, with each transition validated (no skipping backwards, no invalid jumps).
- **H4.** As an admin, I can assign a delivery person to an order.
- **H5.** As an admin, I can process a refund for a cancelled paid order (triggers Razorpay refund, updates `payments`/`orders`).

### Epic I — Admin: Customers, Coupons, Offers, Banners

- **I1.** As an admin, I can view a customer list with basic order history per customer.
- **I2.** As an admin, I can create/edit/deactivate coupons (percentage or flat discount, validity window, min order value, usage limits).
- **I3.** As an admin, I can create/edit/deactivate homepage banners and highlighted offers.

### Epic J — Admin: Bulk Enquiries & Gift Hampers

- **J1.** As an admin, I can view and respond-to-status (New/Contacted/Quoted/Won/Lost) bulk-order enquiries.
- **J2.** As an admin, I can create/edit gift hampers as curated bundles of existing products with a hamper price.

### Epic K — Admin: Reports & Settings

- **K1.** As an admin, I can see a simple dashboard: today's orders, today's revenue, pending orders count, low-stock alerts.
- **K2.** As an admin, I can view basic sales reports (by day/week/month, by category/product).
- **K3.** As an admin, I can configure store settings: delivery slots/cutoffs, serviceable pincodes, COD limit, tax rate (if applicable), contact info, business hours.

## 4. Out of Scope for V1

See `01-PROJECT-OVERVIEW.md` §4 and `25-FUTURE-ROADMAP.md`.

## 5. Cross-Cutting Acceptance Criteria (apply to all epics)

- No endpoint that creates/updates an order, payment, or coupon usage trusts a client-supplied price, discount, or total (`04-ARCHITECTURE.md` / `08-SECURITY.md`).
- Every admin-only endpoint rejects non-admin/staff tokens with `403`.
- Every list endpoint supports pagination (`06-API-SPECIFICATION.md`).
- Every user-facing error returns a stable error code + human-readable message per `22-ERROR-HANDLING.md`, never a raw stack trace.

## 6. Prioritization for V1

Must-have (blocks launch): Epics A, B, C (core flow), D (auth), G, H (admin core), payments (`09-PAYMENTS.md`), delivery slots (`14-DELIVERY-SYSTEM.md`).
Should-have (launch-desirable, can slip a few days): E2/E3, F, I2/I3, K1/K2.
Nice-to-have (post-launch iteration): E1 (gift hampers UI polish), J2, reviews, advanced reports.
