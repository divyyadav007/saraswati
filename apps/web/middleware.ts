/**
 * Next.js Middleware — Auth/role gate for /admin/** routes.
 * This is a UX convenience layer only — the real security boundary
 * is the FastAPI backend's RBAC enforcement.
 * Per docs/13-WEB-APP.md §8 and docs/08-SECURITY.md §3.
 *
 * Phase 0: Passes all requests through (no Supabase session wired yet).
 * Phase 1: Will add Supabase session check + role verification.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // TODO (Phase 1): Add Supabase session verification here.
  // For Phase 0 scaffolding, all requests pass through.
  // Admin routes will redirect to /admin/login if no valid session.

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    // Phase 0: placeholder — will add real session check in Phase 1
    // For now, allow all traffic so the app builds/starts correctly
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
