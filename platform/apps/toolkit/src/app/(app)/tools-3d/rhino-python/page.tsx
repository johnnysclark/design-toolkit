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
      blurb="A gallery of small RhinoPython / GhPython snippets for everyday studio moves — panelise a surface, attractor fields, contour, Make2D batch, layer setup, baking and more. Each card has a one-line explanation, a context tag, and a copy button. Search, filter, copy — or open “Edit with AI” to tweak a snippet in a chat and copy the result. There's a full-screen button up top."
      src="/tools/rhino-python/index.html"
      backHref="/tools-3d"
      backLabel="3D Tooling"
      note="Snippets run in Rhino's EditPythonScript editor (RhinoPython) or a GhPython component (set the inputs/outputs noted on each card). Browsing and copying are free; “Edit with AI” (powered by Claude) needs you to be signed in. Pair them with Coach for the deeper why."
    />
  );
}
