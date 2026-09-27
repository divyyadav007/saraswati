# 08-SECURITY.md

## 1. Authentication

- Identity provider: **Supabase Auth**. Customers authenticate via phone number + OTP; admin/staff via email + password (Supabase Auth's email/password flow, with a strong-password policy enforced by Supabase config: min 10 chars).
- Sessions: Supabase issues short-lived JWT access tokens + longer-lived refresh tokens. Frontends use the Supabase client SDK to manage refresh automatically; tokens stored in secure storage (HttpOnly-equivalent handling on web via Supabase's SSR helpers where practical, or memory + secure refresh flow; Expo `SecureStore` on mobile — never `AsyncStorage` plaintext for tokens).
- Backend verification: every authenticated FastAPI request verifies the bearer JWT's signature against Supabase's JWKS (cached, refreshed periodically) and checks expiry; a FastAPI dependency (`get_current_user`) centralizes this so no route re-implements verification.

## 2. Authorization / RBAC

- Roles: `CUSTOMER`, `STAFF`, `ADMIN`, (`DELIVERY` reserved for future partner-app use, not actively used for auth checks in V1 beyond being a valid enum value).
- Role stored in `profiles.role`, looked up after JWT verification (not trusted from any client-supplied header/claim beyond the verified `user_id`).
- FastAPI dependencies: `require_role(*roles)` used as a route dependency on every admin/staff endpoint (`/api/v1/admin/**`). `STAFF` has access to orders/customers/delivery endpoints but not store settings, coupons, or user-role management — enforced by requiring `ADMIN` specifically on those sensitive endpoints.
- Customer-facing endpoints that return user-specific data (cart, orders, addresses) always filter by the authenticated `user_id` server-side — never accept a `user_id` from the request body/query for these.

## 3. Admin API Protection

- All `/api/v1/admin/**` routes require a valid JWT **and** role ∈ {ADMIN, STAFF} (or {ADMIN} only, per endpoint as noted in `06-API-SPECIFICATION.md`).
- Admin panel routes on the frontend (`apps/web/app/admin/**`) are additionally protected by Next.js middleware that checks the session/role before rendering, redirecting unauthenticated/unauthorized users to login — this is a UX convenience, not the security boundary; the real boundary is always the backend API check.
- Swagger/OpenAPI docs (`/api/v1/docs`) disabled or IP/basic-auth restricted in production.

## 4. Input Validation & Sanitization

- All request bodies parsed and validated by Pydantic models with explicit types, length limits, and format validators (phone, pincode, email) — no raw dict/`Any` bodies on business endpoints.
- Free-text fields (special instructions, review comments, enquiry messages) are length-capped and HTML-escaped on render (React/Next.js escapes by default; avoid `dangerouslySetInnerHTML` entirely for user-supplied content) to prevent stored XSS.
- File uploads (product images) validated for MIME type and size limit (e.g., ≤5MB, JPEG/PNG/WebP only) before accepting/forwarding to Supabase Storage.

## 5. SQL Injection Prevention

- All DB access via SQLAlchemy ORM/Core with parameterized queries. No raw string-interpolated SQL. If a raw query is ever unavoidable (complex report), it must use bound parameters exclusively — never f-string interpolation of user input into SQL.

## 6. XSS Prevention

- React/Next.js's default JSX escaping is relied upon; no unescaped HTML injection from user content.
- Content-Security-Policy header set on the web app restricting script sources to self + required third-party script origins (Razorpay checkout script, Google Maps script if used) — see `16-DEPLOYMENT.md` for header configuration.

## 7. CSRF Considerations

- Because the API is a separate origin consumed via `Authorization: Bearer` tokens (not cookies) for the primary auth mechanism, classic cookie-based CSRF risk is low. If Supabase SSR cookie-based session helpers are used on the Next.js server for any server-rendered authenticated page, standard CSRF mitigations apply (SameSite=Lax/Strict cookies, and state-changing requests only via POST/PATCH/DELETE with the bearer token still required for the actual API call).

## 8. CORS

- FastAPI CORS middleware allow-lists only the known frontend origins per environment (`http://localhost:3000` in dev, the Vercel preview/prod domains in staging/prod) — never `allow_origins=["*"]` in production, especially since some endpoints are cookie/credential-aware.
- Mobile app requests (native, not browser) are not subject to CORS but still require the same bearer-token auth.

## 9. Secure Cookies / Token Handling

- If any server-set cookies are used (Next.js SSR auth helper), set `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` where it doesn't break the OTP/redirect flow).
- Mobile: tokens in Expo `SecureStore`, never in plain `AsyncStorage`.
- Tokens never logged (see §14 Logging).

## 10. OTP / Password Security

- OTP flow delegated entirely to Supabase Auth (rate-limited OTP requests, expiring codes) — the app does not implement its own OTP generation/storage.
- Admin/staff passwords: Supabase Auth's built-in hashing (bcrypt/Argon2 under the hood) — the app never stores or logs plaintext passwords.
- Backend enforces a minimum admin/staff password policy at account-creation time (delegated to Supabase project auth settings: min length, no full disable of common breached-password checks if available).

## 11. Payment Webhook Verification

- Razorpay webhook payloads are verified using HMAC-SHA256 signature comparison against `RAZORPAY_WEBHOOK_SECRET`, using constant-time comparison (`hmac.compare_digest`), **before** any processing of the payload. Requests failing verification are rejected with `400` and logged (without payload body) as a potential tampering attempt. Full detail in `09-PAYMENTS.md`.

## 12. Secret Management

- All secrets (Supabase service-role key, Razorpay key secret + webhook secret, FCM service account, Resend API key, JWT signing material) live only in environment variables, injected by the hosting platform (Vercel project env vars, backend host's secret store) — never committed to git, never present in any frontend bundle.
- `.env.example` files (no real values) committed to the repo per app; real `.env`/`.env.local` files are git-ignored. Full variable list in `18-ENVIRONMENT-VARIABLES.md`.
- Frontend-exposed variables (Next.js `NEXT_PUBLIC_*`, Expo `EXPO_PUBLIC_*`) are strictly limited to genuinely public values (Supabase URL + anon key, Razorpay key **id** [not secret], public API base URL) — this list is explicit and reviewed; anything not on the explicit "safe to expose" list must never use a public-prefixed env var name.

## 13. Preventing Duplicate Orders / Duplicate Payments

- `Idempotency-Key` header required on checkout (see `06-API-SPECIFICATION.md` §9); duplicate key returns the original order.
- Razorpay webhook handling is idempotent keyed on `razorpay_payment_id`/event id — processing the same event twice (Razorpay may retry webhooks) has no additional side effect (checked via a `processed_webhook_events` lookup or a unique constraint + upsert pattern before applying state changes).
- Delivery slot capacity checks use a row lock (`SELECT ... FOR UPDATE`) inside the checkout transaction to prevent two concurrent checkouts from overselling the same slot.

## 14. Logging Without Exposing Sensitive Data

- Never log: full JWTs, passwords, OTPs, Razorpay secrets/signatures, full card/payment instrument data (Razorpay handles card data entirely on their side — the platform never sees raw card numbers), full webhook HMAC keys.
- Acceptable to log: user id (uuid), order id, order status transitions, HTTP method/path, response status code, request duration, a redacted phone (e.g., last 4 digits) if needed for support debugging.
- Structured logging (JSON) via a shared logger configuration — see `23-OBSERVABILITY.md`.

## 15. Error Handling Without Leaking Internal Details

- Unhandled exceptions return a generic `500` with a stable error code (`INTERNAL_ERROR`) and a support-friendly message; the actual exception/stack trace is logged server-side only, never returned in the response body, in staging or production (a verbose mode may be enabled only in local development via an explicit `DEBUG=true` env flag). Full detail in `22-ERROR-HANDLING.md`.

## 16. Rate Limiting

- Applied to: OTP-adjacent flows (delegated to Supabase's own limits, monitored), `POST /checkout`, `POST /coupons/validate`, `POST /bulk-enquiries`, `POST /reviews`, and generally any unauthenticated or write-heavy endpoint.
- V1 approach: an in-process limiter (e.g., `slowapi`/`fastapi-limiter` backed by a simple in-memory or Redis-free store appropriate to a single-instance deployment) with sane defaults (e.g., 10 requests/minute per IP for public write endpoints); revisit with a shared store (Redis) only if the backend scales to multiple instances.

## 17. Dependency & Supply-Chain Hygiene

- Backend: `pip-audit` (or equivalent) run in CI. Frontend: `npm audit`/`pnpm audit` in CI. Both non-blocking warnings initially, escalated to blocking for high/critical severities once the pipeline is stable.

## 18. Data Privacy

- Customer PII (name, phone, email, address) is only accessible to authenticated admin/staff roles and the owning customer — enforced by the RBAC rules above.
- `audit_logs` capture admin actions on sensitive entities (orders, refunds, coupons, customer data edits) for accountability.
