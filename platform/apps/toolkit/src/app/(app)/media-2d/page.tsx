import ToolHub, { HubCard } from "@/components/ToolHub";

// 2D Tooling is a hub: a bench of small, single-purpose 2D-media tools. Each is
// client-only (runs in the browser, no API key, no sign-in), so the page is
// public. "Ready" cards are working tools; "Proposed" cards are ideas from
// Claude, clearly marked and not yet built.
export const metadata = {
  title: "2D Tooling · Design Toolkit",
  description:
    "A bench of 2D-media tools — drawing & scan cleanup, Vantage (camera, lens & perspective), and Pattern Studio (parametric screens → SVG/DXF), with more proposed."
};

const CARDS: HubCard[] = [
  {
    title: "Pattern Studio",
    source: "Parametric screens & tilings",
    status: "live",
    href: "/media-2d/pattern-studio",
    blurb:
      "Generate a parametric screen / facade / tiling: a grid of cells whose size and rotation are driven by an attractor you drag. Choose the cell shape and the grid (square / brick / hex), tune the field, then export SVG, PNG, or DXF with real millimetre coordinates — straight into Rhino / AutoCAD or a laser cutter. Client-side."
  },
  {
    title: "Drawing Cleaner",
    source: "Ported from Drawing-Image-Cleaner + scan-cleaner",
    status: "live",
    href: "/media-2d/drawing-cleaner",
    blurb:
      "Turn a phone photo or scan of a pen/pencil drawing into clean black-on-white. Auto levels with a live histogram, gamma, sharpen, denoise and adaptive lighting, plus straighten/crop, a curves editor with presets, a before/after split, and a full-resolution (resizable) PNG export."
  },
  {
    title: "Vantage",
    source: "New — interactive demo",
    status: "live",
    href: "/media-2d/vantage",
    blurb:
      "See how a camera makes an image. Change the lens and watch the field of view and perspective shift (with a dolly-zoom that proves perspective comes from distance, not focal length); open the aperture to throw the background out of focus; and use tilt vs. lens-shift to keep a building's verticals straight — with a live plan diagram, a draughtsman overlay (horizon + vanishing points) and the real numbers.",
  },
  {
    title: "Halftone & Riso",
    status: "proposed",
    blurb:
      "Convert an image to a halftone or duotone / Risograph-style separation — for plates, zines, and graphic poché. Client-side, with adjustable dot size, angle and spot colours."
  },
  {
    title: "Vectorize / Make2D cleanup",
    status: "proposed",
    blurb:
      "Trace a cleaned raster into crisp SVG line work — threshold, centreline trace, simplify — so a scanned sketch or a Rhino Make2D dump becomes editable vectors for Illustrator or laser."
  },
  {
    title: "Live Video Tracer",
    status: "proposed",
    blurb:
      "Use a webcam as a light-table: a live edge/threshold overlay on the camera feed for tracing physical drawings or models, with a freeze-frame and snapshot. WebRTC, all in the browser."
  },
  {
    title: "Laser / Fabrication Export",
    status: "proposed",
    blurb:
      "Prep geometry for the laser cutter: map stroke colours to cut / score / engrave, set kerf, tile to bed size, and export clean SVG/DXF — the boring step before fabrication, made quick."
  },
  {
    title: "Scale & Scale-Bar",
    status: "proposed",
    blurb:
      "The drawing-scale companion: convert between ratios (1:50) and imperial (¼\"=1'-0\"), size a drawing to a sheet, and drop a clean graphic scale bar + north arrow as SVG for your layout."
  }
];

export default function Media2DPage() {
  return (
    <ToolHub
      title="2D Tooling"
      subtitle="Drawing & Fabrication"
      intro="Single-purpose widgets for 2D studio production — the jobs that usually mean opening Photoshop and remembering a workflow. Each runs entirely in your browser; nothing is uploaded. Drawing Cleaner, Vantage, and Pattern Studio are ready now; the rest are proposals."
      cards={CARDS}
    />
  );
}
