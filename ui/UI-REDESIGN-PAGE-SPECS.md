# UI-REDESIGN-PAGE-SPECS.md — Saraswati Sweets

Companion to `UI-REDESIGN-DESIGN-SYSTEM.md` (tokens) and `UI-REDESIGN-COMPONENT-SPECS.md` (components). This file specifies the layout and content structure of every page/screen to be redesigned, built by composing the components from the component-spec file.

**Ground rule for Antigravity**: Restyle/restructure the existing route/screen in place. Do not change the URL structure, the data-fetching logic, the API calls, auth guards, or business rules on any page — only the visual layout, component usage, and purely presentational client-side behavior change. If a page currently fetches data differently than described here, keep the existing data flow and simply re-render it through the new components/layout.

---

## PART A — WEB (Next.js)

### A1. `/` — Homepage

Top to bottom:
1. **Announcement/PromoBanner strip** (optional, only if there's an active offer) — one line, dismissible.
2. **Header** (see A0 below — shared across all pages).
3. **HeroSection** — one strong hero, brand headline + primary CTA ("Order Now").
4. **Trust badges row** — 3–4 short icon+text items (e.g. "X+ Years of Trust", "100% Handmade", "Fresh Daily", "Barabanki & Nearby Delivery") — adapt exact copy to real facts about Saraswati Sweets, never invent unverifiable claims (no fabricated customer counts).
5. **SectionHeader** "Shop by Category" + a `CategoryCard` grid (all active categories, image-tile style).
6. **SectionHeader** "Our Bestsellers" + `ProductGrid` (products flagged `is_featured`, limited to ~8, "View All" → `/products`).
7. **PromoBanner (inline variant)** for one active festival collection/offer, if any — omit entirely if there's nothing currently active (don't show a stale/empty promo section).
8. **SectionHeader** "Gift Hampers" + a `HamperCard` row/grid (3–4 items, "View All" → `/gift-hampers`).
9. **Brand story block** — short paragraph (2–4 sentences) about Saraswati Sweets' history/craft + one photo + "Learn More"/"Our Story" link if a story page exists, otherwise omit the link and keep the block short.
10. **Bulk/Corporate/Wedding orders callout** — a single low-key banner or card ("Planning a wedding or corporate order? Get a custom quote →" linking to `/bulk-orders`) — not a prominent hero-level element, per the reference pattern of keeping this secondary to retail shopping.
11. **Footer** (see A0 below).

Mobile: same section order, single-column, category/product grids drop to 2 columns, hero text overlay simplifies to headline + one CTA only (drop secondary CTA if space is tight).

### A0. Shared Header & Footer

**Header (desktop)**:
- Logo (left), primary nav (Home, Categories, Gift Hampers, Offers, Bulk Orders — Bulk Orders may live in a "More"/footer-style secondary spot if the primary nav gets crowded), search (icon expanding to a field, or a persistent compact search bar), account icon, cart icon with item-count badge.
- Sticky on scroll (compact/condensed height after scrolling past the hero) — smooth, no layout jump.

**Header (mobile)**:
- Logo (left/center), hamburger menu (left or right — pick one, be consistent), search icon, cart icon with badge (right).
- Hamburger opens a slide-in panel (not a full mega-menu) listing: Home, Categories (expandable to show category list), Gift Hampers, Offers, Bulk Orders, Orders, Profile, Contact.
- No bottom tab bar on web (bottom nav is a mobile-app pattern, not web) — mobile web keeps the top header + hamburger pattern.

**Footer**: store contact info (phone, address, hours), quick links (About, Contact, Bulk Orders, Gift Hampers, Offers), account links (Orders, Profile, Login), legal (Privacy, Terms, Refund Policy), social icons, optional newsletter/WhatsApp contact — mirrors the reference pattern but kept compact, not a wall of links.

### A2. `/categories`

- `SectionHeader` "All Categories" + full `CategoryCard` grid (every active category, no pagination needed unless the category count is large).
- Empty state not expected here (categories always exist) but include a graceful fallback if the list is ever empty.

### A3. `/products` (listing, with optional `?category=`/`?q=` filters)

