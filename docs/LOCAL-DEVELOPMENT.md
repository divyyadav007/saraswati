# Saraswati Sweets — Local Development Guide

This guide details the complete local development setup, environment variables, service startup sequences, local network routing, and common troubleshooting steps for the Saraswati Sweets platform.

---

## 1. Required Software & Prerequisites

| Tool | Recommended Version | Purpose |
|---|---|---|
| **Python** | 3.10.x or 3.11.x | FastAPI backend service execution and test suite |
| **Node.js** | 20.x or 22.x LTS | Web storefront & mobile toolchain runtime |
| **pnpm** | 12.x+ | Monorepo package manager for web and workspace scripts |
| **npm** | 10.x+ | Dependency management for Expo mobile application |
| **Expo CLI / Expo Go** | SDK 52+ / Expo 57 | Mobile client development and physical device preview |
| **Docker** *(Optional)* | 24.x+ | Containerized local production build validation |
| **Git** | 2.40+ | Version control |

---

## 2. Directory Structure & Components

```
saraswati/
├── backend/            # FastAPI Python monolith (app, migrations, tests)
├── apps/
│   ├── web/            # Next.js 16 storefront and admin dashboard
│   └── mobile/         # React Native / Expo customer mobile application
├── docs/               # Architecture specs and operational guides
└── package.json        # Workspace orchestration scripts
```

---

## 3. Environment Variables Configuration

Placeholders are used below. Never commit real production secrets into source control.

### A. Backend (`backend/.env`)

```ini
# Application Mode & Core URLs
APP_ENV=development
DEBUG=True
API_V1_PREFIX=/api/v1
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:8081","http://10.0.2.2:8000"]

# Database Connection (Supabase PostgreSQL pooler or direct connection)
# Format: postgresql+asyncpg://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_DEV_PASSWORD@db.pdovuxqbymgqzvaxcwuk.supabase.co:5432/postgres

# Supabase Auth & JWT Verification
SUPABASE_URL=https://pdovuxqbymgqzvaxcwuk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_DEV_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET=YOUR_DEV_SUPABASE_JWT_SECRET

# Razorpay Test Mode Credentials (NEVER USE LIVE KEYS)
RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_TEST_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_TEST_WEBHOOK_SECRET

# Notifications (Development / Sandbox)
RESEND_API_KEY=re_dev_placeholder_key
RESEND_FROM_EMAIL=onboarding@resend.dev
FIREBASE_CREDENTIALS_PATH=
```

### B. Web Storefront & Admin (`apps/web/.env.local`)

```ini
# Backend API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# Supabase Client Configuration
NEXT_PUBLIC_SUPABASE_URL=https://pdovuxqbymgqzvaxcwuk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_DEV_SUPABASE_ANON_KEY

# Razorpay Client Key (Test Mode)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY_ID

# Storefront Branding
NEXT_PUBLIC_STORE_NAME="Saraswati Sweets"
NEXT_PUBLIC_STORE_PHONE="+91 99999 99999"
NEXT_PUBLIC_DEFAULT_CITY="Barabanki"
```

### C. Mobile App (`apps/mobile/.env`)

```ini
# Backend API URL (Use LAN IP or 10.0.2.2 for Android Emulator)
# For web/browser: http://localhost:8000/api/v1
# For Android Emulator: http://10.0.2.2:8000/api/v1
# For Physical Device: http://<YOUR_DEV_PC_LAN_IP>:8000/api/v1
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# Supabase Client Configuration
EXPO_PUBLIC_SUPABASE_URL=https://pdovuxqbymgqzvaxcwuk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_DEV_SUPABASE_ANON_KEY

# Razorpay Test Key
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY_ID
```

---

## 4. Database Setup & Migrations

The development database runs on Supabase dev project (`pdovuxqbymgqzvaxcwuk`).

1. **Verify or Apply Database Schema**:
   All core tables and schemas are tracked in `supabase/migrations/`:
   - `00001_initial_schema.sql` (Profiles, addresses, categories, products, variants, images, hampers, carts, slots, coupons, orders, items, payments)
   - `00002_operations_schema.sql` (Offers, banners, delivery partners, assignments, reviews, notifications, bulk enquiries)
   - `00003_store_settings_audit_logs.sql` (Store settings, audit logs, indexes)
   - `00004_seed_data.sql` (Initial catalogue, slots, test coupons, store settings)

