# 12-MOBILE-APP.md

## 1. Scope

Customer-facing only (no admin functionality in the mobile app in V1). Android target for V1 per requirements; built with Expo/React Native so iOS can be added later with minimal additional work (see `25-FUTURE-ROADMAP.md`).

## 2. Stack

- Expo (managed workflow preferred for V1 velocity; eject to bare workflow only if a required native module isn't supported by Expo's managed SDK — evaluate FCM and Razorpay RN SDK compatibility with Expo managed workflow first via `expo-notifications` + Razorpay's React Native SDK or a WebView-based checkout fallback if a native module conflict arises).
- TypeScript throughout.
- Navigation: React Navigation (stack + bottom tabs).
- State/data-fetching: a single HTTP client wrapper (e.g., a thin fetch/axios wrapper) + a lightweight server-state library (e.g., TanStack Query) for caching/loading/error states consistently, mirroring the web app's approach conceptually (not literally shared code unless a shared package is introduced later).
- Styling: a consistent approach using the shared design tokens from `07-UI-UX-SPECIFICATION.md` (e.g., via `nativewind` if the team wants Tailwind-like syntax in RN, or plain `StyleSheet` referencing token constants — decided at implementation start and documented in `21-CODING-CONVENTIONS.md` once chosen).

## 3. Screens (mirrors web IA — see `07-UI-UX-SPECIFICATION.md` §3)

Bottom tab navigation: Home, Categories/Browse, Cart, Orders, Profile. Product detail, checkout, order tracking, gift hampers, bulk-enquiry form, and address management are stack screens reachable from these tabs.

## 4. Auth

- Phone number entry → OTP screen (Supabase Auth SDK for React Native) → on success, `POST /auth/sync-profile`, then merge any locally-stored guest cart via `POST /cart/merge`.
- Tokens stored via `expo-secure-store`, never `AsyncStorage` for the raw JWT/refresh token.

## 5. Push Notifications

- `expo-notifications` (backed by FCM under the hood on Android) requests permission after first meaningful action (not immediately on app open) to maximize opt-in rate — ask at a contextual moment (e.g., right after placing the first order: "Get notified when your order is on the way").
- On token (re)generation, call `POST /notifications/device-token`.
- Deep-linking: tapping a notification about an order navigates directly to that order's tracking screen (`data.order_id` payload field, per `10-NOTIFICATIONS.md`).

## 6. Payments

- Razorpay's React Native SDK (or Razorpay Standard Checkout via an in-app WebView if the native SDK proves incompatible with the current Expo SDK version — decided and documented at implementation time) opened with the `razorpay_order_id` returned from `POST /checkout`; success/failure handled per `09-PAYMENTS.md`.

## 7. Offline / Poor Connectivity Handling

- Given rural/semi-urban connectivity variability in Barabanki, the app must handle slow/intermittent networks gracefully: request timeouts with retry affordance ("Something went wrong — Retry" rather than an infinite spinner), cached last-seen catalogue data shown with a "may be outdated" indicator when a refetch fails, and clear offline detection (e.g., a banner) rather than silent failures.

## 8. Build & Distribution

- EAS Build for generating Android APK/AAB. Development builds for internal testing (Expo Go can be used only if no custom native modules are required; if Razorpay's native SDK is used, a custom dev client via EAS is required instead of Expo Go).
- Production builds signed via EAS-managed credentials (or the shop's own keystore, backed up securely — losing the keystore blocks future updates to the same Play Store listing).
- Distribution: Google Play Store (production), and/or direct APK sharing for early testing before Play Store listing is ready. Full detail in `16-DEPLOYMENT.md` §Mobile.

## 9. Performance

- Image lists use `FlatList`/`FlashList` with proper `keyExtractor`/windowing, not `ScrollView.map` for potentially long product lists.
- Product images requested at an appropriately sized resolution (not full-resolution originals) — either via Supabase Storage image transformation (if available on the plan) or pre-generated thumbnail variants at upload time in the admin panel.

## 10. Testing

See `15-TESTING-STRATEGY.md` §Mobile Tests — component tests via React Native Testing Library for critical screens (cart, checkout form validation), plus manual device testing on at least one mid-range and one low-end Android device given the target user base.

## 11. Versioning & Updates

- App version shown in Profile screen for support purposes. Expo's OTA updates (`expo-updates`) may be used for JS-only fixes post-launch, with native changes (new permissions, SDK bumps) requiring a full store release — documented policy to avoid confusion about what an OTA update can and cannot fix.
