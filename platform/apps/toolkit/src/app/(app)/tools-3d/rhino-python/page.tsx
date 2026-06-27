import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Rhino / Grasshopper Python · Design Toolkit",
  description:
    "A searchable gallery of small, copy-paste RhinoPython / GhPython snippets for studio moves — panelise, attractor fields, contour, Make2D batch, layers and baking, each with a one-line why."
};

export default function RhinoPythonPage() {
  return (
    <EmbeddedTool
      title="Rhino / Grasshopper Python"
      subtitle="Copy-paste Snippet Gallery"
      blurb="A gallery of small RhinoPython / GhPython snippets for everyday studio moves — panelise a surface, attractor fields, contour, Make2D batch, layer setup, baking and more. Each card has a one-line explanation, a context tag, and a copy button. Search or filter, copy, paste, run."
      src="/tools/rhino-python/index.html"
      backHref="/tools-3d"
      backLabel="3D Tooling"
      note="Snippets run in Rhino's EditPythonScript editor (RhinoPython) or a GhPython component (set the inputs/outputs noted on each card). Pair them with Coach for the deeper why."
    />
  );
}
