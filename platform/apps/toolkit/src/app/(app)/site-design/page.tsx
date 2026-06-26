// Eco-Architect = Gable Studio, the full-loop massing tool (shape → live proxies →
// testable rules → Rhino 8 / Grasshopper export → re-import). It's a zero-build
// static app (vendored three.js, an importmap, and the parity-tested core.js),
// served verbatim from public/tools/gable-studio/ and embedded here in an iframe.
// Rendered in the normal content flow so it looks and behaves like the other tool
// pages (consistent header + edges, reflows with the sidebar). "Open full screen"
// gives the studio its full three-panel width.

const STUDIO_URL = "/tools/gable-studio/web/index.html";

export default function Page() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Eco-Architect{" "}
              <span className="font-sans text-lg font-normal normal-case text-neutral-900">
                — Design to Site Forces
              </span>
            </h1>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-800">
              live
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-neutral-900">
            Form-finding by site forces (sun, wind, terrain). Metrics are transparent
            teaching <em>proxies</em>, not validated simulation.
          </p>
        </div>
        <a
          href={STUDIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-900 transition hover:border-neutral-400 hover:bg-neutral-50"
        >
          Open full screen ↗
        </a>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <iframe
          src={STUDIO_URL}
          title="Eco-Architect"
          className="block h-[80vh] w-full border-0"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
