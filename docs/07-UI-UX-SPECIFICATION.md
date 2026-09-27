# 07-UI-UX-SPECIFICATION.md

## 1. Brand Direction

The product must feel like a **premium local Indian sweets brand**, not a generic food-delivery clone (avoid Swiggy/Zomato visual tropes: heavy red/orange gradient banners, aggressive discount badges everywhere, cluttered cards). Reference feeling: a clean modern mithai boutique — think warm neutral tones, generous whitespace, quality product photography as the hero, restrained gold/maroon accents evoking festive Indian sweets packaging without looking gaudy.

## 2. Design System (shared by web admin/storefront; mobile mirrors it)

### 2.1 Color Tokens (Tailwind config / CSS variables)
- `--color-background`: warm off-white (e.g., `#FBF7F2`)
- `--color-surface`: white (`#FFFFFF`)
- `--color-primary`: deep maroon/saffron accent (e.g., `#8A1538` or `#C1440E` — final exact value chosen at implementation time, kept consistent across web/mobile via a single shared token file)
- `--color-accent-gold`: `#C9A227` (used sparingly — festival badges, hamper highlights, not global chrome)
- `--color-text-primary`: near-black (`#1F1B16`)
- `--color-text-muted`: warm gray (`#6B6258`)
- `--color-success`, `--color-warning`, `--color-danger`: standard semantic greens/ambers/reds, desaturated to fit the warm palette
- Dark mode: not required for V1 customer storefront (optional nice-to-have); admin panel light-only in V1.

### 2.2 Typography
- Headings: a serif or slab-serif with warmth (e.g., a Google Font like "Fraunces" or "Playfair Display") for a premium/artisanal feel.
- Body/UI: a clean humanist sans-serif (e.g., "Inter" or "Manrope") for readability and fast rendering.
- Base body size 16px minimum for accessibility; headings scale via a defined type scale (e.g., 1.25 ratio).

### 2.3 Components
Built on **shadcn/ui** primitives (Button, Card, Dialog, Sheet, Tabs, Badge, Select, Input, Toast, Skeleton, Table for admin) customized to the token set above. No custom component library from scratch beyond what shadcn/ui + Tailwind provide, to keep V1 velocity high.

### 2.4 Spacing & Layout
- 4px base spacing scale (Tailwind default), consistent card padding (16–24px), consistent grid gutters.
- Storefront product grid: 2 columns on mobile, 3–4 on desktop, responsive via Tailwind breakpoints.

### 2.5 Motion
Minimal, per requirements: only functional transitions (page/section fade or slide of ≤200ms, skeleton-to-content swap, toast enter/exit). No parallax, no scroll-triggered animation, no decorative Lottie/confetti in V1.

## 3. Key Screens — Customer (Web & Mobile, same IA)

1. **Home** — hero/banner carousel, featured categories, featured products, festival collection callout (if active), bulk/corporate enquiry CTA in footer/menu.
2. **Category / Product Listing** — filter/sort bar (collapsible on mobile into a sheet), product grid with image, name, price range ("From ₹250"), out-of-stock badge where applicable.
3. **Product Detail** — image gallery, name, description, variant selector (weight chips, e.g. `250g | 500g | 1kg`), live price update on variant selection, quantity stepper, Add to Cart CTA (sticky on mobile), reviews section.
4. **Cart** — line items with variant label, quantity edit, remove, subtotal, coupon field, "Proceed to Checkout" CTA.
5. **Checkout** — stepper: Address → Slot → Payment → Review, or a single scrollable page with clear sections (mobile-first single-page recommended over multi-step to reduce navigation friction) — final pattern decided at implementation, documented as an ADR if it deviates from single-page.
6. **Order Confirmation** — order number, summary, estimated delivery slot, "Track Order" CTA.
7. **Order History / Detail / Tracking** — list with status badges; detail shows itemized order + status timeline.
8. **Profile** — name/phone/email, saved addresses, notification preferences, logout.
9. **Gift Hampers listing/detail** — same pattern as product listing/detail, with an explicit "What's inside" composition list.
10. **Bulk/Corporate/Wedding Enquiry form** — simple single-page form, no login required, clear confirmation state after submit.
11. **Contact/Store Info** — address, phone, hours, map embed (static or lightweight Google Maps embed).

## 4. Key Screens — Admin

See `11-ADMIN-PANEL.md` for full detail. Design goals specific to admin: simple, clear, data-forward (tables, not cards, for lists), obviously labeled primary actions, confirmation dialogs before destructive/irreversible actions (delete product, cancel order, refund).

## 5. UX Rules

- **Price visibility**: price for the selected/default variant always visible on listing cards, never hidden behind a click.
- **CTAs**: one clear primary action per screen/section (e.g., single prominent "Add to Cart", not competing buttons).
- **Loading states**: skeleton placeholders for product grids/detail/cart/orders (shadcn `Skeleton`), not blank screens or generic spinners for content areas; a spinner is acceptable only for button-level submit actions.
- **Empty states**: every list (cart, orders, search results, admin tables) has a designed empty state with a helpful next action, not just "No data".
- **Errors**: inline field errors on forms; toast for transient action errors; a dedicated error boundary/page for unrecoverable errors — never a raw stack trace shown to the user (see `22-ERROR-HANDLING.md`).
- **Accessibility**: semantic HTML, sufficient color contrast (WCAG AA) for text on background colors, all interactive elements keyboard-reachable on web, form inputs labeled (not placeholder-only), tappable targets ≥44px on mobile.
- **Mobile-first**: every screen designed for a small viewport first, then enhanced for tablet/desktop breakpoints.

## 6. Reusable Design System Deliverable

Implementation must produce a small shared token/config used by both the Next.js Tailwind config and (where feasible) mirrored constants for React Native styling, so colors/typography stay consistent across web and mobile without copy-paste drift becoming unmanageable. A `packages/shared` (or `apps/web` exported) `design-tokens.ts` (colors, spacing, font families as string constants) is the single source; React Native reads the same constants (Tailwind config cannot be shared directly with RN, but the token values can).

## 7. Content/Photography Guidance

- Product photography should be well-lit, consistent background/aspect ratio (documented as a simple in-house photography guideline outside the codebase, not a technical requirement, but the frontend must assume a consistent aspect ratio, e.g., 1:1 or 4:3, and crop/letterbox gracefully if a shop-provided photo deviates).
- Placeholder image shown for products without a photo yet, never a broken image icon.
