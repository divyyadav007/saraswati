# Phase 3: Cart & Checkout Core (No Payment Gateway Yet) Implementation Plan

## Overview
Phase 3 builds the transactional ordering core of the Saraswati platform. Following the development roadmap (`docs/19-DEVELOPMENT-ROADMAP.md` §Phase 3), the payment method is initially constrained to **Cash on Delivery (COD)** so that order creation, server-side price computation, delivery slot capacity, address validation, and order lifecycle states can be tested and verified in isolation before Phase 4's Razorpay integration.

---

## Scope & Deliverables

### 1. Backend Modules & Endpoints (`backend/app/modules/`)
1. **Addresses Module (`app/modules/addresses/`)**:
   - `GET /api/v1/addresses` — List user's saved addresses (excluding `is_deleted=True`).
   - `POST /api/v1/addresses` — Create address, validate pincode against serviceable list.
   - `PATCH /api/v1/addresses/{id}` — Update address.
   - `DELETE /api/v1/addresses/{id}` — Soft delete.
   - `POST /api/v1/addresses/{id}/set-default` — Set as default address.
   - `GET /api/v1/addresses/check-serviceability?pincode=225001` — Check pincode against store settings / Barabanki serviceable areas.

2. **Delivery Slots Module (`app/modules/delivery/`)**:
   - `GET /api/v1/delivery-slots?date=YYYY-MM-DD` — Public/authenticated. Returns available slots (e.g. Morning 10AM-1PM, Evening 4PM-7PM) with remaining capacity for the given date, filtering out slots whose cutoff time has passed.
   - Slot generation helper for upcoming dates (per `docs/14-DELIVERY-SYSTEM.md`).

3. **Cart Module (`app/modules/cart/`)**:
   - `GET /api/v1/cart` — Retrieve active cart, recalculating current prices from `product_variants` and verifying stock status.
   - `POST /api/v1/cart/items` — Add product variant to cart (validates `IN_STOCK`, positive quantity, max quantity per item limit).
   - `PATCH /api/v1/cart/items/{item_id}` — Update item quantity (or remove if quantity <= 0).
   - `DELETE /api/v1/cart/items/{item_id}` — Remove item from cart.
   - `POST /api/v1/cart/merge` — Merge guest cart items upon login (sums quantities up to store limit).

4. **Checkout & Orders Module (`app/modules/checkout/`, `app/modules/orders/`)**:
   - `POST /api/v1/checkout` with `Idempotency-Key` header:
     - Server-side validation of address and pincode.
     - Slot capacity validation and booking increment.
     - Fresh price computation directly from DB variants (never trusting client).
     - Subtotal, delivery fee rule calculation (e.g. Free delivery above ₹500, else flat ₹40), and tax if enabled.
     - Creation of `Order` (`order_number` e.g. `SB-YYYYMMDD-XXXX`) and `OrderItem` records with snapshot data.
     - Setting order status to `PLACED`, `payment_method = 'COD'`, `payment_status = 'COD_PENDING'`.
     - Decrementing stock quantities if tracked.
     - Clearing the active cart items.
   - `GET /api/v1/orders` — Customer's paginated order history.
   - `GET /api/v1/orders/{id}` — Single order detail with items, delivery slot, and address snapshot.
   - `POST /api/v1/orders/{id}/cancel` — Customer cancellation if status is `PLACED` or `CONFIRMED`.
   - `POST /api/v1/orders/{id}/reorder` — Re-adds active, in-stock items from a past order back into active cart.

5. **Admin Orders Management (`app/modules/orders/admin_router.py`)**:
   - `GET /api/v1/admin/orders` — List and filter orders by status, date range, search query.
   - `GET /api/v1/admin/orders/{id}` — Detailed order view.
   - `PATCH /api/v1/admin/orders/{id}/status` — Status transitions according to the state machine (`PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED`, or `CANCELLED`).

---

### 2. Frontend Storefront Web App (`apps/web/`)
1. **API Client Integration (`apps/web/lib/api-client.ts`)**:
   - Add typed API methods for Cart, Addresses, Delivery Slots, Checkout, and Orders.
2. **Cart Context / Local Cart Synchronization**:
   - Client-side storage for guests, seamless merge upon authentication.
3. **Cart Drawer / Dedicated Cart Page (`apps/web/app/(storefront)/cart/page.tsx`)**:
   - List items with thumbnail, weight variant, unit price, quantity stepper, remove button.
   - Order summary (subtotal, delivery fee calculation, savings).
   - "Proceed to Checkout" button.
4. **Checkout Multi-Step Flow (`apps/web/app/(storefront)/checkout/page.tsx`)**:
   - Step 1: Delivery Address (select existing or add new Barabanki address with pincode verification).
   - Step 2: Delivery Date & Slot selection.
   - Step 3: Special instructions & packaging notes.
   - Step 4: Payment method selection (COD enabled, Online marked "Coming in Phase 4").
   - Step 5: Place Order with idempotency protection.
5. **Order Confirmation & Tracking Page (`apps/web/app/(storefront)/orders/[id]/page.tsx`)**:
   - Order placed confirmation, timeline tracker, address & items summary.
6. **Customer Account Orders List (`apps/web/app/(storefront)/account/orders/page.tsx`)**:
   - Listing of previous orders with status badges and "Reorder" action.
7. **Admin Orders Screen (`apps/web/app/admin/orders/page.tsx`)**:
   - Admin view of incoming orders, status transition buttons, item inspection.

---

### 3. Automated Backend Tests (`backend/tests/`)
- `tests/test_cart.py`: Cart lifecycle, adding items, updating quantity, stock validation, cart merge.
- `tests/test_checkout.py`: Checkout calculation, COD order creation, idempotency prevention of duplicate orders, stock decrement, slot booking, customer order history, and admin status updates.
