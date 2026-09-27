# UI-REDESIGN-DESIGN-SYSTEM.md — Saraswati Sweets

**Status: Phases 1, 2 and 4 only.** Phases 3 and 5–9 (codebase inspection, component implementation, responsive/visual QA, functionality-preservation verification, final report) are **not yet done** — see the blocking note at the end of this document. This file itself is the Phase-4 deliverable and should be merged into `docs/07-UI-UX-SPECIFICATION.md` once the project's actual UI work begins.

---

## 1. Reference Sites Analyzed

| Site | Accessible? | Notes |
|---|---|---|
| chhappanbhog.com | Yes (fetched directly) | Legacy Lucknow sweets brand, WooCommerce storefront |
| bikanervala.com | Yes (fetched directly) | Large multi-country sweets/restaurant chain, Shopify storefront |
| madhurimasweets.com | **No** — blocks automated access via robots.txt | Analysis below is inference from indexed/third-party content only (app store listing, review snippets), explicitly flagged; nothing here should be treated as a verified UI observation of the live site |

## 2. Common Patterns Discovered (see full breakdown in the chat response)

1. Thin persistent trust/offer strip above the main header (delivery time, free-delivery threshold, live offer).
2. Gifting/Hampers treated as a first-class top-level nav item, not nested under a general "Sweets" category.
3. Icon-led trust badges near the top of the homepage (years in business, handmade, delivery promise) — short and scannable, never paragraph-length.
4. Image-tile category grids as the dominant homepage browsing pattern, ahead of dense product listings.
5. Variant (weight) selection surfaced as early as possible — ideally on the product card itself, definitely high on the product detail page.
6. A short heritage/story block (a few sentences + one photo + one CTA), not a full essay, on the homepage.
7. Bulk/corporate/wedding enquiry kept low-key (footer link or a dedicated page) — separate from, not competing with, the primary retail cart flow.
8. A persistent, low-friction contact affordance (WhatsApp/phone) for a customer base that still trusts a phone call.

## 3. Patterns Deliberately Not Adopted

- Dense mega-menus with many near-duplicate categories — decision fatigue; not needed for a single-shop catalogue of this size.
- Multi-country restaurant-locator navigation complexity — irrelevant to a single-location business.
- Auto-opening location/pincode modals on first page load — mildly disruptive; serviceability is instead checked at address entry during checkout, which the platform already does.
- Generic red/orange "food-delivery-app" gradient visual language — explicitly rejected in favor of a warmer, more restrained, boutique feel.

## 4. Design Direction Statement

Saraswati Sweets should read as a **boutique, family-legacy mithai brand that happens to have an excellent online ordering experience** — not a food-delivery app that happens to sell sweets. Concretely: more whitespace and fewer simultaneous CTAs than any of the three references (all three are somewhat denser than we want), large unobstructed product photography as the primary visual driver of appetite appeal, a warm neutral palette with a single confident accent, and interaction patterns simple enough that a first-time older customer never has to guess what to tap next.

Brand feel checklist: premium, authentic, appetizing, trustworthy, elegant, unmistakably Indian-sweets (not a generic bakery/dessert brand), modern without being corporate/cold, easy for non-technical users, fast and conversion-focused.

## 5. Design System (tokens)

### 5.1 Color

| Token | Value (starting point — confirm against real product photography before finalizing) | Usage |
|---|---|---|
| `--color-background` | `#FBF7F1` (warm ivory) | Page background |
| `--color-surface` | `#FFFFFF` | Cards, sheets, modals |
| `--color-surface-muted` | `#F3EBE0` | Secondary section backgrounds, alternating page sections |
| `--color-primary` | `#8A1538` (deep maroon) | Primary buttons, links, active nav state |
| `--color-primary-hover` | `#701029` | Primary button hover/active |
| `--color-accent-gold` | `#C9A227` | Festival badges, hamper highlights, dividers — used sparingly, never as a large fill |
| `--color-text-primary` | `#1F1B16` | Headings, body text |
| `--color-text-muted` | `#6B6258` | Secondary text, captions, meta info |
| `--color-border` | `#E8DFD2` | Card borders, dividers |
| `--color-success` | `#2E7D4F` | In-stock, order-confirmed states |
| `--color-warning` | `#B8781E` | Limited stock, slot-almost-full |
| `--color-danger` | `#B3261E` | Out-of-stock, errors, destructive actions |

Do not introduce a bright red/orange as the dominant chrome color (deliberately avoiding the generic food-delivery-app look identified in Phase 2). The maroon/gold pairing is the brand's signature and should appear consistently across web, mobile, and admin wherever a "Saraswati Sweets" identity moment occurs (splash screen, email header, order-confirmation banner).

### 5.2 Typography

