import Link from "next/link";
import HalftoneRiso from "./HalftoneRiso";

export const metadata = {
  title: "Halftone & Riso · Design Toolkit",
  description:
    "Turn any image into a halftone, duotone or full Risograph-style spot-colour separation — adjustable dot shape, ruling and screen angle, real Riso inks, mis-registration and grain. Export a finished PNG, per-ink plate masters, or vector SVG. Entirely in the browser."
};

// Native in-app tool (no iframe), styled to read as part of the site like the
// Drawing Cleaner. Client-only: nothing is uploaded, no API key, no sign-in, so
// the page stays public.
export default function HalftoneRisoPage() {
  return (
    <div className="space-y-4">
      <Link href="/media-2d" className="text-sm font-semibold text-neutral-900 hover:underline">
        ← 2D Tooling
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="display-font text-3xl uppercase tracking-tight text-neutral-900">Halftone &amp; Riso</h1>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-800">
            live
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-neutral-900">
          Drop in a photo, drawing or render and screen it into a halftone, two-colour duotone or full Risograph-style
          separation. Choose the dot shape and ruling, then craft each plate — its Riso ink, screen angle and a touch of
          mis-registration — over a paper colour with optional grain. Export the finished composite as a full-resolution PNG, the
          per-ink plates as black-on-transparent masters for an actual Risograph, or the whole thing as a vector SVG of real dots.
          Runs entirely in your browser — the image is never uploaded.
        </p>
      </div>

      <HalftoneRiso />
    </div>
  );
}
