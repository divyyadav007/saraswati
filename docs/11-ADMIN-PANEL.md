# 11-ADMIN-PANEL.md

## 1. Placement & Access

Lives inside `apps/web` under `app/admin/**` (see `04-ARCHITECTURE.md` ADR-0001), same Next.js deployment as the storefront, protected by Next.js middleware checking role (`ADMIN`/`STAFF`) before render, with the real enforcement on the backend (`08-SECURITY.md`). Login page: `app/admin/login` — email + password (Supabase Auth), separate from the customer phone-OTP flow.

## 2. Audience & Design Constraint

Primary user is a **non-technical shop owner**. Every screen must be understandable without training: clear labels (not jargon like "SKU" alone without a hint), obvious primary actions, confirmation dialogs before irreversible actions, no dense unexplained data tables without context.

## 3. Screens

### 3.1 Dashboard (landing page after login)
- Today's order count, today's revenue, pending-orders count (orders not yet DELIVERED/CANCELLED), low-stock/out-of-stock variant alerts.
- Quick links: "New Orders", "Add Product", "View Bulk Enquiries".
- Simple sales trend (last 7/30 days) as a line/bar chart.

### 3.2 Products
- Table: image thumbnail, name, category, price range, status (active/inactive), stock summary (e.g., "2/3 variants in stock").
- Add/Edit Product form: name, category (select), description, tags, image upload (multi, drag to reorder, one marked primary), is_featured toggle, is_active toggle.
- Variant management nested in the product edit screen: add/edit/remove variants (label, weight, price, MRP, SKU, stock status/quantity, active toggle) — inline table, not a separate page, to keep the mental model simple ("this product has these weight options").

### 3.3 Categories
- Simple table + add/edit form (name, slug auto-generated from name but editable, image, display order via drag-and-drop or numeric input, active toggle).

### 3.4 Orders
- Default view: list sorted newest-first, status filter tabs (All / New / In Progress / Completed / Cancelled — mapped to underlying statuses), search by order number or customer phone.
- Order detail: customer info, delivery address, slot, items, special instructions/packaging notes, payment status, a clear "Update Status" control showing only the valid next statuses (per the state machine), "Assign Delivery" control, "Refund" action (visible only when applicable).
- Status update triggers the relevant customer notification automatically (no separate manual step for the admin).

### 3.5 Customers
- Table: name, phone, total orders, total spend, joined date. Detail view: order history for that customer, saved addresses (read-only for admin).

### 3.6 Coupons
- Table + form: code, type (percentage/flat), value, min order value, max discount cap, validity dates, usage limits, active toggle. Usage count shown read-only (from `coupon_usage`).

### 3.7 Offers & Banners
- Simple CRUD screens with image upload, link target picker (category/product/offer/URL), active window dates, display order.

### 3.8 Gift Hampers
- Table + form: name, description, images, hamper price, composition builder (add product + variant + quantity rows), active toggle.

### 3.9 Bulk-Order Enquiries
- Table: name, phone, type, event date, status, submitted date. Detail view: full message, admin notes field, status dropdown (`NEW → CONTACTED → QUOTED → WON/LOST`).

### 3.10 Delivery
- Delivery Partners: simple list + add/edit (name, phone, active toggle).
- Delivery Slots: calendar/list view of slots per date, capacity, booked count; bulk-generate slots for a date range with a recurring weekly template (e.g., "every day, 10am–1pm and 4pm–7pm, capacity 15") to avoid the owner manually creating slots one by one.

### 3.11 Reports
- Date-range picker; revenue + order-count summary; breakdown table by category or product; simple export-to-CSV button (client-side CSV generation from the fetched report data — no separate export service needed in V1).

### 3.12 Store Settings
- Store name/phone/email/address, business hours, serviceable pincodes (tag input), COD enabled + limit, delivery charge/free-delivery threshold, tax settings.

## 4. Roles in the UI

- `ADMIN`: sees everything, including Store Settings and user/role-sensitive areas.
- `STAFF`: sees Orders, Customers (read-only sensitive fields as needed), Delivery, Bulk Enquiries; does not see Store Settings, Coupons (unless explicitly granted — V1 default: STAFF has no access to Coupons/Store Settings), and cannot delete products/categories (can edit stock/availability only) — exact per-screen permission matrix finalized during implementation but must default to the more restrictive option when ambiguous, per the least-privilege principle in `08-SECURITY.md`.

## 5. Responsiveness

Admin panel must be usable on a phone browser (the owner will often check orders from their phone) — tables become stacked cards or horizontally scrollable on narrow viewports; primary actions remain reachable without horizontal scrolling.

## 6. Real-Time-ish Order Awareness

V1 uses polling (e.g., every 15–30 seconds while the Orders screen is open) to refresh the "new orders" count/list rather than a WebSocket/real-time subscription, to keep the backend simple. Supabase Realtime is a documented future upgrade if the polling approach proves insufficient (`25-FUTURE-ROADMAP.md`).
