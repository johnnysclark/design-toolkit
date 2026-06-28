import ToolHub, { HubCard } from "@/components/ToolHub";

// 2D Tooling is a hub: a bench of small, single-purpose 2D-media tools. Each is
// client-only (runs in the browser, no API key, no sign-in), so the page is
// public. "Ready" cards are working tools; "Proposed" cards are ideas from
// Claude, clearly marked and not yet built.
export const metadata = {
  title: "2D Tooling · Design Toolkit",
  description:
    "A bench of 2D-media tools — drawing & scan cleanup, Halftone & Riso (spot-colour separation), Dither Camera (live-camera dither / halftone), Vectorize (raster → vector), Vantage (camera, lens & perspective), and Pattern Studio (parametric screens → SVG/DXF), with more proposed."
};

const CARDS: HubCard[] = [
  {
    title: "Hatch & Poché",
    source: "Architectural hatch fills",
    status: "live",
    href: "/media-2d/hatch",
    blurb:
      "A library of real architectural hatch and poché patterns — concrete, brick, CMU, stone, earth, gravel, sand, wood, insulation, steel — as SVG fills you can scale true to your drawing scale, set the pen weight and rotation, then export as SVG (sized in mm), PNG, or copy the SVG <pattern> to reuse anywhere. Client-side."
  },
  {
    title: "Entourage Library",
    source: "Scalable silhouettes for drawings",
    status: "live",
    href: "/media-2d/entourage",
    blurb:
      "Drop scalable black silhouettes — people, trees (plan + elevation), cars, bikes, furniture and plan symbols — into a composition at true scale (with a 1.7 m reference figure), drag/resize/flip them, and export a transparent SVG or PNG to layer over a drawing or collage. Client-side."
  },
  {
    title: "Figure-Ground / Nolli",
    source: "Urban figure-ground tracing",
    status: "live",
    href: "/media-2d/figure-ground",
    blurb:
      "Trace a site plan into a clean figure-ground: import a plan as a faint guide, paint the built mass with brush / rectangle / polygon, and read it as a figure-ground or a Nolli poché (with invert). Exports the diagram without the reference as vector SVG or PNG. Client-side."
  },
  {
    title: "Proportioning Overlays",
    source: "Golden section, root rectangles…",
    status: "live",
    href: "/media-2d/proportion",
    blurb:
      "Read a facade or plan against the classical proportioning systems: overlay the golden section + spiral, √2/√3/√5 root rectangles, rule of thirds, Fibonacci, Modulor bands, a tatami/ken grid, regulating lines and symmetry axes on an image or a draggable frame, with a live ratio readout. Export PNG or SVG. Client-side."
  },
  {
    title: "Diagram Studio",
    source: "Parti, bubble & adjacency diagrams",
    status: "live",
    href: "/media-2d/diagram-studio",
    blurb:
      "A quick concept-diagram kit: drop program bubbles (sized by area) and zones, connect them with weak/strong adjacency lines or flow arrows, and lay in bold parti arrows for the big moves — then export a clean SVG or PNG. Client-side."
  },
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
    title: "Dither Camera",
    source: "Live camera → dither / halftone (GRIT)",
    status: "live",
    href: "/media-2d/dither-camera",
    blurb:
      "Point your phone or webcam at anything and watch it become a live dithered / halftone image — 10 algorithms (Floyd-Steinberg, Atkinson, Bayer, angled halftone, variable dots, lines…), CMYK colour screening, a Sobel edge overlay, posterise, gamma / invert and an optional AI depth map. Built for PIAF tactile printing and zines: freeze a frame and save a high-contrast PNG. Front / back camera, all in the browser."
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
      intro="Single-purpose widgets for 2D studio production — the jobs that usually mean opening Photoshop and remembering a workflow. Each runs entirely in your browser; nothing is uploaded. Hatch & Poché, Entourage, Figure-Ground/Nolli, Proportioning Overlays and Diagram Studio join Pattern Studio, Drawing Cleaner, Halftone & Riso, Dither Camera, Vectorize, Vantage and Scale Bar; the rest are proposals."
      cards={CARDS}
    />
  );
}
