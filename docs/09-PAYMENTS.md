# 09-PAYMENTS.md

## 1. Provider

**Razorpay** — chosen per requirements. Standard Checkout (hosted widget) integration for V1, not a custom card-collection UI (avoids PCI-DSS scope entirely — card data never touches our servers or frontend code).

## 2. Flow Overview

```
1. Customer completes checkout form on web/mobile → POST /api/v1/checkout (payment_method=ONLINE)
2. Backend: validates cart + computes total server-side, creates local `orders` row (status=PENDING_PAYMENT),
   calls Razorpay Orders API to create a Razorpay order for that exact amount, stores razorpay_order_id on
   a `payments` row, returns {order_id, razorpay_order_id, amount, currency, key_id} to client.
3. Client: opens Razorpay Checkout (web JS SDK / React Native SDK) with the returned razorpay_order_id.
4. Customer pays via UPI/card/netbanking/wallet inside Razorpay's hosted UI.
5. Razorpay: (a) returns razorpay_payment_id + razorpay_signature to the client on success, AND
              (b) independently sends a `payment.captured` (or `order.paid`) webhook to our backend.
6. Backend webhook handler (source of truth): verifies signature, marks payment CAPTURED, order PLACED,
   triggers confirmation notification.
7. Client also calls POST /api/v1/payments/verify with its received values as an immediate UX confirmation;
   backend re-verifies signature there too (idempotent — safe if webhook already processed it).
8. If customer abandons/fails payment: order remains PENDING_PAYMENT; a background job (or lazy check on
   next fetch of that order) marks it PAYMENT_FAILED/CANCELLED after a timeout window (e.g., 15-30 minutes)
   and releases the reserved delivery-slot capacity and any decremented stock.
```

## 3. Order Creation (Razorpay side)

- Amount is always taken from the backend's own server-computed `orders.total_amount` (in paise, as Razorpay expects), never from any client input.
- `receipt` field set to our internal `order_number` for cross-referencing in the Razorpay dashboard.
- `notes` field may carry `{internal_order_id}` for support/debugging.

## 4. Signature Verification

- Checkout success callback (client-side) provides `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.
- Backend recomputes `HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)` and compares to the provided signature using constant-time comparison. Mismatch → reject, mark `payments.status=FAILED`, do **not** change order status to PLACED.
- Webhook payloads are verified separately using the **webhook secret** (different from the API key secret) against the `X-Razorpay-Signature` header over the raw request body, per Razorpay's webhook verification method.

## 5. Webhook Handling

- Endpoint: `POST /api/v1/payments/webhook/razorpay`. No user JWT (Razorpay is the caller) — protected solely by signature verification.
- Events handled at minimum: `payment.captured`, `payment.failed`, `refund.processed`.
- Idempotency: before applying any state change, check whether this specific event (by Razorpay's event `id`, or by `razorpay_payment_id` + event type) has already been processed (e.g., a small `processed_webhook_events(event_id unique, processed_at)` table, or check current `payments.status` is not already terminal for that transition) — re-delivery of the same webhook (Razorpay retries on non-2xx) must not double-apply effects (e.g., must not send two confirmation notifications, must not double-decrement stock).
- Always return `200` quickly once verified and queued/processed; do heavy notification-sending work after the DB transaction commits (can be synchronous for V1 given low volume, or offloaded to a lightweight background task — FastAPI `BackgroundTasks` is sufficient for V1 scale).

## 6. COD Handling

- COD allowed only when `store_settings.cod_enabled=true` and `orders.total_amount <= store_settings.cod_limit_amount`, and no COD-ineligible items are present (e.g., certain high-value hampers, admin-configurable via a flag if needed later — V1 keeps this simple with just the amount cap).
- COD orders: `payment_status=COD_PENDING` at placement, set to `CAPTURED` by admin when cash is physically collected on delivery (`PATCH /admin/orders/{id}/status` to `DELIVERED` can require confirming payment collection, or a small explicit admin action `mark-cod-collected` — decide at implementation; documented default: marking an order `DELIVERED` for a COD order also prompts/sets `payment_status=CAPTURED`).

## 7. Refunds

- Admin-initiated only (`POST /admin/orders/{id}/refund`), requires `ADMIN` role.
- Calls Razorpay's Refunds API for the original `razorpay_payment_id`, full or partial amount.
- On success: updates `payments.refunded_amount`, sets `orders.status=REFUNDED` (if full refund of a cancelled/returned order) and `payments.status=REFUNDED`.
- Refund webhook (`refund.processed`) is also handled for eventual consistency in case the synchronous admin-triggered call's response is inconclusive (network timeout etc.) — the webhook is the final source of truth here too.
- COD orders are never "refunded" via Razorpay (no online payment exists); a COD cancellation before delivery simply cancels the order with no payment gateway interaction.

## 8. Idempotency Summary

| Scenario | Idempotency mechanism |
|---|---|
| Customer double-taps "Place Order" | `Idempotency-Key` header on `/checkout`, unique on `orders.idempotency_key` |
| Razorpay retries a webhook | Check processed-event record / current payment status before reapplying |
| Client calls `/payments/verify` after webhook already processed | Verify signature again (safe), but state-changing side effects (notification, stock decrement) only fire once, guarded by current status check |
| Admin double-clicks "Refund" | Backend checks `payments.status != REFUNDED` before calling Razorpay again |

## 9. Currency & Amounts

- All amounts stored in the database as `numeric(10,2)` INR (rupees, not paise) for readability in admin views/reports; converted to paise (`int(amount * 100)`) only at the Razorpay API boundary.

## 10. Testing

- Razorpay Test Mode keys used in `development`/`staging` environments (see `18-ENVIRONMENT-VARIABLES.md`). Test-mode UPI/card credentials from Razorpay's documentation used for manual and automated flow testing. See `15-TESTING-STRATEGY.md` §Payment Flow Tests.

## 11. Future Extensibility

- The `PaymentGateway` interface (see `04-ARCHITECTURE.md` §9) means adding a second provider (e.g., a UPI-only lightweight gateway, or Stripe for a future international angle) requires a new adapter implementation, not changes to checkout/order logic.
