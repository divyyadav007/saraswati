# UI-REDESIGN-COMPONENT-SPECS.md — Saraswati Sweets

Companion to `UI-REDESIGN-DESIGN-SYSTEM.md` (tokens) and `UI-REDESIGN-PAGE-SPECS.md` (page layouts). This file specifies each reusable UI component: purpose, structure, states, and behavior. Build these first — pages are built by composing them.

**Ground rule for Antigravity**: These are visual/structural specs only. Do not change what data a component receives from the backend, do not rename API fields, do not alter routing logic or auth checks — only the presentation layer (markup, styling, layout, and purely client-side interaction like hover/open-close state) changes. If a component currently exists with a different name/location, restyle and restructure the existing one in place rather than creating a duplicate.

---

## 1. `HeroSection`

**Purpose**: Homepage top banner — first-impression brand + primary CTA.

- Layout: full-bleed image/background (21:9 desktop crop, 4:5 or 1:1 crop on mobile — do not just scale the desktop image down, use `<picture>`/Next.js `Image` responsive `sizes` with an art-directed mobile crop if a separate asset exists, otherwise center-crop).
- Content overlay (left-aligned on desktop, centered on mobile): eyebrow text (small, gold accent, e.g. "Since [year] · Barabanki"), H1 (serif, e.g. "Authentic Mithai, Made Fresh Daily"), one-line supporting copy, one primary button ("Order Now" → categories/products) and optionally one secondary ghost button ("View Gift Hampers").
- Max one hero per homepage. No auto-rotating carousel of more than 3 slides if a carousel is used at all — prefer a single strong static hero over a multi-slide carousel, per the "avoid overengineering, avoid excessive animation" principle. If the business genuinely has multiple seasonal promotions, use `PromoBanner` (below) in a strip beneath the hero instead of cramming them into the hero carousel.
- Mobile: text overlay sits on a subtle dark gradient scrim over the image for contrast; button remains full-width or near-full-width with generous tap area.

## 2. `SectionHeader`

**Purpose**: Consistent heading treatment for every homepage/listing section ("Our Bestsellers", "Shop by Category", "Gift Hampers").

- Structure: H2 (serif) + optional short supporting line (muted, body-small) + optional right-aligned "View All →" link on the same row (desktop); on mobile the "View All" wraps below or sits under the heading, never causing horizontal scroll.
- Consistent vertical rhythm: `32px` top margin, `16px` bottom margin before the section content, mobile `24px`/`12px`.

## 3. `CategoryCard`

**Purpose**: Homepage/categories-page image-tile navigation (the "image-tile grid" pattern identified as a strong shared reference pattern).

- Aspect ratio 1:1 (or 4:3 if the category photography set is landscape-only — pick one ratio and use it consistently across all category tiles, never mixed).
- Image fills the card, `radius-md` corners, subtle `shadow-card`.
- Label: either an overlay (semi-transparent dark gradient at the bottom, white text, H3 size) or a caption below the image (white card, label in `text-primary`) — choose one pattern site-wide, do not mix overlay and caption styles across categories.
- Hover (desktop only): slight image scale (1.03) within the fixed-size container (`overflow: hidden` on the parent to avoid layout shift), transition ≤200ms. No hover effect needed/expected on mobile (touch).
- Tap target: entire card is a single link/button, not just the label text.

## 4. `ProductCard`

**Purpose**: The single most-repeated component — used in listings, search results, "related products," homepage bestsellers.

- Image: 1:1 aspect ratio, `radius-md` top corners if the card has a distinct image/content split, or full `radius-md` if the image bleeds to the card edge — pick one and apply everywhere.
- Content block (padding `12–16px`):
  - Product name (H3, single line with ellipsis overflow — do not wrap to 3 lines and break grid alignment)
  - Price: if a single active variant, show its price directly (e.g. "₹450"); if multiple variants, show a range ("₹250 – ₹950") per existing `PriceDisplay` behavior — do not show a misleading single price when variants differ.
  - Optional badge (top-left corner of the image, overlaid): "Bestseller" / "Festival Special" / "Out of Stock" using the badge tokens from the design system — only one badge at a time, priority: Out of Stock > Festival Special > Bestseller.
  - Inline variant quick-pick (optional, only where the existing project already supports quick-add from a listing card — do not introduce new checkout logic into the card; if quick-add isn't already wired to the cart API, the card's CTA simply routes to the product detail page instead).
  - Primary CTA at the bottom: "Add to Cart" (if quick-add is supported) or "View" (routes to detail page) — never both buttons competing on the same card.
