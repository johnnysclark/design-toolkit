import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Model Viewer · Design Toolkit",
  description:
    "Drop a GLB / GLTF / OBJ / STL and get a clean, shareable web viewer — orbit, turntable, background, lighting, screenshot and an embed snippet. Client-side, no account."
};

export default function ModelViewerPage() {
  return (
    <EmbeddedTool
      title="Model Viewer"
      subtitle="Three.js Web Viewer"
      blurb="Drop a GLB, GLTF, OBJ, or STL and get a clean web viewer for the portfolio site — orbit and frame it, set a turntable, pick a background and lighting, save a screenshot, and grab an embed snippet for your own pages."
      src="/tools/model-viewer/index.html"
      backHref="/tools-3d"
      backLabel="3D Tooling"
      note="Runs entirely in your browser — your model is never uploaded. The embed snippet points an iframe back at this viewer with your settings baked into the URL; host the model file at a public URL (Vercel, GitHub Pages, Supabase storage) and paste that URL in to share it."
    />
  );
}
