import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Proportioning Overlays · Design Toolkit",
  description:
    "Overlay the golden section, root rectangles, Modulor, Fibonacci and regulating lines on an image or frame, with a live ratio readout. Client-side, no account."
};

export default function ProportionPage() {
  return (
    <EmbeddedTool
      title="Proportioning Overlays"
      subtitle="Golden Section, Root Rectangles, Modulor"
      blurb="Test a facade or plan against the classical proportioning systems. Overlay the golden section and spiral, √2/√3/√5 root rectangles, the rule of thirds, a Fibonacci grid, Le Corbusier's Modulor bands, a tatami/ken grid, regulating lines and symmetry axes — on your own image or a draggable, ratio-locked analysis frame — with the ratio read out live."
      src="/tools/proportion/index.html"
      backHref="/media-2d"
      backLabel="2D Tooling"
      note="Runs entirely in your browser — nothing is uploaded. Export the analysis as PNG (image + overlays) or SVG (vector regulating lines)."
    />
  );
}
