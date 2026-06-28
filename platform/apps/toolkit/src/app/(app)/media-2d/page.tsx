import ToolHub, { HubCard } from "@/components/ToolHub";

// 2D Tooling is a hub: a bench of small, single-purpose 2D-media tools. Each is
// client-only (runs in the browser, no API key, no sign-in), so the page is
// public. "Ready" cards are working tools; "Proposed" cards are ideas from
// Claude, clearly marked and not yet built.
export const metadata = {
  title: "2D Tooling · Design Toolkit",
  description:
    "A bench of 2D-media tools — drawing & scan cleanup, Halftone & Riso (spot-colour separation), Vantage (camera, lens & perspective), and Pattern Studio (parametric screens → SVG/DXF), with more proposed."
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
    source: "Halftone screening + spot-colour separation",
    status: "live",
    href: "/media-2d/halftone-riso",
    blurb:
      "Screen any image into a halftone, two-colour duotone, or full Risograph-style spot-colour separation — for plates, zines, posters and graphic poché. Adjustable dot shape, ruling and screen angle, real Riso inks, mis-registration and grain, over any paper colour. Export a finished PNG, per-ink plate masters for an actual Risograph, or vector SVG dots for print / plotter / laser. Client-side."
  },
  {
    title: "Vectorize",
    source: "New — raster → vector tracer",
    status: "live",
    href: "/media-2d/vectorize",
    blurb:
      "Trace a raster into crisp, editable vectors. Centreline traces the middle of every stroke — a scanned sketch or a Rhino Make2D dump becomes single paths, not hollow outlines; Outline traces filled shapes; Colour posterises a photo into flat layers. Threshold (auto / manual), despeckle, simplify and smooth, then export SVG for Illustrator or DXF (real millimetres) for CAD and laser. Client-side."
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
    title: "Scale Bar & North",
    source: "Graphic scale bar + north arrow",
    status: "live",
    href: "/media-2d/scale-bar",
    blurb:
      "Make a correct graphic scale bar and a north arrow for a sheet: pick a scale (metric ratio or imperial architect's scale), set length + divisions, choose a north-arrow style, and export an SVG sized in real millimetres (prints true at 100%) or a PNG."
  }
];

export default function Media2DPage() {
  return (
    <ToolHub
      title="2D Tooling"
      subtitle="Drawing & Fabrication"
      intro="Single-purpose widgets for 2D studio production — the jobs that usually mean opening Photoshop and remembering a workflow. Each runs entirely in your browser; nothing is uploaded. Pattern Studio, Drawing Cleaner, Halftone & Riso, Vectorize, Vantage, and Scale Bar are ready now; the rest are proposals."
      cards={CARDS}
    />
  );
}
