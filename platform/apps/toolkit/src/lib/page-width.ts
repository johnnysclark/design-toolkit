// One source of truth for how wide a tool page may grow.
//
// Every page is rendered inside AppShell's centered content wrapper. Historically
// that wrapper was a hard `max-w-5xl` (1024px) for ALL routes, so the interactive
// tools (the MapLibre map, the 3D/CAD iframes, the WebGL viewports, the gallery
// walls) were strangled at 1024px no matter how wide the monitor — while the only
// thing the cap protected (reading prose, chat) is mostly already self-limited by
// its own `max-w-2xl/3xl` intros.
//
// AppShell now resolves the wrapper width from the active route via `widthClassFor`.
// Reading/chat tools stay at a comfortable measure; the genuine working surfaces
// fill the space left of the sidebar. The table uses LONGEST-PREFIX matching so a
// leaf tool (e.g. /tools-3d/obliquify) can override its hub (/tools-3d), which the
// hub keeps narrow.

export type WidthTier = "reading" | "default" | "wide" | "full";

// reading  = max-w-3xl  (768px)  — pure long-form text
// default  = max-w-5xl  (1024px) — the comfortable baseline (text + small grids + chat)
// wide     = max-w-7xl  (1280px) — dense dashboards that want more room but not all of it
// full     = no cap              — interactive working surfaces fill the available width
//                                  (the px padding on <main> still keeps them off the edges)
const TIER_CLASS: Record<WidthTier, string> = {
  reading: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-7xl",
  full: "max-w-none"
};

// Routes that should grow past the 1024px default. Anything not listed = "default".
// (Hubs are intentionally absent so they stay narrow while their leaf tools fill.)
const ROUTE_TIERS: Array<[string, WidthTier]> = [
  ["/site-analysis", "full"], // Surveyor — MapLibre map + data dashboard
  ["/site-design", "full"], // Eco-Architect — embedded 3-panel 3D studio
  ["/librarian", "full"], // Librarian — visual reference gallery
  ["/pinup", "full"], // Archivist — studio pinup / crit wall
  ["/media-2d/drawing-cleaner", "full"], // fixed rail + fluid fit-to-container preview
  ["/media-2d/vantage", "full"], // three.js camera demo (100vh iframe)
  ["/tools-3d/obliquify", "full"], // r3f oblique/paraline viewer
  ["/tools-3d/model-viewer", "full"], // embedded WebGL model viewer
  ["/tools-3d/rhino-python", "full"], // embedded Rhino/GhPython gallery
  ["/rap/studio", "full"] // RAP — orthographic CAD viewport + panels
];

/** Tailwind max-width class for the AppShell content wrapper on a given route. */
export function widthClassFor(pathname: string): string {
  const match = ROUTE_TIERS.filter(
    ([p]) => pathname === p || pathname.startsWith(p + "/")
  ).sort((a, b) => b[0].length - a[0].length)[0];
  return TIER_CLASS[match?.[1] ?? "default"];
}
