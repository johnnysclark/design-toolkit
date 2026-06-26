import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Obliquify · Design Toolkit",
  description:
    "Turn a flat drawing into an oblique (paraline) projection — adjustable angle, depth, shading — in the browser."
};

export default function ObliquifyPage() {
  return (
    <EmbeddedTool
      title="Obliquify"
      subtitle="Oblique Projection"
      blurb="Turn a flat drawing — elevation, plan, or photo — into an oblique (paraline) projection. Extrude it into depth at an adjustable angle and direction, pick cabinet / cavalier presets, shade the sides, outline the edges, and export a transparent PNG."
      src="/tools/obliquify/index.html"
      backHref="/tools-3d"
      backLabel="3D Tooling"
      note="Runs entirely in your browser — the image is never uploaded. This is a fresh rebuild of John's “obliquify” — the original source wasn't found in the public repos. Point us at the original and we'll match its behaviour."
    />
  );
}
