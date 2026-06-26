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
          <b>Design a building without needing to see it.</b> The Radical Accessibility Project (RAP) is a way for blind and
          low-vision students to author architecture alongside sighted classmates — and this page is a hands-on demo of it,
          running right in your browser. No account or install needed to try it.
        </p>
        <p className="max-w-3xl text-[15px] leading-relaxed text-neutral-900">
          You lay out a plan by typing plain-English requests, short commands, or filling in form fields. The studio keeps your
          whole design as a single text file and shows it back to you several ways at once — a 3D model, a touch-readable plan, a
          written description, and Braille — plus downloads for a swell-paper tactile print and a 3D print. The 3D view is only an
          aid for sighted testing; nothing here needs sight to use. When you&rsquo;re ready, the same design can be sent to
          <b> Rhino</b>, the 3D CAD software architects design in.
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
