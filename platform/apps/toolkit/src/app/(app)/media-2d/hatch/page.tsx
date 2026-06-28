import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Hatch & Poché · Design Toolkit",
  description:
    "A library of real architectural hatch and poché patterns as scalable SVG fills — true to your drawing scale, with SVG/PNG export. Client-side, no account."
};

export default function HatchPage() {
  return (
    <EmbeddedTool
      title="Hatch & Poché"
      subtitle="Architectural Hatch Fills"
      blurb="The standard architectural hatches — concrete, brick, CMU, stone/rubble, earth, gravel, sand, wood grain & end-grain, batt and rigid insulation, steel, plus plain 45°/crosshatch and solid poché — as real SVG patterns. Set the repeat true to your drawing scale, pick a pen weight and rotation, and read the density you'll actually get on the sheet."
      src="/tools/hatch/index.html"
      backHref="/media-2d"
      backLabel="2D Tooling"
      note="Runs entirely in your browser — nothing is uploaded. Export a filled sample as SVG sized in real millimetres (imports true-scale into Illustrator/CAD) or PNG, or copy the SVG <pattern> definition to reuse in your own drawings."
    />
  );
}
