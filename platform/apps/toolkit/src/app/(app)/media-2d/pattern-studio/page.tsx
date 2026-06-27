import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Pattern Studio · Design Toolkit",
  description:
    "A parametric screen / facade / tiling generator — an attractor-driven grid of cells you can shape and tune, then export as SVG, PNG, or DXF (real millimetre coordinates) for CAD and laser cutting. Client-side."
};

export default function PatternStudioPage() {
  return (
    <EmbeddedTool
      title="Pattern Studio"
      subtitle="Parametric screens & tilings"
      blurb="Generate a parametric screen, facade, or tiling: a grid of cells whose size and rotation are driven by an attractor — a single point you drag, or a multi-point path you draw on the canvas. Pick the cell shape (square, circle, diamond, triangle, louver, cross) and the grid (square / brick / hex), tune the field, then export — SVG and PNG for drawings, or DXF with real millimetre coordinates straight into Rhino / AutoCAD or a laser cutter."
      src="/tools/pattern-studio/index.html"
      backHref="/media-2d"
      backLabel="2D Tooling"
      note="Runs entirely in your browser — nothing is uploaded. The DXF uses millimetre coordinates from the cell-size control; switch on “outline only” for clean cut lines."
    />
  );
}
