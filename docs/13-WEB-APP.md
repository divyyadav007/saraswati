# 13-WEB-APP.md

## 1. Scope

Single Next.js application serving two logical areas from the same codebase and deployment: the public customer storefront and (protected) the admin dashboard, per `04-ARCHITECTURE.md` ADR-0001.

## 2. Stack & Structure

- Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- Folder structure (indicative):
```
apps/web/
  app/
    (storefront)/
      page.tsx                 # Home
      categories/[slug]/
      products/[slug]/
      cart/
      checkout/
      orders/
      orders/[id]/
      profile/
      gift-hampers/
      gift-hampers/[slug]/
      bulk-enquiry/
      contact/
    admin/
      login/
      dashboard/
      products/
      categories/
      orders/
      orders/[id]/
      customers/
      coupons/
      offers/
      banners/
      gift-hampers/
      bulk-enquiries/
      delivery/
      reports/
      settings/
    api/                        # only if any thin Next.js-side route handlers are needed (e.g., webhooks proxy) — default: none, backend is FastAPI directly
  components/
    ui/                         # shadcn/ui generated components
    storefront/
    admin/
    shared/
  lib/
    api-client.ts                # single fetch wrapper for the FastAPI backend
    supabase-client.ts            # Supabase Auth SDK init
    design-tokens.ts
  middleware.ts                  # auth/role gate for /admin/**
```

## 3. Rendering Strategy

- Public catalogue pages (home, category, product detail): Server-rendered/statically generated where practical with revalidation (ISR, e.g., revalidate every few minutes) for performance and SEO, since these are public marketing-relevant pages for a local business (SEO matters for "sweets shop near me" type searches).
- Authenticated pages (cart, checkout, orders, profile, all of `/admin/**`): client-rendered or server-rendered with per-request auth, no static caching of personalized data.
- SEO: proper `<title>`/meta description per product/category page, Open Graph tags for social sharing, a sitemap.xml and robots.txt.

## 4. API Communication

- A single typed API client wraps all calls to the FastAPI backend, attaching the current Supabase session's access token as `Authorization: Bearer` automatically, centralizing error handling (mapping backend error envelopes to UI-friendly messages/toasts) and base URL configuration (`NEXT_PUBLIC_API_BASE_URL`).

## 5. Forms & Validation

- Forms (checkout, address, admin product/coupon forms) use a schema-based validation library (e.g., Zod) mirroring backend Pydantic validation rules where practical, to give immediate client-side feedback while the backend remains the authoritative validator.

## 6. Image Handling

- Product/category/banner images served via Next.js `<Image>` component pointing at Supabase Storage public URLs, with defined `sizes`/responsive breakpoints for the product grid and detail gallery.

## 7. Payments Integration (Web)

- Razorpay Checkout.js loaded via the allowed external script mechanism (a standard `<script>` tag from Razorpay's CDN, added carefully with Next.js `Script` component using `strategy="lazyOnload"` or `afterInteractive"` as appropriate) — see `09-PAYMENTS.md` for the flow.

## 8. Admin-Specific Considerations

- `middleware.ts` checks the Supabase session and role claim (fetched once and cached appropriately) before allowing access to `/admin/**`; unauthenticated users redirect to `/admin/login`, authenticated-but-wrong-role users see a clear "not authorized" page rather than a silent redirect loop.
- Admin data tables use shadcn/ui `Table` + pagination controls consistent with the backend's pagination envelope (`06-API-SPECIFICATION.md`).

## 9. Performance Targets

- Lighthouse performance score target ≥85 on the storefront home/product pages on a simulated mid-tier mobile connection.
- Largest Contentful Paint (LCP) primarily driven by the hero/first product image — must be optimized (correct `priority` flag on the LCP image, appropriately sized).

## 10. Accessibility

Per `07-UI-UX-SPECIFICATION.md` §5 — semantic HTML, labeled form fields, sufficient contrast, keyboard navigability, especially for the checkout flow (a broken checkout for keyboard/screen-reader users directly costs the business orders).

## 11. Deployment

Deployed to Vercel — see `16-DEPLOYMENT.md` for environment variable wiring, preview deployments per PR, and production promotion process.