- Out-of-stock state: image slightly desaturated/dimmed (e.g. `opacity: 0.6` on the image only, not the whole card), badge "Out of Stock" shown, CTA replaced with a disabled-style "Notify Me"/"Unavailable" state (no functional notify-me build required unless already planned — a disabled label is sufficient).
- Grid: 2 columns on mobile (`<640px`), 3 columns tablet, 4 columns desktop — consistent gutter using the spacing scale.

## 5. `ProductGrid`

**Purpose**: Wraps a list of `ProductCard`s with consistent grid, loading, and empty states.

- Loading: renders `LoadingSkeleton` cards (same dimensions as `ProductCard`) matching the current grid column count — never a spinner replacing the whole grid area.
- Empty: renders `EmptyState` with a relevant message ("No products found in this category yet" / "No results for '{query}'") and, where sensible, a CTA back to the full catalogue.
- Pagination/load-more: consistent with whatever the existing API pagination pattern is (do not change the pagination mechanism, only its visual presentation — e.g., a centered "Load More" button or numbered pagination styled per the design system, matching whatever already exists).

## 6. `VariantSelector`

**Purpose**: Weight/quantity variant picker on the product detail page (and optionally inline on cards where supported).

- Presentation: a row of pill/chip buttons, one per variant (e.g. `250g` `500g` `1kg`), not a `<select>` dropdown, for faster visual scanning and larger touch targets — dropdown is acceptable as a fallback only if a product has more than ~5 variants.
- Selected state: filled with `--color-primary`, white text. Unselected: outline style, `--color-border`. Out-of-stock variant: chip shown but visually muted/struck-through and disabled (not hidden — customers should see it exists but is currently unavailable, which builds trust rather than confusion).
- Selecting a variant immediately updates the displayed price and stock message on the same page (no page reload) — purely presentational state change, no change to how the underlying data is fetched.

## 7. `QuantitySelector`

**Purpose**: Standard stepper control (cart, product detail).

- `–` / number / `+` layout, minimum 44×44px tap targets on the buttons.
- Respects existing max-quantity-per-item business rule (already defined in the backend/spec) — the `+` button becomes disabled at the max, with a small inline note ("Max 20 per order") rather than a jarring error toast on every extra tap.
- Manual number entry allowed but validated on blur (clamped to valid range), not blocking every keystroke.

## 8. `AddToCartButton`

**Purpose**: Consistent primary commerce CTA, used on product cards and the product detail page.

- States: default ("Add to Cart"), loading (brief inline spinner replacing the label, button stays the same size — no layout shift), success (briefly shows a checkmark + "Added" for ~1.2s then reverts, or transitions into a "Go to Cart" state — pick one pattern and use it everywhere), disabled (out of stock / no variant selected yet).
- On success, also trigger a lightweight, non-blocking confirmation (a toast, or a small cart-icon badge increment animation in the header) — never a full-page redirect to the cart on every add, which interrupts browsing.

## 9. `PriceDisplay`

**Purpose**: Consistent price formatting everywhere (cards, PDP, cart, checkout, orders).

- Format: `₹` symbol + amount with Indian digit grouping (e.g. `₹1,250`), no unnecessary decimals for whole-rupee amounts.
- Strike-through MRP support: when a variant has an `mrp` higher than `price`, show the MRP in `text-muted` with strikethrough immediately before/above the current price, optionally with a small "X% off" chip in the success/accent tone — only where the underlying data actually has an MRP set; never fabricate a discount visual.

## 10. `CartItem`

**Purpose**: A single line in the cart drawer/page.

- Layout: small product image (square thumbnail, ~64–80px), name + variant label (e.g. "Kaju Katli — 500g"), `QuantitySelector`, line total (`PriceDisplay`), remove action (icon button, confirmation not required for a simple quantity-to-zero removal but recommended for an explicit "Remove" tap if the design already requires confirmation elsewhere).
- If the item has gone out of stock since being added (existing business rule from the backend spec), show an inline warning state on this row ("No longer available — please remove") rather than silently failing at checkout.

## 11. `OrderSummary`

**Purpose**: The price-breakdown block used in cart, checkout, and order detail.

