import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Diagram Studio · Design Toolkit",
  description:
    "A quick concept-diagram kit — program bubbles, zones, adjacency/flow links and bold parti arrows — exported as SVG/PNG. Client-side, no account."
};

export default function DiagramStudioPage() {
  return (
    <EmbeddedTool
      title="Diagram Studio"
      subtitle="Parti · Bubble · Adjacency · Flow"
      blurb="The concept-diagram kit. Drop program bubbles sized by area and labelled zones, connect them with weak or strong adjacency lines and directional flow arrows, and lay in bold parti arrows for the big moves. Drag anything and the links follow — a fast way to think through program, circulation and the parti."
      src="/tools/diagram-studio/index.html"
      backHref="/media-2d"
      backLabel="2D Tooling"
      note="Runs entirely in your browser — nothing is uploaded. Export a clean vector SVG (editable in Illustrator) or a PNG for the board."
    />
  );
}