- Sticky filter/sort bar below the header: category filter (chips or a dropdown), sort dropdown (Price: Low–High / High–Low / Newest / Popularity), search field if arriving without a `q` param already applied.
- Mobile: filter/sort bar collapses into a single "Filter & Sort" button opening a bottom sheet, to avoid a cramped horizontal bar.
- `ProductGrid` below, with pagination/load-more per A0's grid rules.
- Active filters shown as removable chips above the grid when any are applied.
- Breadcrumb (desktop only) showing Home / Category Name for orientation.

### A4. `/products/[slug]` — Product Detail

- Two-column desktop layout: image gallery (left, ~55%), product info (right, ~45%). Single column stacked on mobile, image gallery first.
- Image gallery: primary large image + thumbnail strip (or swipeable on mobile), 1:1 primary ratio.
- Info column, top to bottom: product name (H1), short description, `PriceDisplay` (updates live with variant selection), `VariantSelector`, `QuantitySelector`, `AddToCartButton` (sticky at the bottom of the viewport on mobile once the user scrolls past it, so it's always reachable), stock/availability message, delivery estimate note if applicable, special-instructions/packaging-note field if this product supports it (per existing feature spec), full description/ingredients section below the fold, `ReviewCard` list with average rating summary at the top, "Related Products" `ProductGrid` at the very bottom.

### A5. `/gift-hampers`

- Same structural pattern as `/products` but using `HamperCard`; no weight-variant filter (hampers aren't filtered by weight), category filter replaced with a simpler "Occasion"/"Festival" filter if the data model supports tags for this, otherwise a plain grid with sort only.
- Each hamper links to a detail page mirroring A4's structure, with the gallery/info split, but the info column includes a "What's Inside" itemized list (per the gift-hamper composition data) instead of a variant selector, since a hamper is typically a fixed composition at a fixed price (or a single quantity selector only, no weight variants).

### A6. `/cart`

- List of `CartItem` rows.
- `OrderSummary` block (subtotal/discount/delivery/tax/total) — sticky on desktop as a right-column sidebar alongside the item list; on mobile, appears below the item list with a sticky "Proceed to Checkout" bar pinned to the bottom of the viewport.
- Coupon input inline within/above the `OrderSummary` (code field + "Apply" button + applied-coupon chip with a remove option).
- Empty cart: `EmptyState` with "Your cart is empty" + "Browse Products" CTA.
- Any out-of-stock item flagged inline per `CartItem`'s spec, with checkout disabled/blocked until resolved (existing business rule — presentation only, block the button and show why).

### A7. `/checkout`

- Single scrollable page (not a multi-step wizard) with clearly separated sections, each with a `SectionHeader`-style label: 1) Delivery Address (saved-address radio list + "Add New Address"), 2) Delivery Slot (`DeliverySlotSelector`), 3) Payment Method (COD / Online, with COD auto-hidden/disabled per the existing eligibility rule — show a short inline note why if hidden, e.g. "COD unavailable above ₹5,000"), 4) Special Instructions / Packaging Notes (optional text fields), 5) `OrderSummary` (sticky sidebar desktop / sticky bottom bar mobile with the "Place Order" button).
- Trust indicators near the payment section: small secure-payment note/icon, accepted payment method logos (UPI/cards via Razorpay) — subtle, not a large banner.
- Form validation errors shown inline per field, never as a single generic "error" toast that doesn't say what's wrong.
- Success: redirect to an order-confirmation view (could be `/orders/[id]` itself with a "Thank you" banner at the top on first arrival) showing order number, items, total, and slot.

### A8. `/orders`

- List of past/current orders, most recent first — each row: order number, date, item-count summary, total, status badge (color-coded per status: neutral for Placed/Confirmed, warning/accent for Preparing/Out for Delivery, success for Delivered, danger for Cancelled).
- Filter by status (tabs or a dropdown: All / Active / Delivered / Cancelled).
- Empty state: "No orders yet" + "Start Shopping" CTA.

### A9. `/orders/[id]`