- **Headings**: a warm serif/slab-serif (e.g. "Fraunces" or "Playfair Display") — evokes craft and heritage.
- **Body/UI**: a clean humanist sans-serif (e.g. "Inter" or "Manrope") for maximum legibility, especially for older users.
- Type scale (rem, 16px base):
  | Level | Size | Weight | Use |
  |---|---|---|---|
  | Display | 2.75rem / 44px | 600 | Hero headline only |
  | H1 | 2.25rem / 36px | 600 | Page titles |
  | H2 | 1.75rem / 28px | 600 | Section headers |
  | H3 | 1.375rem / 22px | 600 | Card/product titles |
  | Body Large | 1.125rem / 18px | 400 | Product description, key copy |
  | Body | 1rem / 16px | 400 | Default UI text |
  | Small | 0.875rem / 14px | 400 | Meta, captions, timestamps |
- Minimum body size 16px anywhere a price or quantity is shown — never shrink transactional text below this for "older/non-technical customer" accessibility.

### 5.3 Spacing, Radius, Shadow

- Spacing scale: Tailwind default 4px base (`1`–`24`), primary content gutters at `16px` mobile / `24px` tablet / `32px` desktop.
- Border radius: `--radius-sm: 6px` (inputs, small badges), `--radius-md: 12px` (cards, buttons), `--radius-lg: 20px` (hero panels, sheets/modals).
- Shadows kept minimal — one soft elevation token (`--shadow-card: 0 2px 12px rgba(31,27,22,0.06)`) used for cards; no heavy drop shadows or glassmorphism.

### 5.4 Buttons

| Variant | Use |
|---|---|
| Primary (filled maroon, white text) | Add to Cart, Place Order, Pay Now — one per screen/section |
| Secondary (outline maroon) | Secondary actions: "View Details", "Add Another Address" |
| Ghost/text | Tertiary actions: "Skip", "Cancel" |
| Destructive (filled danger) | "Remove Item", "Cancel Order" — always behind a confirmation |

Minimum tap target 44×44px on mobile for every button/interactive control, per the existing UI/UX spec's accessibility rules.

### 5.5 Cards

- Product card: `radius-md`, `shadow-card`, image aspect ratio locked to **1:1** (square) for grid consistency across mixed product photography, price and (if applicable) an inline variant selector below the title, an "Add to Cart" affordance that doesn't require opening the detail page for simple single-tap adds.
- Category tile: image-led, `radius-md`, name overlay or caption below — mirrors the image-tile pattern identified as a strong shared reference pattern.
- Hamper card: same base as product card, plus a small "What's inside" chip/count indicator distinguishing it visually from a single product.

### 5.6 Inputs

- `radius-sm`, `1px` border in `--color-border`, `--color-primary` border + subtle ring on focus, label always visible above the input (never placeholder-only) per existing accessibility rules.

### 5.7 Badges

- "Bestseller", "Festival Special", "Out of Stock", "Limited Stock" — small pill badges, `radius-sm`/full-round, using `--color-accent-gold` (bestseller/festival), `--color-danger` (out of stock), `--color-warning` (limited) as background tints at low opacity with matching darker text, not solid saturated fills, to keep them subtle rather than shouting.

### 5.8 Containers & Breakpoints

- Max content width: `1280px` desktop, full-bleed hero sections allowed to exceed this with inner content constrained.
- Breakpoints (Tailwind defaults, verified against the required test widths): `sm 360–639px`, `md 640–1023px` (covers 390/430/tablet), `lg 1024–1365px`, `xl 1366–1439px`, `2xl 1440px+`.

### 5.9 Image Aspect Ratios

- Product grid/card: 1:1
- Product detail gallery: 1:1 primary, 4:5 acceptable for a secondary lifestyle/gifting shot
- Category tiles: 1:1 or 4:3
- Hero banners: 21:9 desktop, 4:5 or 1:1 crop served on mobile (do not simply scale the desktop crop down)

## 6. Where This Goes Next

This document defines tokens and direction only. It should be:
1. Merged into `docs/07-UI-UX-SPECIFICATION.md` (or referenced from it) as the authoritative visual spec.
2. Translated into an actual `tailwind.config` theme + shadcn CSS variables once the codebase exists.
3. Used as the basis for the reusable component list (ProductCard, CategoryCard, HeroSection, etc.) named in the original brief, once implementation starts.

## 7. Blocking Note — Cannot Proceed to Phases 3/5–9 Yet

No Saraswati Sweets codebase (web app, mobile app, components, Tailwind config, admin panel) exists in this environment. Only the markdown specification set from the prior request (`docs/PROJECT-CONTEXT.md` and `01`–`26`) exists — no application code has been scaffolded or implemented yet. Phases 3 and 5 through 9 all require reading and modifying real code, and cannot be performed against documentation alone without producing fictional "before/after" claims.

**To continue, one of the following is needed:**
- Point me to the actual repository (upload it, or if it's in a connected GitHub/Google Drive, say so and I'll pull it in), so Phase 3 (compare docs vs. real code) and Phase 5 (implement components/pages) can proceed for real; or
- Confirm you'd like me to first **scaffold the actual Next.js/Expo/FastAPI codebase** from the existing spec documents (this wasn't part of the original documentation-only request), after which this design system can be implemented directly into it in the same session or a follow-up one.

I have not fabricated any inspection of existing code, component names, or file structure beyond what appears in the specification documents already produced — everything above Section 7 is genuinely new analysis (reference sites + design system); nothing below Section 4 should be read as a report of work already done in a codebase.
