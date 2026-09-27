# 17-FREE-TIER-SERVICES.md

> Free-tier limits and terms change over time. Before committing to a specific provider/tier at implementation time, re-verify current limits on the provider's official pricing page. The structure below (purpose → free option → approximate limit → what happens at the limit → migration path) is the durable part of this document; exact numbers should be treated as "approximate, verify before relying on."

## 1. Database / Auth / Storage — Supabase

- **Purpose**: Postgres database, authentication (phone OTP + email/password), file storage for images.
- **Free tier**: Supabase Free plan — includes a Postgres database, Auth, and Storage with generous limits for early-stage projects (specific row/storage/bandwidth caps and any project-pause-after-inactivity behavior should be checked on Supabase's current pricing page at implementation time).
- **Approximate limitation**: storage size cap, monthly active user cap for Auth, bandwidth cap, and (historically) inactive free projects may pause after a period of no activity — confirm current behavior.
- **At limit**: Auth/API requests may start failing, or the project may need to be manually "woken"; storage uploads may be rejected once the storage cap is hit.
- **Migration strategy**: Upgrade to Supabase's paid Pro tier (predictable monthly cost, higher limits, no auto-pause) — no application code changes required, only a billing/plan change, since the connection strings and SDK usage remain identical.

## 2. Web Hosting — Vercel

- **Purpose**: hosting the Next.js storefront + admin dashboard.
- **Free tier**: Vercel Hobby plan — suitable for personal/small projects, includes automatic HTTPS, preview deployments, a bandwidth/build-minutes allowance.
- **Approximate limitation**: bandwidth and serverless function execution limits; Hobby plan terms restrict certain commercial usage patterns at scale (verify current Vercel commercial-use terms for the Hobby tier at implementation time, since this affects whether a paid plan is required once the business is clearly commercial).
- **At limit**: builds/requests may be throttled or blocked until the next billing cycle, or an upgrade is required.
- **Migration strategy**: Upgrade to Vercel Pro — same deployment model, environment variables and domain carry over, no code changes.

## 3. Backend Hosting — Free/Low-Cost PaaS

- **Purpose**: running the FastAPI service continuously.
- **Free tier option**: a free tier from a container/PaaS provider (e.g., Render's free web service tier, Railway's trial/hobby credits, or Fly.io's free allowance) — final provider choice made at implementation time based on current offerings, since these change frequently and some free tiers include cold-start sleep after inactivity, which is a real UX concern for an ordering platform (a sleeping backend delays a customer's first request).
- **Approximate limitation**: limited monthly compute hours, possible instance sleep after inactivity (causing a slow first request), limited RAM/CPU.
- **At limit**: service may sleep (added latency) or stop until the next cycle/upgrade.
- **Migration strategy**: move to that provider's lowest paid tier (usually a few dollars/month) once order volume makes cold starts unacceptable, or once compute limits are regularly exceeded — no architecture change required, same Docker container redeployed to a paid instance size.

## 4. Payments — Razorpay

- **Purpose**: online payment collection.
- **Free tier**: no subscription fee; Razorpay charges a per-transaction percentage fee (standard payment-gateway pricing) — there is no "free tier limit" to exceed in the traditional sense, but the transaction fee is an ongoing variable cost, not a fixed infra cost. Verify current transaction fee percentage on Razorpay's pricing page.
- **At limit**: not applicable (usage-based pricing, not a hard cap) — the consideration is business economics, not a technical migration.
- **Migration strategy**: not applicable; Razorpay is already the chosen, sustainable option per requirements.

## 5. Push Notifications — Firebase Cloud Messaging (FCM)

- **Purpose**: Android push notifications.
- **Free tier**: FCM is free for standard push notification volume (no meaningful cap for a single local business's order volume).
- **At limit**: effectively not a concern at this scale.
- **Migration strategy**: none needed; if the business later needs richer messaging (in-app messaging campaigns, A/B testing), Firebase's paid features could be adopted additively.

## 6. Transactional Email — Resend

- **Purpose**: order confirmation, status-change, and admin-notification emails.
- **Free tier**: Resend's free tier includes a monthly email-send allowance (verify current number at implementation time) sufficient for early-stage volume.
- **At limit**: further emails may be queued/rejected until the next billing cycle.
- **Migration strategy**: upgrade to Resend's paid tier, or as a fallback, another free-tier transactional provider (e.g., a comparable free tier from another ESP) behind the same `NotificationSender`/email-sender interface (`04-ARCHITECTURE.md` §9) — swapping providers requires only a new adapter implementation, not changes to business logic.

## 7. Maps — Google Maps Platform

- **Purpose**: address autocomplete/geocoding for delivery addresses; minimal usage per the cost principle.
- **Free tier**: Google Maps Platform provides a recurring monthly usage credit before billing kicks in (verify current credit amount at implementation time).
- **Approximate limitation**: the free credit covers a limited number of Geocoding/Places Autocomplete API calls per month.
- **At limit**: further calls are billed per Google's standard per-request pricing.
- **Migration strategy**: minimize calls by design (debounce autocomplete input, cache geocoding results per address, only geocode on explicit address save rather than on every keystroke); if usage grows, either accept the (typically small) billed cost or switch to a free/open alternative for basic address validation (e.g., a pincode-lookup-only approach using India Post's public pincode data, avoiding full geocoding entirely, if precise lat/long isn't actually required for the delivery model) — the `MapsProvider` interface (`04-ARCHITECTURE.md` §9) makes this swap additive.

## 8. Source Control / CI — GitHub

- **Purpose**: version control, pull requests, CI (GitHub Actions).
- **Free tier**: GitHub free plan + GitHub Actions free minutes allowance for private/public repos — sufficient for this project's CI needs (lint/test/build) at this scale.
- **At limit**: CI minutes exhausted mid-month would pause automated CI until reset or a paid plan.
- **Migration strategy**: GitHub Team/paid Actions minutes if ever needed — unlikely at this project's scale.

## 9. Summary Table

| Service | Purpose | Free tier suitable for V1? | Primary risk |
|---|---|---|---|
| Supabase | DB/Auth/Storage | Yes | Possible inactivity pause; storage/bandwidth cap |
| Vercel | Web hosting | Yes | Commercial-use terms at scale; bandwidth cap |
| Backend PaaS | API hosting | Yes, with care | Cold starts after sleep |
| Razorpay | Payments | N/A (usage-based) | Per-transaction fee, not a free-tier concern |
| FCM | Push | Yes | None material at this scale |
| Resend | Email | Yes | Monthly send cap |
| Google Maps | Address lookup | Yes, if usage minimized | Billing beyond free monthly credit |
| GitHub | Source/CI | Yes | Actions minutes cap (unlikely to hit) |

## 10. Principle Going Forward

Before introducing any new third-party paid service, confirm: (1) it is genuinely required for a stated feature, (2) no free/open-source alternative meets the requirement adequately, (3) the business has reached a scale where the cost is clearly justified by the value delivered. Document the decision in `26-CHANGELOG.md` when it happens.
