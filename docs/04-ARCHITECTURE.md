# 04-ARCHITECTURE.md

## 1. Architectural Style

**Modular monolith.** One FastAPI backend service, organized into domain modules, backed by one Supabase PostgreSQL database. One Next.js web app serving both the public storefront and (as a protected route group) the admin dashboard. One Expo React Native app for the customer-facing Android experience. No microservices, no message broker, no separate services per domain, in V1.

Rationale: team size, traffic expectations, and operational budget in V1 do not justify distributed-systems complexity. The modular structure (clear module boundaries inside the monolith) is what makes a future split into services possible later without a rewrite — see `25-FUTURE-ROADMAP.md`.

## 2. High-Level System Diagram (textual)

```
┌────────────────┐      ┌─────────────────────┐
│  Next.js Web    │      │  Expo Mobile App     │
│  (storefront +  │      │  (customer only)     │
│  /admin routes) │      │                      │
└───────┬────────┘      └──────────┬───────────┘
        │        HTTPS / REST (JSON)           │
        └───────────────┬──────────────────────┘
                         ▼
                ┌──────────────────┐
                │   FastAPI Backend │
                │  (modular monolith)│
                │  - auth           │
                │  - catalog        │
                │  - cart           │
                │  - checkout/orders│
                │  - payments       │
                │  - delivery       │
                │  - coupons/offers │
                │  - notifications  │
                │  - reviews        │
                │  - bulk_enquiries │
                │  - admin/analytics│
                └────────┬──────────┘
                         │
        ┌────────────────┼─────────────────┬─────────────────┐
        ▼                ▼                 ▼                 ▼
 ┌─────────────┐  ┌──────────────┐  ┌─────────────┐   ┌──────────────┐
 │ Supabase     │  │ Supabase      │  │ Razorpay    │   │ FCM / Resend │
 │ Postgres     │  │ Auth+Storage  │  │ (payments)  │   │ (notify/email)│
 └─────────────┘  └──────────────┘  └─────────────┘   └──────────────┘
```

Both web and mobile talk **only** to the FastAPI backend for business operations (catalogue reads may optionally go through the backend as well, for consistency — see §4). Neither frontend talks to Razorpay's server APIs directly (only the client-side checkout widget, which never sees secrets), nor to the Supabase service-role key.

## 3. Module Boundaries (Backend)

Each module under `services/api/app/modules/<name>/` contains:
```
<name>/
  router.py        # FastAPI route definitions, thin
  schemas.py        # Pydantic request/response models
  service.py         # business logic
  repository.py       # SQLAlchemy queries / DB access
  __init__.py
```
Modules: `auth`, `catalog` (categories/products/variants/images), `cart`, `checkout`, `orders`, `payments`, `delivery` (slots/assignment), `coupons`, `offers_banners`, `reviews`, `notifications`, `bulk_enquiries`, `gift_hampers`, `admin` (cross-cutting admin-only aggregation endpoints), `analytics`, `store_settings`, `common` (shared utilities: pagination, error types, auth dependencies).

**Rule:** a module may call another module's `service` layer function directly (in-process), but must not reach into another module's `repository` layer or ORM models directly, to keep boundaries clean for a possible future service split.

## 4. Frontend Data Access Pattern

- **All writes** (cart mutation, checkout, order status change, profile edits, admin CRUD) go through the FastAPI backend. Never direct writes from frontend to Supabase.
- **Reads**: for V1 simplicity, both web and mobile also read primarily through the FastAPI backend (catalogue, orders, etc.) rather than querying Supabase directly, so that all business rules (e.g., hiding inactive products) live in one place. Direct Supabase client reads from the frontend are **not used** in V1 to avoid duplicating filtering/visibility logic in RLS policies and in the API. This can be revisited later for specific low-risk, high-traffic read paths (e.g., product catalogue) as a performance optimization, documented as an ADR when it happens.
- Supabase is therefore used by the frontend only for: (a) Supabase Auth SDK calls (OTP send/verify, session token retrieval) and (b) Supabase Storage signed URLs for direct image upload from the admin panel (upload flow proxied/authorized by the backend, which issues a short-lived signed upload URL — the frontend never holds the service-role key).

## 5. Authentication & Session Flow

1. Customer: enters phone number → Supabase Auth sends OTP → customer enters OTP → Supabase Auth returns a JWT (access + refresh token) to the frontend.
2. Frontend attaches the Supabase JWT as `Authorization: Bearer <token>` on every backend API call.
3. FastAPI backend verifies the JWT against Supabase's JWKS/public key (or via Supabase's server SDK), extracts `user_id` and role claim, and uses this as the authenticated identity — the backend does not re-implement password/OTP logic; it trusts Supabase as the identity provider and layers its own `profiles`/`roles` table for app-specific role/permission data (Supabase Auth handles identity, the app DB handles authorization).
4. Admin/staff: same JWT mechanism, but login uses email+password via Supabase Auth; role is looked up from `profiles.role` after token verification.
5. See `08-SECURITY.md` for full detail.

