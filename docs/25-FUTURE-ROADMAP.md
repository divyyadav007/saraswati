# 25-FUTURE-ROADMAP.md

Features explicitly deferred beyond V1, with a note on how the current architecture/schema already anticipates each one so a future implementer doesn't have to guess whether a rewrite is needed.

## 1. Multiple Branches / Multi-Store

- **Deferred because**: V1 is a single physical shop/service area.
- **Schema readiness**: introduce a `branches` table and add a nullable `branch_id` FK to `products` (or a join table if products are shared across branches with per-branch pricing/stock), `orders`, `delivery_slots`, `store_settings` (becomes per-branch). Application logic would need a branch-selection concept on the storefront (e.g., by detected/selected delivery pincode) and branch-scoped admin views.

## 2. Delivery-Partner Mobile App

- **Deferred because**: V1 delivery is coordinated manually by admin/staff.
- **Schema readiness**: `delivery_partners` and `delivery_assignments` already exist and the `DELIVERY` role is already a defined enum value, unused. Adding the app means: partner login (Supabase Auth with role=DELIVERY), an "assigned orders" endpoint filtered by `delivery_partner_id`, and partner-initiated status updates (`OUT_FOR_DELIVERY`, `DELIVERED`) replacing the admin-initiated versions for those two transitions specifically.

## 3. Loyalty Points

- **Deferred because**: not part of the core V1 flow; adds complexity to pricing/checkout logic before that logic is proven stable.
- **Schema readiness**: would add a `loyalty_accounts` (user_id, points_balance) and `loyalty_transactions` (user_id, order_id, points_delta, reason) table set; checkout would gain an optional "redeem points" step feeding into `discount_amount` alongside coupons — the existing server-side total-computation step (`03-FEATURE-SPECIFICATION.md` §3.2) is the natural place to add this without restructuring checkout.

## 4. Referral System

- **Deferred because**: growth-stage feature, not needed for initial launch.
- **Schema readiness**: a `referrals` table (referrer_user_id, referred_user_id, referral_code, status, reward_granted) layered on top of the existing `profiles`/`coupons` mechanics (a referral reward could simply issue a generated single-use coupon to both parties, reusing existing coupon infrastructure rather than inventing a parallel discount mechanism).

## 5. Advanced Analytics / Data Warehouse

- **Deferred because**: V1's simple aggregate SQL queries are sufficient at current order volume.
- **Upgrade path**: once volume/complexity grows, introduce either materialized views for common reports (low-effort, stays in Postgres) or, at real scale, an ETL into a dedicated analytics store — not needed until query performance or reporting complexity actually demands it. Avoid building this speculatively.

## 6. WhatsApp Business API Integration

- **Deferred because**: adds a paid third-party integration and a new notification channel before the core notification system (push/email) is proven.
- **Schema/architecture readiness**: the `NotificationSender` interface (`04-ARCHITECTURE.md` §9) is designed precisely so a `WhatsAppSender` adapter can be added additively; `notifications` table's `channel` enum simply gains a `WHATSAPP` value.

## 7. AI Customer Support

- **Deferred because**: explicitly out of scope per the "no unnecessary AI" architecture principle; a small local business's support volume does not currently justify it.
- **Future consideration**: if built, it should be an additive support-widget/agent that reads from existing order/product data via the existing API (read-only initially) rather than a parallel data store, and must not be allowed to place orders, alter order status, or process refunds autonomously without human confirmation, given the financial and food-safety/quality sensitivity of order changes.

## 8. iOS App

- **Deferred because**: requirements specify Android for V1.
- **Readiness**: Expo/React Native choice means an iOS build is largely a matter of Apple Developer account setup, iOS-specific permission/push (APNs via FCM) configuration, and App Store review — not a rewrite.

## 9. Distance/Zone-Based Delivery Pricing

- **Deferred because**: a flat delivery charge (or free-above-threshold) is sufficient for a single-area local shop in V1.
- **Schema readiness**: introduce a `delivery_zones` table (pincode or area → extra charge / different flat fee) referenced during the delivery-charge computation step in checkout.

## 10. Dedicated Pickup Flow

- If pickup-from-store becomes desired beyond the delivery-only V1 default noted in `14-DELIVERY-SYSTEM.md` §4, add `orders.fulfillment_type` enum and make `delivery_slot_id` conditionally required based on it.

## 11. Real-Time Order Updates (Admin)

- Upgrade from polling (`11-ADMIN-PANEL.md` §6) to Supabase Realtime or WebSockets if polling proves insufficient for the admin's workflow at higher order volumes.

## 12. Inventory Ledger

- Upgrade from the simple `product_variants.stock_status`/`stock_quantity` fields to a full movement-ledger `inventory` table (`05-DATABASE-SCHEMA.md` §2.8) if precise stock auditing (who changed what, when, by how much) becomes necessary, e.g., once the shop wants to reconcile online stock against physical shop inventory systematically.

## 13. Guiding Principle for All Future Work

Every item above should be built only when there is a real, current business need — not spec'd out in advance "just in case." The schema/architecture decisions in the current documents are deliberately designed so that adding these later is additive (new tables/columns/adapters) rather than requiring a rewrite of existing, working, tested functionality.