2. **Execute Migrations via Supabase CLI**:
   ```bash
   npx supabase db push
   ```
   Or apply migrations sequentially using the Supabase SQL Editor if operating directly on the remote development instance.

3. **Verify Tables and RLS**:
   Ensure Row Level Security (RLS) is enabled on all 27 tables. Service-role backend accesses bypass RLS safely, while direct client interactions remain restricted.

---

## 5. Starting the Applications Locally

### Step 1: Start Backend (FastAPI)
From repository root or `backend/` directory:
```bash
# From repository root
npm run dev:backend

# Or directly in backend directory with activated virtual environment
cd backend
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **Health Check**: [http://localhost:8000/healthz](http://localhost:8000/healthz)
- **Interactive OpenAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **OpenAPI Schema**: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)

### Step 2: Start Web Storefront & Admin (Next.js)
In a second terminal window:
```bash
# From repository root
npm run dev:web

# Or from apps/web
cd apps/web
pnpm dev
```
- **Storefront URL**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin) (Requires admin authentication)

### Step 3: Start Mobile Application (Expo)
In a third terminal window:
```bash
# From repository root
npm run dev:mobile

# Or from apps/mobile
cd apps/mobile
npm start
```
- Press `w` to open in web browser for rapid UI validation.
- Press `a` to open in connected Android emulator.
- Scan the displayed QR code with the Expo Go app on a physical Android device on the same local Wi-Fi.

---

## 6. Local Network Configuration Guide

Mobile devices and emulators connect across network boundaries differently:

| Client Type | Target URL | Explanation |
|---|---|---|
| **Local Web Browser** | `http://localhost:8000/api/v1` | Web browser runs on the same host machine. |
| **Android Emulator** | `http://10.0.2.2:8000/api/v1` | Android emulators alias host loopback (`127.0.0.1`) to `10.0.2.2`. |
| **Physical Android Device** | `http://<LAN_IP>:8000/api/v1` | `localhost` on a physical device refers to itself. Set `EXPO_PUBLIC_API_BASE_URL` to your computer's local Wi-Fi IP (e.g., `http://192.168.1.15:8000/api/v1`). |

> **IMPORTANT**: Ensure the backend starts with `--host 0.0.0.0` so it listens on all local interfaces, and verify Windows Defender Firewall permits incoming connections on port 8000.

---

## 7. Automated Testing & Verification

### Run Backend Unit & Integration Tests (70 Tests)
```bash
cd backend
venv\Scripts\python -m pytest -v
```

### Run Python Linting & Formatting Check
```bash
cd backend
venv\Scripts\python -m ruff check app tests
```

### Run Mobile TypeScript Typecheck
```bash
cd apps/mobile
npx tsc --noEmit
```

### Validate Web Production Build
```bash
cd apps/web
pnpm build
```

---

## 8. Common Troubleshooting

### Issue 1: CORS Error in Web Console (`Blocked by CORS policy`)
- **Cause**: The incoming browser origin is not listed in `backend/.env`'s `CORS_ORIGINS`.
- **Resolution**: Check the requested origin in Chrome DevTools Network tab and add it to `CORS_ORIGINS` in `backend/.env` (e.g., `["http://localhost:3000", "http://127.0.0.1:3000"]`). Restart the backend.

### Issue 2: Mobile App Fails to Fetch Products (`Network Error`)
- **Cause**: Mobile app is pointing to `localhost:8000`, which resolves internally on the phone/emulator.
- **Resolution**: Update `apps/mobile/.env` with `http://10.0.2.2:8000/api/v1` (for emulator) or your host machine's Wi-Fi IP (for physical phone). Ensure backend is bound to `0.0.0.0`.

### Issue 3: Razorpay Payment Verification Error
- **Cause**: Using live credentials or mismatched Razorpay test key secrets.
- **Resolution**: Verify both `NEXT_PUBLIC_RAZORPAY_KEY_ID` (frontend) and `RAZORPAY_KEY_SECRET` (backend) begin with `rzp_test_` and belong to the same Razorpay test account. Never use `rzp_live_` in development.

### Issue 4: Supabase JWT Expired / 401 Unauthorized
- **Cause**: The access token stored in browser `localStorage` or session cookie has expired.
- **Resolution**: Log out and log back in, or generate a fresh test JWT using the development authentication helpers.