- Rows, in order: Subtotal, Discount (if a coupon is applied, shown as a negative amount with the coupon code labeled), Delivery Charge (or "Free" in the success color if waived), Tax (if applicable), then a visually distinct Total row (bolder weight, slightly larger size, top border separating it from the line items above).
- This is a read-only presentational component — the values it renders always come from the backend's computed totals, never recalculated client-side (per existing architecture rule: server is the source of truth for money).

## 12. `DeliverySlotSelector`

**Purpose**: Date + time-slot picker at checkout.

- Date picker: a horizontal scrollable strip of the next N available dates (day-of-week + date, e.g. "Mon 12"), not a full calendar widget, for faster mobile selection — a full calendar is acceptable as a secondary "pick a later date" affordance for scheduled/advance festival orders.
- Time slots for the selected date: a list/grid of slot chips (e.g. "10 AM – 1 PM", "4 PM – 7 PM") showing remaining capacity subtly if low ("Only 2 left") and disabling/greying out full or past-cutoff slots — never removing them entirely, so the customer understands why a slot isn't selectable.

## 13. `PromoBanner`

**Purpose**: A single-message promotional strip, used either as the top-of-page announcement bar (mirroring the "thin persistent trust/offer strip" pattern from Bikanervala) and/or as an inline homepage section.

- Top announcement-bar variant: full-width, `--color-surface-muted` or a subtle tinted background (not the loud saturated brand color across the whole strip), single line of text, optionally dismissible (session-persisted dismissal only, not permanent).
- Inline variant: card-like, image + short copy + one CTA, used for a single active offer/festival collection — do not stack more than 1–2 of these on a page.

## 14. `OfferCard`

**Purpose**: Represents a single offer/coupon-backed promotion in a listing (e.g. an `/offers` page).

- Similar structure to `ProductCard` but content-focused: promo image, title, short description, an optional visible coupon code (shown as a copyable chip, e.g. "Use code DIWALI10"), validity note if near expiry.

## 15. `HamperCard`

**Purpose**: Gift hamper listing card — a specialized `ProductCard` variant.

- Same base structure as `ProductCard`, plus a small "Contains N items" chip and, on hover/tap (or always visible on mobile), a short "What's inside" summary line listing 2–3 key contents before requiring a click to the detail page.

## 16. `ReviewCard`

**Purpose**: A single published review on the product detail page.

- Star rating (filled/outline stars, `--color-accent-gold` for filled), reviewer first name + last-initial (privacy), relative date, comment text (truncated after ~4 lines with a "Read more" toggle for long reviews).

## 17. `EmptyState`

**Purpose**: Consistent empty/zero-data presentation across cart, orders, search results, admin tables.

- Simple centered layout: a small line-art icon or muted illustration (not a heavy custom illustration set — keep this lightweight), one line of primary message, one line of secondary guidance, one CTA where a next action makes sense (e.g. empty cart → "Browse Products").

## 18. `LoadingSkeleton`

**Purpose**: Shimmer/pulse placeholder matching the exact dimensions of the content it's replacing (product card, order row, cart item) — never a generic centered spinner for content areas (per existing UI/UX spec rule).

- Standard pulse animation, subtle (`--color-surface-muted` base, slightly lighter pulse), respecting `prefers-reduced-motion` (disable the pulse animation, show a static muted block instead, for users with that OS setting).

## 19. Toast / Notification Component

**Purpose**: Transient feedback for actions (added to cart, coupon applied, error messages).

- Position: bottom-center on mobile (clear of any sticky bottom CTA bar — see `UI-REDESIGN-PAGE-SPECS.md` for sticky-CTA zones), top-right on desktop.
- Auto-dismiss after ~3–4s, swipe-to-dismiss on mobile, manual close (×) available.
- Variant styling maps to the semantic tokens: success (green), error (danger/red), info (neutral/muted) — never use the primary brand maroon for error states, to avoid confusing "brand color" with "something went wrong."

---

## Implementation Order for These Components

Build/restyle in this order so later components can reuse earlier ones without rework: `PriceDisplay` → `LoadingSkeleton` → `EmptyState` → `SectionHeader` → `CategoryCard` → `ProductCard` → `ProductGrid` → `VariantSelector` → `QuantitySelector` → `AddToCartButton` → `HeroSection` → `PromoBanner` → `OfferCard` → `HamperCard` → `CartItem` → `OrderSummary` → `DeliverySlotSelector` → `ReviewCard` → Toast component.
