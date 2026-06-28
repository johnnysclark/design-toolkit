import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Figure-Ground / Nolli · Design Toolkit",
  description:
    "Trace a site plan into a clean figure-ground (or Nolli poché) diagram and export it without the reference, as vector SVG or PNG. Client-side, no account."
};

export default function FigureGroundPage() {
  return (
    <EmbeddedTool
      title="Figure-Ground / Nolli"
      subtitle="Urban Mass & Void"
      blurb="Make the classic urban-analysis diagram. Import a site plan as a faint guide, then paint the built mass with brush, rectangle and polygon tools. Read it as a figure-ground (black mass on white) or flip to a Nolli poché where public space reads as the figure — the quickest way to study a city's mass and void."
      src="/tools/figure-ground/index.html"
      backHref="/media-2d"
      backLabel="2D Tooling"
      note="Runs entirely in your browser — nothing is uploaded. The reference image is only a tracing guide and is never included in the export; download the finished diagram as vector SVG or PNG."
    />
  );
}
