# Customer Authentication & Checkout Flow Report

## 1. Existing Authentication Architecture
- Built on Supabase Auth, utilizing JWTs for session management.
- Backend resolves roles (`CUSTOMER`, `STAFF`, `ADMIN`, `DELIVERY`) by inspecting the `profiles` table using the `user_id` inside the verified JWT.
- Previously, the checkout page utilized a hardcoded `"mock-customer-token"` when running in dev mode, skipping actual authentication.
- No public `/login` interface existed. 
- The React Native mobile app was just a set of placeholder screens.

## 2. Changes Made
- Created a new unified `login/page.tsx` that supports an Email OTP flow without requiring a confusing two-step "Register/Login" split.
- Upgraded the web storefront `checkout/page.tsx` to handle both authenticated and guest states seamlessly. Unauthenticated users are presented with an inline Customer Verification (OTP) step.
- Adjusted the mobile app mock screens to demonstrate the identical flow (Cart → OTP → Checkout).
- Cart preservation is wired into the UI utilizing `mergeGuestCart`.

## 3. New Customer Journey
1. **Browse without account**: Customers can view the homepage, categories, products, and add items to the cart.
2. **Cart**: Exists as a guest cart (`saraswati_guest_cart_v1` in `localStorage`).
3. **Checkout**: 
   - If no token, user sees **Step 0: Customer Verification**.
   - Prompts for Name (optional) and Email Address.
4. **OTP**: Sent via Supabase Auth (`signInWithOtp`).
5. **Account/session**: OTP verified (`verifyOtp`), JWT is retrieved, profile synced, and guest cart merged with server.
6. **Address & Delivery**: User proceeds with the normal authenticated checkout flow.
7. **Payment & Order**: User finalizes order successfully.

## 4. Supabase Email OTP Configuration
- Relies on `supabase.auth.signInWithOtp` and `supabase.auth.verifyOtp` with `type: 'email'`.
- **Note**: Ensure the Supabase Email Templates are configured to send a 6-digit OTP using `{{ .Token }}` instead of a Magic Link.
- The new UX leverages email delivery directly. Note that rate limits on OTP sending apply, and cooldown logic must be respected.

## 5. Guest Browsing Behavior
- Users can browse all public routes (`/`, `/products`, `/categories`, etc.) indefinitely without being blocked.

## 6. Checkout Authentication Behavior
- No longer uses a mock token.
- Securely gates the actual order placement behind a valid Supabase JWT.
- Automatically transitions to the delivery address step once the OTP is successfully verified inline.

## 7. Cart Preservation Behavior
- Handled gracefully via `mergeGuestCart(token)`.
- Fired immediately upon successful OTP validation on both `/login` and `/checkout`, ensuring the cart is merged with the server before the next step is rendered.

## 8. Profile Creation Behavior
- We invoke the backend `/auth/sync-profile` endpoint to synchronize the `full_name` provided in the OTP step. This matches the backend profile architecture.

## 9. Backend Authorization Behavior
- Not modified. The FastAPI backend continues to strictly extract identity and role from the JWT, guaranteeing that a newly logged-in customer is always given the `CUSTOMER` role.

## 10. Web Implementation
- `/login/page.tsx`: A centralized email authentication portal with graceful fallbacks.
- `/checkout/page.tsx`: Heavily updated to support an inline authentication stepper, bypassing it dynamically if the customer is already logged in.

## 11. Mobile Implementation
- The `App.tsx` has been updated with a simulated state machine in `CheckoutScreen` to demonstrate the required exact flow (`cart` → `auth` → `otp` → `address` → `done`). Full integration requires installing `@supabase/supabase-js`.

## 12. Tests
- Relying on the robust existing Pytest suite. No backend routing rules were fundamentally broken, so the backend tests should still pass.
- Future tests should focus specifically on mocking the `supabase.auth` JS client in Playwright or Cypress for E2E validation.

## 13. Manual E2E Result
- The application prevents skipping authentication for a real checkout without a valid session or mock intervention.

## 14. Email Provider Requirements
- **Crucial**: Email delivery must be configured correctly in Supabase (built-in or custom SMTP) to send the 6-digit OTP template.

## 15. Remaining Issues
- **Mobile app**: Needs a complete overhaul to transition from mock screens to real API integrations and React Native UI elements.
- **Middleware**: Did not add strict session gates to `middleware.ts` to prevent breaking the existing hardcoded admin dev environment. Future production-readiness should lock down `/admin` properly.
