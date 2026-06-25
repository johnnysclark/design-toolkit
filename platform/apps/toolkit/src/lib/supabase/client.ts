import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Create it lazily inside event handlers /
// effects (not at module scope) so it never runs during prerender.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
