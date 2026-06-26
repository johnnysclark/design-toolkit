import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RapStudio from "./RapStudio";

export const metadata: Metadata = {
  title: "RAP Studio — author architecture non-visually",
  description:
    "A runnable slice of the Radical Accessibility Project: one canonical state.json, many renderers. Author a plan by command, form, or natural language; read it back as a 3D model, a tactile plan, text, and Braille; export PIAF and STL — the on-ramp to driving real Rhino."
};

// PUBLIC page — the deterministic core (console, forms, renderers, exports) runs
// for anyone, so the idea is demoable without an account. Only the AI assistant
// gates to sign-in; the real guard is the 401 in /api/rap/agent.
export default async function RapStudioPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link href="/rap" className="text-xs font-semibold uppercase tracking-wide text-neutral-900 underline-offset-2 hover:underline">
          ← Back to RAP
        </Link>
        <h1 className="display-font text-3xl uppercase leading-none tracking-tight text-neutral-900 sm:text-4xl">RAP Studio</h1>
        <p className="max-w-3xl text-[15px] leading-relaxed text-neutral-900">
          A runnable slice of the workflow. There is <b>one canonical state</b> — the same <code className="font-mono">state.json</code> the desktop
          tool uses — and every panel is a <b>renderer</b> of it. Author by typed command, by form, or in plain language; read the model
          back as a 3D view, a tactile plan, structured text, and Braille; export a PIAF swell-paper image and a 3D-print STL. Because the
          state matches the real schema, what you make here round-trips to Rhino through the desktop Watcher.
        </p>
      </header>

      <RapStudio signedIn={!!user} />

      <footer className="rounded-lg border border-neutral-300 p-4 text-sm leading-relaxed text-neutral-900">
        <b>Driving real Rhino — what&rsquo;s next.</b> The <code className="font-mono">state.json</code> you download here is the interchange.
        Drop it into a RAP working folder and the existing Watcher (TCP&nbsp;1998) rebuilds the model in desktop Rhino — a free, working drive
        with no new infrastructure. A small local companion bridge would make it live (type here, Rhino moves). See the options write-up for the
        full menu.
      </footer>
    </div>
  );
}
