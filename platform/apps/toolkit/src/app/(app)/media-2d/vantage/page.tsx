import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Vantage · Design Toolkit",
  description:
    "An interactive demo of how a camera sees: how lens / focal length sets the field of view and perspective, and how aperture sets depth of field — with tilt-shift perspective control and a horizon + vanishing-point overlay."
};

export default function VantagePage() {
  return (
    <EmbeddedTool
      title="Vantage"
      subtitle="Camera, Lens & Perspective"
      blurb="See how a camera turns the world into a picture. Change the lens to watch the field of view and perspective shift, open the aperture to control depth of field, and use tilt vs. lens-shift to keep a building's verticals straight — alongside a live plan diagram, a draughtsman overlay (horizon + vanishing points) and the real numbers (FOV, depth of field, hyperfocal)."
      src="/tools/vantage/web/index.html"
      backHref="/media-2d"
      backLabel="2D Tooling"
      note="Runs entirely in your browser (WebGL via three.js) — nothing is uploaded. The optics use a thin-lens teaching model; bokeh shape is stylised and real lenses add aberrations, so treat the numbers as a clear approximation rather than a calibrated camera."
    />
  );
}
