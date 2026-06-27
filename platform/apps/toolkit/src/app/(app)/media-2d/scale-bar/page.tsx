import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Scale Bar & North · Design Toolkit",
  description:
    "Make a correct graphic scale bar and a north arrow for a drawing sheet — metric ratio or imperial architect's scale, set length + divisions, export SVG (true print size) or PNG. Client-side."
};

export default function ScaleBarPage() {
  return (
    <EmbeddedTool
      title="Scale Bar & North"
      subtitle="Graphic scale bar + north arrow"
      blurb="Build a correct graphic scale bar and a north arrow for your sheet. Pick a scale — metric ratio (1:50, 1:100…) or an imperial architect's scale (¼ in = 1 ft, 1 in = 20 ft…) — set the length, divisions and a finely-divided end, choose a north-arrow style and rotation, then export. The SVG is sized in real millimetres, so placed at 100% on a layout it reads true; PNG too."
      src="/tools/scale-bar/index.html"
      backHref="/media-2d"
      backLabel="2D Tooling"
      note="Runs entirely in your browser — nothing is uploaded. The bar is drawn at the real paper size for the chosen scale; drop the SVG into your layout at 1:1."
    />
  );
}
