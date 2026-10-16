import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only refresh session where auth matters. Skips `/` marketing page
  // (uses local getClaims, no refresh needed) to save 1 Supabase roundtrip.
  matcher: [
    "/documents/:path*",
    "/login",
    "/signup",
    "/logout",
  ],
};
