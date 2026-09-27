/**
 * Supabase Browser Client (for Auth SDK calls only)
 * Used for: OTP send/verify, session token retrieval, session refresh.
 * Per docs/04-ARCHITECTURE.md §4 — frontend uses Supabase ONLY for Auth SDK.
 * Business data always goes through the FastAPI backend.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
