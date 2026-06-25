import { createClient } from "@/lib/supabase/server";
import AuthGate from "@/components/AuthGate";
import LibrarianTool from "./librarian-tool";

// The Librarian spends the Anthropic key, so it gates to signed-in members.
// (The API route at /api/librarian also returns 401 for anon — that's the real
// guard; this just gives a clean UI instead of a tool that would 401 on submit.)
export default async function LibrarianPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return <AuthGate tool="Librarian" />;

  return <LibrarianTool />;
}
