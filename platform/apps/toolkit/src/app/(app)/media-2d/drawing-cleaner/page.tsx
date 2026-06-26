import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Drawing Cleaner · Design Toolkit",
  description:
    "Clean up a scanned or photographed pen/pencil drawing — levels, gamma, sharpen, adaptive lighting — in the browser."
};

export default function DrawingCleanerPage() {
  return (
    <EmbeddedTool
      title="Drawing Cleaner"
      subtitle="Scan & Sketch Cleanup"
      blurb="Drop a photo or scan of a pen/pencil drawing and get clean black-on-white. Auto levels with a live histogram, gamma, sharpening and adaptive lighting, a before/after split, and a full-resolution PNG export."
      src="/tools/drawing-cleaner/index.html"
      backHref="/media-2d"
      backLabel="2D Tooling"
      note="Runs entirely in your browser — the image is never uploaded. Ported from John's Drawing-Image-Cleaner."
    />
  );
}
