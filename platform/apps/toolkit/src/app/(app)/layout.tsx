import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

// The Toolkit shell is PUBLIC — anyone can browse. Tools that spend the API key
// or need a user session gate themselves (see AuthGate + the nav's `requiresAuth`).
// Do not reinstate a blanket redirect here.
export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return <AppShell email={user?.email ?? null}>{children}</AppShell>;
}
