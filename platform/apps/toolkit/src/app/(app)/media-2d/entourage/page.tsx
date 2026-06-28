import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Entourage Library · Design Toolkit",
  description:
    "Scalable black silhouettes — people, trees, cars, furniture, plan symbols — to compose at true scale and export as transparent SVG/PNG. Client-side, no account."
};

export default function EntouragePage() {
  return (
    <EmbeddedTool
      title="Entourage Library"
      subtitle="Silhouettes for Drawings & Collage"
      blurb="A palette of clean black silhouettes — people (standing, walking, sitting, child, groups), trees in plan and elevation, cars, bikes, and plan furniture symbols. Click to drop them into a composition at true scale against a 1.7 m reference figure, then drag, resize and flip to build up entourage for an elevation, section or collage."
      src="/tools/entourage/index.html"
      backHref="/media-2d"
      backLabel="2D Tooling"
      note="Runs entirely in your browser — nothing is uploaded. Export the whole composition as a transparent SVG or PNG to layer straight over a drawing, or download a single silhouette as SVG."
    />
  );
}
