import Link from "next/link";
import DrawingCleaner from "./DrawingCleaner";

export const metadata = {
  title: "Drawing Cleaner · Design Toolkit",
  description:
    "Turn a phone photo or scan of a pen/pencil drawing into clean black-on-white — auto levels, gamma, sharpen, adaptive lighting, straighten/crop, curves, denoise and resize — entirely in the browser."
};

// Native in-app tool (no iframe) — the merged Drawing/Scan Cleaner, styled to read
// as part of the site like RAP Studio. Client-only: nothing is uploaded, no API
// key, no sign-in, so the page stays public.
export default function DrawingCleanerPage() {
  return (
    <div className="space-y-4">
      <Link href="/media-2d" className="text-sm font-semibold text-neutral-900 hover:underline">
        ← 2D Tooling
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="display-font text-3xl uppercase tracking-tight text-neutral-900">Drawing Cleaner</h1>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-800">
            live
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-neutral-900">
          Drop a photo or scan of a pen/pencil drawing and get clean black-on-white. Auto levels with a live histogram, gamma,
          sharpening, denoise and adaptive lighting; straighten &amp; crop, a curves editor with presets, a before/after split,
          and a full-resolution PNG export. Runs entirely in your browser — the image is never uploaded.
        </p>
      </div>

      <DrawingCleaner />
    </div>
  );
}
