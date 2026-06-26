import { createClient } from "@/lib/supabase/server";
import AuthGate from "@/components/AuthGate";
import CriticTool from "./critic-tool";

// The Critic spends the Anthropic key, so it gates to signed-in members.
// (The API route at /api/design-critic also returns 401 for anon — that's the
// real guard; this just gives a clean UI instead of a tool that 401s on submit.)
export default async function DesignCriticPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return <AuthGate tool="Critic" />;

  return <CriticTool />;
}
