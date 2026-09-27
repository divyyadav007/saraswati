# Reference Site Analysis: Neelkanth Sweets

## 1. Observations
The Neelkanth Sweets website uses a highly visual, editorial approach to ecommerce. It focuses on premium presentation rather than standard grid layouts. 
- **Hero**: Highly visual, minimal text, focuses on a rich image with immediate CTAs.
- **Categories**: Uses fluid shapes (ellipses/arches) instead of rigid rectangular cards.
- **Trust Building**: Clearly states quality promises (pure ghee, heritage) very early.
- **Occasion-Based Shopping**: Shifts the user mindset from "what product" to "what event," which is brilliant for Indian sweets.
- **Gifting Focus**: Elevates hampers from standard products to premium lifestyle items.
- **Brand Story**: Emphasizes its local roots to build authenticity.

## 2. Useful UX Patterns Extracted
- Vertical, elliptical category tiles with hovering cutouts.
- Occasion-based discovery (Weddings, Festivals, Puja).
- Clear separation of "Order Now" (immediate craving) and "Plan Ahead" (events).
- Icon-based trust strips (Pure Ingredients, Freshly Prepared).
- Beautiful, airy spacing (70-90px padding) between sections.
- Premium color palette utilizing warm parchment/cream and deep brand accents.

## 3. Features Selected for Saraswati Sweets
- **Categories**: Oval/Elliptical visual category showcase (Already implemented).
- **Hero**: Rich, immersive image with dual CTAs and Barabanki-focused messaging.
- **Trust Section**: "Made With Tradition. Served With Care." with custom icons.
- **Occasions**: A new section to shop for Weddings, Puja, and Festivals.
- **Plan Ahead**: A dual-journey section for immediate orders vs event planning.
- **Local Identity**: "Rooted in Barabanki" story section to differentiate from Lucknow brands.
- **Store Info**: Clear delivery and pickup information section.

## 4. Features Rejected and Why
- **Exact Neelkanth Branding & History**: Rejected. Saraswati has its own Barabanki heritage. We will not use "Lucknow" or false claims.
- **Heavy Frontend Animations**: Rejected. We will keep it fast with subtle 200-300ms CSS transitions to ensure performance on low-end mobile devices.
- **Overly Complex Search Overlays**: Rejected for V1. Standard Next.js server-side filtering is preferred for performance.

## 5. Saraswati-Specific Adaptations
- The color palette uses our custom `#FAF7F2` (Ivory), `#F3EBDD` (Parchment), and `#A91F3D` (Deep Maroon).
- The location is strictly Barabanki/Awadh.
- Heritage illustrations are integrated subtly, primarily in the footer and story section, rather than dominating the ecommerce flow.

## 6. Components to Change
- `apps/web/app/(storefront)/page.tsx` (Major overhaul of homepage sections).
- `apps/web/components/storefront/Navbar.tsx` (Add announcement bar if missing).

## 7. Routes / Backend Changes
- No backend changes required. We will use static mapping to existing categories for Occasions in V1 until the admin feature is requested.
