import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Contour Slicer · Design Toolkit",
  description:
    "Slice a terrain or form into stacked horizontal contour layers for a chipboard topographic model — numbered, nested SVG cut sheet plus a flat contour map. Client-side, no account."
};

export default function ContourSlicerPage() {
  return (
    <EmbeddedTool
      title="Contour Slicer"
      subtitle="Stacked Topo Model"
      blurb="Build a topographic model from stacked chipboard or cardboard. Choose a parametric form (or drop in your own STL/OBJ/PLY, raycast into a terrain) and your sheet thickness, and it traces every level with marching squares and stacks them into a stepped 3D preview of the model you'll cut."
      src="/tools/contour-slicer/index.html"
      backHref="/tools-3d"
      backLabel="3D Tooling"
      note="Runs entirely in your browser — nothing is uploaded. Export a numbered, nested SVG cut sheet (each layer shows the next one scored in blue so stacking is foolproof) and a flat contour map — both sized in real millimetres. Pairs with the Topography Builder."
    />
  );
}