- Order header: order number, placed date, status badge.
- Status timeline: a simple horizontal (desktop) or vertical (mobile) stepper showing Placed → Confirmed → Preparing → Ready → Out for Delivery → Delivered, with completed steps filled/checked and the current step highlighted — reflects the real `orders.status` and timestamp fields, never fabricated intermediate detail.
- Itemized list of what was ordered (reusing `CartItem`'s visual style in a read-only mode).
- `OrderSummary` (final, as charged).
- Delivery address + slot shown read-only.
- "Reorder" button (if the order is eligible) and "Cancel Order" button (only shown/enabled while the order is in a cancellable state per existing business rules).

### A10. `/profile`

- Simple sectioned layout: Personal Info (name, phone, email — edit form), Saved Addresses (list + add/edit/delete + set-default), Notification Preferences (a single toggle for promotional opt-in), Logout action clearly separated (secondary/ghost styling, not visually competing with primary actions).

### A11. `/bulk-orders`

- A focused, low-distraction single-purpose page: short intro copy about bulk/corporate/wedding order capability, then a form (name, phone, email, event type, event date, estimated quantity/budget, items of interest, message) with a single clear submit CTA.
- On submit: a confirmation state (not a redirect elsewhere) — "Thanks, our team will contact you within [X] hours" — matching the existing bulk-enquiry backend flow (no payment, no cart involvement).

### A12. `/offers`

- `SectionHeader` "Current Offers" + a grid of `OfferCard`s.
- Empty state if no offers are currently active: a friendly "No active offers right now — check back soon!" message rather than a blank page.

---

## PART B — MOBILE (Expo/React Native)

Mirrors the web IA with mobile-native navigation patterns. Bottom tab bar: **Home · Categories · Cart (with badge) · Orders · Profile**. Gift Hampers, Bulk Orders, Offers, Profile sub-sections reached as stack screens from Home/tabs, not as additional bottom-tab items (5 tabs max, per standard mobile UX practice).

### B1. Home
Same section order as A1 (Hero → Trust badges → Categories → Bestsellers → Promo → Hampers preview → Story → Bulk-order callout), adapted to a vertically scrolling `FlatList`/`ScrollView` with native-feeling card components, not a literal reflow of the web DOM.

### B2. Categories
Grid of `CategoryCard`, 2 columns, same visual treatment as web.

### B3. Product Listing
Filter/sort accessed via a bottom-sheet modal (native pattern, consistent with the web mobile behavior in A3). Product grid 2 columns.

### B4. Product Detail
Single-column stack: image gallery (swipeable, with dot indicators) → info → variant selector → quantity → sticky bottom `AddToCartButton` bar (always visible above the tab bar while scrolling) → description → reviews → related products.

### B5. Cart
`CartItem` list → `OrderSummary` → sticky bottom "Proceed to Checkout" bar (above the tab bar).

### B6. Checkout
Same single-scrollable-page structure as A7, native form inputs, sticky bottom "Place Order" bar. Razorpay opened via the native SDK/checkout flow per the existing mobile-app spec.

### B7. Orders / Order Detail
Same structure as A8/A9, native list + detail screen, push-notification deep link lands directly on B7's detail screen for the relevant order.

### B8. Profile
Same sections as A10, native forms; Logout as a clearly separated list item at the bottom.

### B9. Gift Hampers
Same pattern as B3/B4 using `HamperCard`.

---

## PART C — ADMIN (Keep Existing Architecture)

Per the brief: admin functionality/architecture stays as-is. Only apply the new visual tokens (colors, typography, spacing, card/button styles from `UI-REDESIGN-DESIGN-SYSTEM.md`) for consistency with the customer-facing brand, without restructuring admin screens, workflows, or data tables beyond what's already specified in `docs/11-ADMIN-PANEL.md`. Do not add customer-facing components (Hero, ProductCard image-tile browsing, etc.) into the admin panel — admin stays data-table/form-forward per its own spec.

---

## Priority Order for Implementation (mirrors the original brief's Phase 5)

1. Design tokens (Tailwind/shadcn theme) from `UI-REDESIGN-DESIGN-SYSTEM.md`.
2. Shared Header/Footer (A0).
3. Homepage (A1).
4. Categories + Product Listing (A2, A3).
5. Product Detail (A4).
6. Gift Hampers (A5).
7. Cart (A6).
8. Checkout (A7).
9. Orders + Order Detail (A8, A9).
10. Profile (A10).
11. Bulk Orders + Offers (A11, A12).
12. Mobile screens (Part B), reusing the same component specs.
13. Admin visual-token pass only (Part C).
