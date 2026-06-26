import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Scan Cleaner · Design Toolkit",
  description:
    "Full document-scan cleanup — straighten, crop, levels, curves, denoise, resize — in the browser."
};

export default function ScanCleanerPage() {
  return (
    <EmbeddedTool
      title="Scan Cleaner"
      subtitle="Document Scan Cleanup"
      blurb="The heavier sibling of Drawing Cleaner: straighten and crop, levels with a curves editor, denoise, punch-lines / fade-background, and resize — for turning a full document scan into a clean, sharable image."
      src="/tools/scan-cleaner/index.html"
      backHref="/media-2d"
      backLabel="2D Tooling"
      note="Runs entirely in your browser — the image is never uploaded. Ported from John's scan-cleaner."
    />
  );
}
