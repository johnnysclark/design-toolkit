import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Keeps the Supabase auth session fresh on every navigation.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
