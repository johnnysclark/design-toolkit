import Link from "next/link";
import Vectorize from "./Vectorize";

export const metadata = {
  title: "Vectorize · Design Toolkit",
  description:
    "Trace a scanned sketch or a Rhino Make2D dump into clean, editable vectors — centreline strokes or filled outlines, threshold + simplify + smooth, with an SVG / DXF export. Runs entirely in your browser."
};

// Native in-app tool (no iframe). Client-only: the image never leaves the browser
// — no upload, no API key, no sign-in — so the page is public. Styled in the
// toolkit's language to read as part of the site, like Drawing Cleaner.
export default function VectorizePage() {
  return (
    <div className="space-y-4">
      <Link href="/media-2d" className="text-sm font-semibold text-neutral-900 hover:underline">
        ← 2D Tooling
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="display-font text-3xl uppercase tracking-tight text-neutral-900">Vectorize</h1>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-800">
            live
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-neutral-900">
          Turn a raster into crisp vector line work. <strong>Centreline</strong> traces the middle of every
          stroke — so a pen sketch or a Rhino <em>Make2D</em> dump becomes single editable paths, not hollow
          outlines. <strong>Outline</strong> traces filled shapes (logos, poché, silhouettes); <strong>Colour</strong>
          posterises a photo into flat vector layers. Threshold, simplify and smooth to taste, then export{" "}
          <strong>SVG</strong> for Illustrator or <strong>DXF</strong> (real millimetres) for CAD and the laser cutter.
          Everything runs in your browser — the image is never uploaded.
        </p>
      </div>

      <Vectorize />
    </div>
  );
}
