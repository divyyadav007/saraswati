# Saraswati — Sweetshop Online Ordering Platform

An online ordering platform for a local Indian sweets (mithai) shop in Barabanki, Uttar Pradesh.

**Customers** can browse the catalogue, order by weight variant, schedule deliveries, and pay via COD or Razorpay.  
**Admin** manages products, orders, delivery, coupons, and more from a simple dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python · FastAPI · SQLAlchemy · Alembic |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (Phone OTP + Email/Password) |
| Web | Next.js · TypeScript · Tailwind CSS · shadcn/ui |
| Mobile | Expo · React Native · TypeScript (Android) |
| Payments | Razorpay |
| Notifications | Firebase Cloud Messaging · Resend |

## Project Structure

```
saraswati/
├── docs/              # Specification documents (source of truth)
├── apps/
│   ├── web/           # Next.js (storefront + admin dashboard)
│   └── mobile/        # Expo React Native (Android)
├── backend/           # FastAPI modular monolith
├── packages/shared/   # Design tokens
├── scripts/           # Utility scripts
└── .github/workflows/ # CI
```

## Getting Started

> Prerequisites: Python 3.11+, Node.js 20+, pnpm, a Supabase project

1. Clone the repository
2. Copy `.env.example` to `.env` in each app directory and fill in values
3. Install dependencies:
   ```bash
   # Backend
   cd backend && pip install -r requirements.txt

   # Web
   cd apps/web && pnpm install

   # Mobile
   cd apps/mobile && pnpm install
   ```
4. Run database migrations:
   ```bash
   cd backend && alembic upgrade head
   ```
5. Start development servers:
   ```bash
   # Backend
   cd backend && uvicorn app.main:app --reload

   # Web
   cd apps/web && pnpm dev

   # Mobile
   cd apps/mobile && npx expo start
   ```

## Documentation

See the `docs/` directory for the complete specification set (26 files covering requirements, architecture, database schema, API spec, security, payments, and more).

Start with [PROJECT-CONTEXT.md](PROJECT-CONTEXT.md) for an overview.

## License

Private — All rights reserved.
