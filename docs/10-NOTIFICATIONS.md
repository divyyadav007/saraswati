# 10-NOTIFICATIONS.md

## 1. Channels

- **Push (mobile)**: Firebase Cloud Messaging (FCM), Android only in V1 (matches Android-only mobile app scope).
- **Email**: Resend (free tier) for transactional email; used as a fallback/parallel channel for key events (order confirmation, order delivered) especially useful for web-only customers with no app installed.
- **In-app**: a simple `notifications` list/bell icon on web and mobile backed by the `notifications` table, independent of whether push/email delivery succeeded (so the customer always has a record even if a push notification was missed).

## 2. Abstraction

Backend defines a `NotificationSender` interface with methods like `send_push(user_id, title, body, data)` and `send_email(to, subject, template, context)`. Concrete implementations: `FCMPushSender`, `ResendEmailSender`. A `NotificationService` decides, per event type and user preference, which channel(s) to use, and always writes a `notifications` row regardless of external delivery success/failure (external delivery failure is logged, not surfaced as a user-facing error).

## 3. Triggers (V1)

| Event | Channel(s) | Audience |
|---|---|---|
| Order placed (payment confirmed or COD placed) | Push + in-app; Email | Customer |
| Order status changed (CONFIRMED, PREPARING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED) | Push + in-app | Customer |
| Payment failed | Push + in-app; Email | Customer |
| New order received | Push (or admin dashboard live badge/poll) + in-app | Admin/Staff |
| New bulk-order enquiry received | Email + in-app | Admin |
| Promotional (new offer, festival collection live) | Push (opt-in only) | Customers with `notif_promotional_opt_in=true` |

## 4. Admin Notification Delivery (V1 pragmatic choice)

Since building a robust FCM setup for the admin's own device is extra complexity, V1's primary mechanism for "admin sees new orders" is the **admin dashboard itself** (a near-real-time order list, refreshed via polling every 15–30s, or a simple badge count) plus an email to the store's registered email for every new order and every new bulk enquiry, which reliably reaches the owner without requiring the admin app to be open. Admin push notifications (FCM to an admin's phone) are a nice-to-have if time allows, not a launch blocker.

## 5. FCM Setup Requirements

- A Firebase project holds the FCM configuration; Android app registered with its package name and `google-services.json` bundled into the Expo build (via EAS config, not committed with real values to a public repo if the project becomes open-source — treat as semi-sensitive, store via EAS secrets).
- Backend holds a Firebase service account JSON (server-side only) to call the FCM Admin SDK / HTTP v1 API — never exposed to any client.
- Device token lifecycle: app registers/refreshes its FCM token on launch and after login, calling `POST /api/v1/notifications/device-token`; backend stores the latest token per user in `profiles.fcm_token` (V1 simplification: one active device per user; multi-device support is a documented future upgrade using a separate `device_tokens` table if needed).

## 6. Email Templates (Resend)

- Order confirmation, order delivered, payment failed, bulk-enquiry-received-by-admin — plain, clean HTML templates matching the brand's color/typography tokens from `07-UI-UX-SPECIFICATION.md`, kept simple (no heavy marketing-email complexity) for V1.
- Sender domain must be verified in Resend (SPF/DKIM configured on the shop's domain) before production use; until a custom domain is verified, Resend's sandbox/testing mode is used in development.

## 7. Notification Preferences

- `profiles.notif_promotional_opt_in` (default true, customer can opt out) governs promotional sends only. Transactional notifications (order/payment status) are never gated by this preference — they are essential to the service.

## 8. Failure Handling

- A failed push/email send is logged (`23-OBSERVABILITY.md`) with the reason (invalid token, provider error) but never blocks or fails the underlying business operation (e.g., an order is still successfully placed even if the confirmation push fails to deliver) — notification sending happens after the core transaction commits, via `BackgroundTasks` or a simple retry-once pattern.

## 9. Future Extensibility

- WhatsApp Business API as an additional channel (`WhatsAppSender` implementing the same interface) — see `25-FUTURE-ROADMAP.md`. No code path currently assumes WhatsApp; adding it is additive.
