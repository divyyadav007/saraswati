# 01-PROJECT-OVERVIEW.md

## 1. Summary

Sweetshop is a reputed local mithai (Indian sweets) business in Barabanki, Uttar Pradesh, moving from offline/phone/WhatsApp ordering to a proper online ordering platform: a responsive website, an Android app, and a backend + admin dashboard shared by both.

## 2. Problem Statement

- Orders currently come in via phone calls and WhatsApp messages, which do not scale, are error-prone (wrong weight/variant, wrong address, missed festival rush orders), and give the owner no structured record of sales or customers.
- There is no way for customers to browse the catalogue, see live prices per weight variant, or track an order's status.
- Bulk/corporate/wedding orders and gift hampers — a meaningful revenue line for sweets shops, especially around festivals — have no structured intake process.

## 3. Goals

1. Let customers self-serve: browse → order → pay → track, on web and Android.
2. Give the owner a single, simple dashboard to manage the entire order lifecycle and catalogue.
3. Support sweets-specific buying patterns: weight variants, scheduled/advance orders (common before festivals), gift hampers, bulk enquiries.
4. Keep infrastructure cost near-zero until order volume justifies spend.
5. Produce a codebase and documentation set clear enough that an AI coding agent (Antigravity) can implement it with minimal back-and-forth.

## 4. Non-Goals (V1)

- Multi-branch / multi-store support (schema-ready, not implemented).
- Dedicated delivery-partner mobile app (admin manually assigns/tracks delivery in V1).
- Loyalty points, referral programs.
- WhatsApp Business API integration.
- AI-based customer support / chatbots.
- iOS app (Android only in V1, per requirements; React Native/Expo choice keeps iOS low-cost to add later).
- Complex logistics optimization (route planning, live rider GPS tracking).

## 5. Success Criteria for V1 Launch

- A real customer can complete the full order flow (browse → cart → address → slot → COD or Razorpay payment → confirmation → tracking → delivered) on both web and Android without developer intervention.
- The owner can, without technical help: add/edit a product and its weight variants, view and update an order's status, view daily/weekly sales totals, and create a coupon.
- No API endpoint that mutates money-related or order-related data trusts client-supplied prices or totals.
- All secrets are in environment variables, none committed to git.
- Core flow is covered by automated tests per `15-TESTING-STRATEGY.md`.
- Infrastructure cost is ₹0–low, running entirely on free tiers described in `17-FREE-TIER-SERVICES.md`, at expected V1 traffic.

## 6. Key Assumptions (explicit, so the AI agent does not need to guess)

- Single store, single delivery area (Barabanki + surrounding service radius), no multi-branch logic active in V1.
- Currency: INR only. Language: English UI for V1 (Hindi/Hinglish copy can be added later without architecture change).
- Delivery is performed by the shop's own staff/riders, coordinated manually by the admin; no third-party logistics API in V1.
- COD is allowed for orders under a configurable maximum amount (see `store_settings`); above that, online payment is required. Default cap: ₹5,000, admin-configurable.
- Customers authenticate primarily via phone number + OTP (Supabase Auth). Admin/staff authenticate via email + password.
- Product weight variants are the primary variant axis (e.g., 250g / 500g / 1kg); a product may also have non-weight variants (e.g., "plain" vs "dry-fruit") — the schema supports a generic variant model (see `05-DATABASE-SCHEMA.md`), V1 UI focuses on weight.
- Reviews are text + star rating, tied to a delivered order (to prevent fake/unverified reviews), moderated by admin before public display.
- Maps usage is limited to address entry/geocoding and (optionally) displaying delivery area boundaries — not turn-by-turn routing in V1.

## 7. Stakeholders

- **Business owner** — final decision-maker on product/pricing/policy questions.
- **Shop staff** — day-to-day admin panel users.
- **Customers** — end users of web/app.
- **Development (AI agent + supervising developer)** — implements per this documentation.

## 8. Related Documents

See `PROJECT-CONTEXT.md` §8 for the full document index. Read `02-PRD.md` next for detailed requirements and acceptance criteria.
