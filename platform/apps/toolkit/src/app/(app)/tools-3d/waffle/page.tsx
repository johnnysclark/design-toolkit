import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Waffle Structure · Design Toolkit",
  description:
    "Turn a surface or your own model into an interlocking egg-crate of ribs, notched to slot together, and export a true-millimetre nested SVG cut sheet for the laser. Client-side, no account."
};

export default function WafflePage() {
  return (
    <EmbeddedTool
      title="Waffle Structure"
      subtitle="Interlocking Ribs"
      blurb="Make the classic egg-crate model without the Grasshopper headache. Pick a parametric form (dome, vault, saddle, waves, cone, peak) or drop in your own STL/OBJ/PLY — it's raycast top-down into a heightfield and waffled. Set the rib counts each way, your material thickness and kerf, and the ribs are notched half-depth where they cross so they slot together into a rigid lattice."
      src="/tools/waffle/index.html"
      backHref="/tools-3d"
      backLabel="3D Tooling"
      note="Runs entirely in your browser — nothing is uploaded. Export a nested SVG cut sheet sized in real millimetres (hairline = cut), with parts labelled B# / A# for assembly; import it into Illustrator or your laser software at 100%. Slot width = thickness − kerf for a snug press-fit."
    />
  );
}