## 6. Order State Machine (authoritative)

Allowed transitions (enforced in `orders` service module, not left to the frontend or ad-hoc SQL):

```
PENDING_PAYMENT -> PLACED (on payment success) | PAYMENT_FAILED | CANCELLED (on payment timeout)
PLACED          -> CONFIRMED | CANCELLED
CONFIRMED       -> PREPARING | CANCELLED
PREPARING       -> READY_FOR_PICKUP | CANCELLED
READY_FOR_PICKUP-> OUT_FOR_DELIVERY
OUT_FOR_DELIVERY-> DELIVERED
DELIVERED       -> REFUNDED   (only via explicit refund action)
CANCELLED(paid) -> REFUNDED   (only via explicit refund action)
```
COD orders skip `PENDING_PAYMENT`/`PAYMENT_FAILED` and start directly at `PLACED`.
Any transition not listed above is rejected with HTTP 409 and error code `INVALID_STATUS_TRANSITION`.

## 7. Transactions & Consistency

- Checkout (cart validation → price computation → order + order_items creation → stock decrement → slot capacity decrement) executes inside a single DB transaction (SQLAlchemy `session.begin()`), rolled back entirely on any failure.
- Payment confirmation (webhook handling → mark payment captured → update order status → release/confirm slot capacity) is similarly transactional, and is idempotent (processing the same Razorpay event/payment id twice has no additional effect) — see `09-PAYMENTS.md` §Idempotency.
- Coupon usage increment and order creation happen in the same transaction to avoid a coupon being "used" without a corresponding order (or vice versa).

## 8. Environments

Three environments: `development` (local), `staging` (optional, recommended before first real launch), `production`. Each has its own Supabase project (or at minimum its own schema/branch) and its own `.env` file — never share a database between environments. Full detail in `16-DEPLOYMENT.md` and `18-ENVIRONMENT-VARIABLES.md`.

## 9. Third-Party Service Abstraction

Every external integration is wrapped in an interface inside the backend so the concrete provider can change without touching business logic:

- `PaymentGateway` interface → `RazorpayGateway` implementation (create order, verify signature, process refund).
- `NotificationSender` interface → `FCMPushSender`, `ResendEmailSender` implementations.
- `FileStorage` interface → `SupabaseStorageClient` implementation.
- `MapsProvider` interface (thin) → Google Maps Geocoding/Places implementation, used only where address autocomplete/geocoding is actually needed.

Business logic (services) depends on these interfaces, not on the concrete SDKs, via simple dependency injection (constructor/function parameter, or FastAPI `Depends`).

## 10. Why Not Microservices / Kubernetes / Event Bus (explicit rationale)

- Expected V1 traffic (a single local shop) does not need independent scaling of components.
- A monolith with clean internal module boundaries is dramatically simpler to develop, test, deploy and debug with an AI coding agent and a small/no ops team.
- Free-tier hosting (Render/Railway/Fly.io-class platforms) targets single-service deployment; microservices would multiply hosting cost and complexity immediately, violating the cost principle in `17-FREE-TIER-SERVICES.md`.
- If/when scale demands it (see `25-FUTURE-ROADMAP.md`), the existing module boundaries are the seams along which services would be extracted (e.g., `payments` or `notifications` first).

## 11. Data Flow Example: Placing an Online-Payment Order

1. Client: `POST /api/v1/checkout` with address_id, slot_id, coupon_code (optional), payment_method=`ONLINE`.
2. Backend: validates cart, recomputes totals, creates `orders` row (`status=PENDING_PAYMENT`), creates a Razorpay order via `PaymentGateway.create_order(amount)`, stores `razorpay_order_id` on the `payments` row, returns `{order_id, razorpay_order_id, amount, key_id}` to client.
3. Client: opens Razorpay Checkout widget with returned data; user pays.
4. Razorpay: returns `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature` to the client, **and independently** calls the backend webhook.
5. Backend: on webhook (source of truth, not the client callback) verifies signature, marks `payments.status=CAPTURED`, transitions `orders.status PENDING_PAYMENT -> PLACED`, triggers order-confirmation notification.
6. Client: also calls `POST /api/v1/payments/verify` with the client-received values as a fast-path UX confirmation, but the backend independently re-verifies the signature there too — **the webhook is the authority**; the verify endpoint is only for immediate UI feedback and duplicates the same verification safely (idempotent).

## 12. Design Principle Checklist (must hold for every PR)

- [ ] No client-trusted money value persisted or acted upon.
- [ ] No secret present in frontend bundle or git history.
- [ ] Mutating endpoint wrapped in a DB transaction where multiple tables change together.
- [ ] Role check present on every admin/staff endpoint.
- [ ] New third-party dependency goes behind an interface if it's a swappable service (payment/notification/storage/maps).
