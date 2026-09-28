# Changelog

All notable changes to the Saraswati Sweets platform will be documented in this file.

## [Unreleased] - 2026-09-28

### Added
- **Codebase Audit**: Conducted a thorough codebase optimization and safety cleanup audit (`docs/CODEBASE-AUDIT.md`).
- **Auth Guard**: Implemented robust route protections for profile and checkout pages utilizing Supabase authentication.

### Changed
- **Authentication**: Migrated storefront customer authentication completely to Supabase Email + Password, removing redundant or fake token mechanisms.
- **Cart Context**: Stabilized React `useEffect` hooks in `apps/web/lib/cart-context.tsx` to fix critical cascading re-renders and aligned it with Supabase token acquisition.
- **Dependencies**: Removed unused backend security libraries (`python-jose`, `cryptography`) in favor of the actively utilized `PyJWT` implementation.

### Fixed
- **Typecheck Errors**: Repaired stale `getAuthToken` references remaining in the `checkout/page.tsx` workflow, allowing `tsc` to cleanly compile.
- **Test Suite**: Rectified broken Python tests by correctly provisioning missing `asyncpg` bindings; backend test suite now passes perfectly (70/70 items).
- **UI Degradation**: Fixed UTF-8 character encoding corruption across the React components (e.g., mojibake on Rupees and Bullet Points).
