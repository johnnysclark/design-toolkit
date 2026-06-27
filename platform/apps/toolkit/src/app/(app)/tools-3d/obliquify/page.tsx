import Link from "next/link";
import Obliquify from "./Obliquify";

export const metadata = {
  title: "Obliquify · Design Toolkit",
  description:
    "Import a 3D model (STL/OBJ/PLY/3DM) and view it under a true oblique (paraline) projection — cabinet/cavalier/planometric presets, angle, depth ratio and direction — in the browser."
};

// Native in-app 3D tool (no iframe), styled to read as part of the site like RAP
// Studio. Client-only (three.js): nothing is uploaded, no API key, no sign-in, so
// the page stays public.
export default function ObliquifyPage() {
  return (
    <div className="space-y-4">
      <Link href="/tools-3d" className="text-sm font-semibold text-neutral-900 hover:underline">
        ← 3D Tooling
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="display-font text-3xl uppercase tracking-tight text-neutral-900">Obliquify</h1>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-800">
            live
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-neutral-900">
          Import a 3D model and see it under a true <b>oblique (paraline) projection</b> — locked to a principal face (Front,
          Plan or Side) so that face stays true-shape while the depth axis recedes at a chosen angle and foreshortening
          (cabinet = ½, cavalier = 1). Pick a preset or set the angle, depth and direction yourself; switch to <b>3·4 Axon</b>{" "}
          to free-orbit a true axonometric for comparison; then export a PNG. A demo massing is loaded by default so you can
          test it straight away. STL, OBJ, PLY and Rhino <b>3DM</b> — parsed entirely in your browser, never uploaded.
        </p>
      </div>

      <Obliquify />
    </div>
  );
}
