# 14-DELIVERY-SYSTEM.md

## 1. V1 Model

Delivery is performed by the shop's own staff/riders, coordinated manually through the admin panel. There is **no** dedicated delivery-partner mobile app in V1 — the admin/staff update order status and record who delivered what. The schema (`delivery_partners`, `delivery_assignments`) is designed so a future partner-facing app can be added without a schema rewrite (see `25-FUTURE-ROADMAP.md`).

## 2. Delivery Slots

- Represent bookable delivery windows (`delivery_slots`: date, start/end time, capacity, cutoff).
- Admin generates slots via a recurring template (e.g., daily 10am–1pm and 4pm–7pm, capacity 15 each) for a date range, rather than creating each slot manually — see `11-ADMIN-PANEL.md` §3.10.
- Slots must be generated far enough in advance to support **scheduled/advance orders** for festivals (e.g., generate 30–60 days ahead on a rolling basis via a scheduled admin action or a simple cron-like backend job that tops up the slot calendar weekly).
- A slot becomes unselectable once `booked_count >= capacity` or the current time passes `cutoff_at` (e.g., cutoff might be 2 hours before `start_time`, or end-of-previous-day for next-day slots — configurable per slot or via a store-wide default in `store_settings`).
- Capacity is decremented (booked_count += 1) inside the checkout transaction using a row lock to prevent overselling under concurrent checkouts (`08-SECURITY.md` §13), and released (booked_count -= 1) if the order is later cancelled/payment-times-out before confirmation.

## 3. Delivery Charges

- Configured in `store_settings`: a flat `delivery_charge_flat`, waived above `free_delivery_above` order value. V1 does not implement distance-based/zone-based delivery pricing; if the shop later needs per-area pricing (e.g., outside a certain radius costs more), a `delivery_zones` table (pincode → extra_charge) is the documented extension point (`25-FUTURE-ROADMAP.md`).

## 4. Serviceable Area

- `store_settings.serviceable_pincodes` (array of pincodes) is checked at address-entry time (`GET /addresses/check-serviceability`) and again at checkout. Orders cannot be placed to non-serviceable pincodes.
- Pickup-from-store option: schema supports `orders.delivery_slot_id` being nullable to represent a pickup order (no delivery slot required); whether pickup is offered in V1 UI is a product decision left to the owner — the backend does not block it either way, and the admin can distinguish pickup vs delivery orders via a `fulfillment_type` consideration: **decision required at implementation** — if pickup is desired for V1, add an explicit `orders.fulfillment_type` enum (`DELIVERY`/`PICKUP`); default assumption documented here is **delivery-only for V1** unless the business explicitly requests pickup, to avoid scope creep. Update this document if that decision changes.

## 5. Delivery Assignment

- Admin assigns a `delivery_partner_id` to an order (`POST /admin/orders/{id}/assign-delivery`), typically once the order reaches `READY_FOR_PICKUP`.
- One active assignment per order (`delivery_assignments.order_id` unique); reassignment updates the existing row rather than creating duplicates.
- Delivery partners themselves do not log into any system in V1 — status updates (`OUT_FOR_DELIVERY`, `DELIVERED`) are performed by admin/staff on the partner's behalf (e.g., via phone confirmation from the rider).

## 6. Status Flow Interaction

Delivery-related order statuses (`READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED`) are part of the single order state machine in `04-ARCHITECTURE.md` §6 — there is no separate "delivery status" field distinct from `orders.status` in V1, keeping the model simple. `delivery_assignments.delivered_at` is set as a convenience/audit timestamp alongside `orders.delivered_at`.

## 7. Future Extensibility (see `25-FUTURE-ROADMAP.md`)

- Dedicated delivery-partner app with its own login, assigned-orders list, and self-service status updates (would introduce active use of the `DELIVERY` role).
- Live location tracking (would require a location-ping endpoint + Maps display — explicitly out of scope for V1 per the "minimize Maps API usage" cost principle).
- Distance/zone-based delivery pricing (`delivery_zones` table).
- Route optimization for multi-stop delivery batches.
