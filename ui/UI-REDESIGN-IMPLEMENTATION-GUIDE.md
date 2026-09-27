# UI-REDESIGN-IMPLEMENTATION-GUIDE.md — Saraswati Sweets

Give this file, along with `UI-REDESIGN-DESIGN-SYSTEM.md`, `UI-REDESIGN-COMPONENT-SPECS.md`, and `UI-REDESIGN-PAGE-SPECS.md`, to Antigravity as the source of truth for the UI-only redesign. This is a **presentation-layer change**, not a rebuild.

## 1. What This Redesign Is

A visual and structural UI refresh of the existing Saraswati Sweets web app, mobile app, and (visual-tokens-only) admin panel, based on design patterns synthesized from three reference sweets-business websites (Chhappan Bhog, Bikanervala, and general knowledge of Madhurima Sweets' positioning — see `UI-REDESIGN-DESIGN-SYSTEM.md` §1–2 for the full analysis). Nothing here is a copy of any reference site's branding, copy, images, or exact layout — it is an original design system for Saraswati Sweets, inspired by common patterns across premium Indian sweets e-commerce.

## 2. What Must NOT Change

- Backend architecture, database schema, API contracts/endpoints, authentication/authorization logic, RBAC, business rules (pricing computation, coupon validation, order state machine, payment verification).
- Any existing working functionality: guest browsing, cart, variants, coupons, gift hampers, checkout, COD, Razorpay (test mode), orders, order tracking, reviews, bulk enquiries, notifications, delivery management, Supabase integration.
- Data flow: if a page currently fetches data via a specific hook/service/API call, keep that call exactly as-is; only change how the returned data is rendered.
- Do not replace any real data with mock/hardcoded data at any point, even temporarily "to see the design" — build against real API responses (using existing dev/staging data).
- Do not introduce a new heavy UI/animation library. Continue using the existing Tailwind + shadcn/ui foundation (per `docs/07-UI-UX-SPECIFICATION.md` and `docs/13-WEB-APP.md`/`docs/12-MOBILE-APP.md`).

## 3. What Changes

- Design tokens: colors, typography, spacing, radius, shadows — per `UI-REDESIGN-DESIGN-SYSTEM.md`.
- Component markup/styling and composition — per `UI-REDESIGN-COMPONENT-SPECS.md`.
- Page layout/structure and section ordering — per `UI-REDESIGN-PAGE-SPECS.md`.
- Purely client-side presentational behavior: hover states, open/close of menus/sheets, skeleton loading, toasts, sticky positioning, responsive breakpoints.

## 4. Before Starting — Inspection Step (do this first, every time)

1. Read `UI-REDESIGN-DESIGN-SYSTEM.md`, `UI-REDESIGN-COMPONENT-SPECS.md`, `UI-REDESIGN-PAGE-SPECS.md` in full.
2. Open the actual current codebase and, for each component/page named in these specs, find the existing equivalent (it may have a different name or structure than assumed here — these specs were written without access to the live code, so treat file/component names in them as *intent*, not literal existing filenames).
3. Note any mismatch between what these specs assume and what actually exists (e.g., if quick-add-to-cart from a listing card isn't currently wired up, don't invent new cart-mutation logic just to satisfy the `ProductCard` spec — fall back to "View" routing to the detail page, as the spec allows).
4. Confirm current Tailwind config / shadcn theme file locations before adding new design tokens, so tokens are added in the correct, single source of truth rather than scattered inline styles (per the original brief's explicit instruction: "Do NOT scatter arbitrary colors and styles throughout individual components").

## 5. Implementation Order

Follow `UI-REDESIGN-PAGE-SPECS.md`'s priority list at the very end of that file (tokens → header/footer → homepage → listing/detail → gift hampers → cart → checkout → orders → profile → bulk orders/offers → mobile → admin tokens). Build/restyle shared components (`UI-REDESIGN-COMPONENT-SPECS.md`'s implementation order) before the pages that use them, so no page work needs redoing once a shared component is finalized.

## 6. Responsive Testing Checklist (test at every stage, not just at the end)

Test each redesigned page/screen at: 360px, 390px, 430px, tablet (~768px), 1366px, 1440px, and a large desktop width (~1920px). Specifically verify:
- No horizontal scroll at any width.
- Touch targets ≥44×44px on mobile widths.
- Sticky CTA bars (cart, checkout, add-to-cart) never overlap content or get hidden behind the mobile tab bar/browser chrome.
- Product/category grids reflow to the correct column count at each breakpoint per `UI-REDESIGN-DESIGN-SYSTEM.md` §5.8.
- Text never truncates awkwardly mid-word; use ellipsis/line-clamp intentionally where specified.

## 7. Performance Checklist

- All product/category/hamper/banner images through the framework's optimized image component (Next.js `Image` on web, an equivalent optimized loader on mobile), correctly sized `sizes`/`srcSet`, lazy-loaded below the fold.
- No new large client-side JS bundle from an unnecessary library — check bundle size impact before adding any dependency.
- Skeleton loaders (not spinners) for any content area with a real network fetch.
- Respect `prefers-reduced-motion` for any animation.

## 8. Functionality-Preservation Checklist (run after each page is redesigned, not just at the very end)

For the page just redesigned, manually verify:
- [ ] All existing links/buttons still route to the correct place.
- [ ] Any form on the page still submits successfully and validation errors still surface correctly.
- [ ] Any data previously displayed is still displayed (nothing silently dropped during restyling).
- [ ] Loading and error states (not just the happy path) render correctly with the new components.
- [ ] Auth-gated content still correctly gates (e.g., cart/orders/profile still require login exactly as before).
- [ ] No console errors introduced.

## 9. Visual QA (before calling any page "done")

Actually render the page in a browser/simulator at the breakpoints in §6 and visually compare against the intended design direction (premium, warm, uncluttered — not a generic food-delivery look) before marking it complete. Do not mark a page as redesigned based only on reading the code — inspect the rendered result.

## 10. Final Report

After completing the pages in the priority order, produce `docs/ui-redesign-report.md` covering: reference sites analyzed, patterns adopted/rejected, the design system applied, components built/reused, pages redesigned, mobile changes, responsive testing results, performance notes, confirmation that all functionality in §2 still works, any known remaining visual issues, and which screens should still be manually reviewed by a human before considering the redesign complete.

## 11. Stop Condition

Stop after the UI redesign and its visual QA are complete and the report exists. Do not use this redesign work as a reason to also refactor backend logic, change the database schema, or add features not requested here.
