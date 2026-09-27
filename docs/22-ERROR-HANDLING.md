# 22-ERROR-HANDLING.md

## 1. Standard Error Envelope

Every error response from the backend uses this shape (see `06-API-SPECIFICATION.md` §4):
```json
{
  "error": {
    "code": "SLOT_FULL",
    "message": "This delivery slot is no longer available. Please choose another.",
    "details": null
  }
}
```
- `code`: stable, machine-readable, `UPPER_SNAKE_CASE`, drawn from the enumerated list below — frontend code may branch on this value; never on the human-readable `message`.
- `message`: human-readable, safe to show directly to the end user (no internal jargon, no stack traces, no SQL).
- `details`: optional structured extra info (e.g., field-level validation errors); `null` when not applicable.

## 2. Error Code Catalogue (extend as needed, keep centrally defined)

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Request body/query failed schema validation; `details` includes field errors |
| `UNAUTHENTICATED` | 401 | Missing/invalid/expired token |
| `FORBIDDEN` | 403 | Authenticated but lacks required role/ownership |
| `NOT_FOUND` | 404 | Resource does not exist or is not visible to this user |
| `PINCODE_NOT_SERVICEABLE` | 400 | Address pincode outside delivery area |
| `VARIANT_OUT_OF_STOCK` | 409 | Attempted to add/checkout an unavailable variant |
| `SLOT_FULL` | 409 | Delivery slot capacity reached |
| `SLOT_CUTOFF_PASSED` | 409 | Delivery slot cutoff time has passed |
| `COUPON_INVALID` | 400 | Coupon code does not exist or is inactive |
| `COUPON_EXPIRED` | 400 | Coupon outside its valid date range |
| `COUPON_MIN_ORDER_NOT_MET` | 400 | Cart total below coupon's minimum order value |
| `COUPON_USAGE_LIMIT_REACHED` | 409 | Coupon usage limit (total or per-user) reached |
| `COD_NOT_ALLOWED` | 400 | Order total exceeds COD limit or COD disabled |
| `PAYMENT_SIGNATURE_INVALID` | 400 | Razorpay signature verification failed |
| `PAYMENT_ALREADY_PROCESSED` | 200/409 (idempotent no-op) | Duplicate payment confirmation attempt, safely ignored |
| `INVALID_STATUS_TRANSITION` | 409 | Requested order status change is not a valid next state |
| `DUPLICATE_REQUEST` | 200 (idempotent replay) | Checkout retried with the same `Idempotency-Key`; original result returned |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error; details never exposed |

## 3. Principles

1. **Never leak internals.** Stack traces, SQL text, file paths, or third-party raw error payloads never appear in a response body outside `development` with `DEBUG=true`. They are logged server-side only.
2. **Be specific where it helps the user, generic where it doesn't.** "This coupon has expired" is helpful; "Column violates not-null constraint" is not — translate the latter into a generic `INTERNAL_ERROR` before it ever reaches a response.
3. **Idempotent operations return success-shaped responses on safe retries**, not an error, where the retried operation is genuinely a no-op repeat (see `DUPLICATE_REQUEST`, `PAYMENT_ALREADY_PROCESSED`).
4. **Validation errors are actionable.** `422` responses include enough `details` (field name + reason) for the frontend to highlight the exact offending field.

## 4. Frontend Error Handling

- The central API client (`21-CODING-CONVENTIONS.md` §5) catches non-2xx responses, parses the error envelope, and either (a) surfaces a field-level error for form-bound errors, or (b) shows a toast/inline message using `error.message` for action-level errors, or (c) routes to a generic error boundary for `INTERNAL_ERROR`/unexpected network failures.
- Never show a raw `error.code` string to the end user; it is for developer/branching use only. Always show `message` (or a locale-specific mapped string if i18n is added later).

## 5. Logging on Error

- Every `INTERNAL_ERROR` (500) is logged with full context (stack trace, request id, user id if available) server-side per `23-OBSERVABILITY.md`, with sensitive fields redacted per `08-SECURITY.md` §14.
- 4xx errors are logged at a lower severity (info/warning) unless they indicate a potential abuse pattern (e.g., repeated `PAYMENT_SIGNATURE_INVALID` from the same user/IP), which should be logged at warning/error level for monitoring.

## 6. Frontend/Mobile Crash & Unhandled Error Handling

- Web: a top-level Next.js error boundary (`app/error.tsx`, `app/global-error.tsx`) shows a friendly "Something went wrong" page with a retry action, never a blank white screen or raw error text.
- Mobile: a top-level error boundary component wraps the navigation tree; unhandled errors show a friendly screen with a "Restart" action rather than a hard crash where avoidable.
