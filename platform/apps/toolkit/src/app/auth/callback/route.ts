import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";

// Magic-link landing: exchange the code for a session, then go to the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only honor same-origin relative paths — never redirect off-origin (open-redirect guard).
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch {
      // A thrown exchange (network failure, expired/garbage code, stale PKCE
      // state — e.g. a campus mail scanner pre-clicked the link) falls through
      // to the graceful login bounce below instead of a raw 500.
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
