// Site Design = Gable Studio, the full-loop massing tool (shape → live proxies →
// testable rules → Rhino 8 / Grasshopper export → re-import). It's a zero-build
// static app (vendored three.js, an importmap, and the parity-tested core.js),
// served verbatim from public/tools/gable-studio/ and embedded here in an iframe.
// We embed rather than rewrite so web/core.js stays byte-identical to its
// python/gable_core.py port — the parity invariant holds by construction.
//
// The studio is a wide three-panel layout, so this page breaks out of the app
// shell's centered max-w-5xl container and fills the whole content area to the
// right of the sidebar (the sidebar is a fixed `w-64`; `left-64` matches it).

const STUDIO_URL = "/tools/gable-studio/web/index.html";

export default function Page() {
  return (
    <div className="fixed inset-y-0 left-64 right-0 flex flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-6 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">Site Design</h1>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-800">
              live
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Gable Studio — form-finding by site forces. Metrics are transparent
            teaching <em>proxies</em>, not validated simulation.
          </p>
        </div>
        <a
          href={STUDIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
        >
          Open full screen ↗
        </a>
      </header>

      <iframe
        src={STUDIO_URL}
        title="Gable Studio — Site Design"
        className="min-h-0 flex-1 border-0"
        allow="fullscreen"
      />
    </div>
  );
}
