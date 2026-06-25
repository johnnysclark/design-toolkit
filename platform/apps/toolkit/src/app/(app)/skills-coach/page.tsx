import { createClient } from "@/lib/supabase/server";
import AuthGate from "@/components/AuthGate";
import type { Discipline } from "@/lib/skills-coach/concepts";
import type { CoachMeta } from "@/lib/anthropic/skills-coach-prompts";
import SkillsCoachChat from "./skills-coach-chat";
import type { ChatMessage } from "./MessageBubble";

export const dynamic = "force-dynamic";

// Skills Coach streams the Anthropic key, so it gates to signed-in members.
// (The /api/skills-coach route also 401s for anon — that's the real guard;
// this just shows a clean sign-in screen instead of a tool that 401s on send.)
export default async function SkillsCoachPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return <AuthGate tool="Skills Coach" />;

  // Restore the most recent conversation so a reload keeps the thread.
  const { data: convo } = await supabase
    .from("coach_conversations")
    .select("id, discipline")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialMessages: ChatMessage[] = [];
  if (convo?.id) {
    const { data: rows } = await supabase
      .from("coach_messages")
      .select("id, role, content, meta, attachment_path")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true });

    initialMessages = (rows ?? [])
      .filter((r) => r.role === "user" || r.role === "assistant")
      .map((r) => {
        const name = r.attachment_path ? r.attachment_path.split("/").pop() ?? "attachment" : null;
        const ext = name?.split(".").pop()?.toLowerCase() ?? "";
        return {
          id: r.id,
          role: r.role as "user" | "assistant",
          content: r.content ?? "",
          meta: (r.meta as CoachMeta | null) ?? undefined,
          attachment: r.attachment_path
            ? { name: name!, kind: ext === "pdf" ? ("pdf" as const) : ("image" as const) }
            : null
        };
      });
  }

  return (
    <SkillsCoachChat
      initialConversationId={convo?.id ?? null}
      initialDiscipline={(convo?.discipline as Discipline) ?? "general"}
      initialMessages={initialMessages}
    />
  );
}
