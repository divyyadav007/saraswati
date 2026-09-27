# 23-OBSERVABILITY.md

## 1. Logging

- **Format**: structured JSON logs (not free-text), one object per log line, including at minimum: `timestamp`, `level`, `message`, `request_id`, `path`, `method`, `status_code`, `duration_ms`, `user_id` (if authenticated, else null), `role` (if authenticated).
- **Request ID**: a unique `request_id` (UUID) generated per incoming request (or propagated if the frontend sends one), attached to every log line produced while handling that request, and returned in an `X-Request-Id` response header — makes it possible to trace a single user's failed action through logs when debugging a support ticket.
- **Levels**: `debug` (local dev only), `info` (normal request lifecycle), `warning` (recoverable issues, suspicious patterns), `error` (failed operations, unhandled exceptions).
- **What is never logged**: see `08-SECURITY.md` §14 (no tokens, passwords, OTPs, payment secrets/signatures, full card data).
- **Where logs go**: V1 — the hosting platform's built-in log viewer (Vercel logs, backend PaaS logs) is sufficient at launch. A free-tier log aggregation tool can be added post-launch if the platform's built-in viewer proves insufficient for debugging.

## 2. Error Tracking

- A free-tier error-tracking service (e.g., Sentry's free tier) is recommended for both backend and frontend once launched, to get automatic alerting on new exception types and stack-trace capture without manually grepping logs — this is optional for the earliest development phases but recommended before production launch (Phase 9 in `19-DEVELOPMENT-ROADMAP.md`).
- Error tracking integration must respect the same "never log sensitive data" rule — configure scrubbing of Authorization headers and known sensitive field names before enabling in production.

## 3. Metrics (V1 — lightweight)

Given V1 scale, a full metrics/dashboarding stack (Prometheus/Grafana) is not required. Minimum viable metrics, derivable from logs or simple counters:
- Request count and error rate per endpoint (derivable from structured logs).
- Order funnel counts (carts created, checkouts started, orders placed, payments captured, payments failed) — exposed via a simple admin dashboard query (`11-ADMIN-PANEL.md` §3.1) rather than a separate metrics system.
- Backend response time (p50/p95) — many PaaS providers expose this out of the box; otherwise log `duration_ms` and compute periodically.

## 4. Alerting

- Minimum viable: the hosting platform's own uptime/crash alerting (most PaaS backends and Vercel have basic deployment-failure notifications) plus error-tracking-service email/Slack alerts on new/spiking exception types, once error tracking is set up.
- Priority alerts to configure once available: backend down/health-check failing, payment webhook failures spiking, 5xx rate spiking.

## 5. Audit Trail

- `audit_logs` table (`05-DATABASE-SCHEMA.md` §2.27) captures admin-initiated sensitive actions: order status changes, refunds, coupon create/edit/deactivate, store settings changes, product/category deactivation. Each entry: actor, action, entity type/id, before/after snapshot (jsonb), timestamp. This is a business/compliance record, distinct from application logs, and should be queryable by an admin (a simple "recent admin activity" view is a nice-to-have, not a V1 UI requirement, but the data must be captured from day one since it cannot be reconstructed retroactively).

## 6. Health Checks

- `GET /healthz` on the backend returns `200` with a minimal payload (`{"status": "ok"}`) verifying the process is up and, ideally, that it can reach the database (a lightweight `SELECT 1`) — used by the hosting platform's readiness/liveness checks.

## 7. Performance Monitoring (Frontend)

- Web Vitals (LCP, CLS, INP) tracked via Vercel's built-in analytics (if enabled) or a lightweight `web-vitals` reporting call, to catch storefront performance regressions before they hurt conversion.
