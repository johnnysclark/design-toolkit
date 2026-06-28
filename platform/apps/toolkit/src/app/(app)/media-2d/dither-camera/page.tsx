import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Dither Camera · Design Toolkit",
  description:
    "Point your phone or webcam at anything and turn the live feed into a dithered / halftone image — 10 algorithms, CMYK colour, a Sobel edge overlay, posterise and an optional AI depth map. Freeze a frame and save a high-contrast PNG for PIAF tactile printing or zines. Client-side."
};

// Embedded client-only tool (GRIT — Grayscale Rendering & Ink Toolkit): a live
// camera → dither / halftone app served from public/tools/dither-camera/. It needs
// camera access, so the iframe is granted `camera` via EmbeddedTool's `allow`.
export default function DitherCameraPage() {
  return (
    <EmbeddedTool
      title="Dither Camera"
      subtitle="Live camera → dither & halftone"
      blurb="Point your phone (or webcam) at anything and watch it become a live dithered / halftone image. Ten algorithms — Floyd-Steinberg, Atkinson, Bayer, angled halftone, variable dots, lines and more — plus CMYK colour screening at real print angles, a Sobel edge overlay, posterise, gamma and invert, and even an optional AI depth map. Built for PIAF tactile printing and zines: freeze a frame and save a high-contrast PNG. Front / back camera, all in the browser."
      src="/tools/dither-camera/index.html"
      backHref="/media-2d"
      backLabel="2D Tooling"
      allow="camera; fullscreen; clipboard-read; clipboard-write"
      note="Runs entirely in your browser — the camera feed never leaves your device. Tap to grant camera access (a laptop uses the webcam; a phone the rear camera, with a front/back toggle). No camera? Load a photo instead. The optional Depth map downloads a one-time AI model (~40 MB) on first use. This is the GRIT — Grayscale Rendering & Ink Toolkit — app, from the Radical Accessibility Toolkit."
    />
  );
}
