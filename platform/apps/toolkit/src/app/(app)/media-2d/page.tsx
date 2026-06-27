import ToolHub, { HubCard } from "@/components/ToolHub";

// 2D Tooling is a hub: a bench of small, single-purpose 2D-media tools. Each is
// client-only (runs in the browser, no API key, no sign-in), so the page is
// public. "Ready" cards are working tools; "Proposed" cards are ideas from
// Claude, clearly marked and not yet built.
export const metadata = {
  title: "2D Tooling · Design Toolkit",
  description:
    "A bench of 2D-media tools — drawing & scan cleanup, with more proposed: halftone, vectorize, live video, fabrication."
};

const CARDS: HubCard[] = [
  {
    title: "Drawing Cleaner",
    source: "Ported from Drawing-Image-Cleaner + scan-cleaner",
    status: "live",
    href: "/media-2d/drawing-cleaner",
    blurb:
      "Turn a phone photo or scan of a pen/pencil drawing into clean black-on-white. Auto levels with a live histogram, gamma, sharpen, denoise and adaptive lighting, plus straighten/crop, a curves editor with presets, a before/after split, and a full-resolution (resizable) PNG export."
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
  }
];

export default function Media2DPage() {
  return (
    <ToolHub
      title="2D Tooling"
      subtitle="Drawing & Fabrication"
      intro="Single-purpose widgets for 2D studio production — the jobs that usually mean opening Photoshop and remembering a workflow. Each runs entirely in your browser; nothing is uploaded. Drawing Cleaner is ready now; the rest are proposals."
      cards={CARDS}
    />
  );
}
