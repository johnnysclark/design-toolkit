import ToolHub, { HubCard } from "@/components/ToolHub";

// 3D Tooling is a hub: on-ramps for students moving from model to machine and to
// the web. Obliquify is built and client-only (no API key, no sign-in), so the
// page is public. "Proposed" cards are ideas from Claude, clearly marked.
export const metadata = {
  title: "3D Tooling · Design Toolkit",
  description:
    "A bench of 3D tools — Waffle Structure and Contour Slicer (laser-ready fabrication), Obliquify (oblique projection), a Three.js Model Viewer, a Sun & Shadow study, a Solar Envelope, and a Rhino/Grasshopper Python gallery."
};

const CARDS: HubCard[] = [
  {
    title: "Waffle Structure",
    source: "Interlocking ribs · laser-ready",
    status: "live",
    href: "/tools-3d/waffle",
    blurb:
      "Turn a surface or your own model into an interlocking egg-crate of ribs — notched half-depth where they cross so they slot together. Pick a parametric form or drop in an STL/OBJ/PLY (it's raycast into a heightfield and waffled), set rib counts, material thickness and kerf, then export a true-millimetre nested SVG cut sheet for the laser, with parts labelled for assembly. Client-side, nothing uploaded."
  },
  {
    title: "Contour Slicer",
    source: "Stacked-layer topo model · laser-ready",
    status: "live",
    href: "/tools-3d/contour-slicer",
    blurb:
      "Slice a terrain or form into horizontal contour layers — a topographic model from stacked chipboard. Choose your sheet thickness and it traces each level (marching squares), nests the numbered layers onto a millimetre-true SVG cut sheet with the next layer scored on top for foolproof stacking, and gives you a flat contour map too. Pairs with the Topography Builder; drop in your own model to slice it. Client-side."
  },
  {
    title: "Sun & Shadow Study",
    source: "Solar geometry + cast shadows",
    status: "live",
    href: "/tools-3d/sun-study",
    blurb:
      "Pick a place and a date + time and see where the sun is and how shadows fall on a massing — real solar geometry (NOAA), real cast shadows, a sun-path arc for the day, and a one-click sunrise→sunset animation. Switch massings, read altitude/azimuth/sunrise/sunset, export a PNG. Client-side."
  },
  {
    title: "Obliquify",
    source: "Three.js paraline viewer",
    status: "live",
    href: "/tools-3d/obliquify",
    blurb:
      "Import a 3D model (STL/OBJ/PLY) and view it under a true oblique (paraline) projection — the front plane stays true-shape while depth recedes at a chosen angle and foreshortening. Cabinet / cavalier presets, adjustable angle, depth ratio and direction, a demo massing to test, and a PNG export. Client-side, nothing uploaded."
  },
  {
    title: "3D-Print & PIAF Settings",
    status: "proposed",
    blurb:
      "A settings advisor / cheat-sheet: pick a goal (sturdy massing model, fine detail, tactile PIAF relief) and get layer height, walls, infill and supports — plus copy-paste slicer presets and PIAF swell-paper tips."
  },
  {
    title: "Model Viewer",
    source: "Three.js web viewer",
    status: "live",
    href: "/tools-3d/model-viewer",
    blurb:
      "Drop a GLB/GLTF/OBJ/STL and get a clean, shareable web viewer for the portfolio site — orbit, set a turntable, pick a background and lighting, save a screenshot, and grab an embed snippet. Client-side, no account."
  },
  {
    title: "Rhino / Grasshopper Python",
    status: "live",
    href: "/tools-3d/rhino-python",
    blurb:
      "A searchable gallery of small, copy-paste RhinoPython / GhPython snippets for studio moves (panelise, attractor fields, contour, Make2D batch, layers, baking), each with a one-line explanation — paired with Coach for the why."
  },
  {
    title: "Topography Builder",
    status: "proposed",
    blurb:
      "Drop a heightmap image or paste survey points and get a 3D terrain mesh + contour lines you can orbit and export (OBJ / DXF) into Rhino — plus slope and cut/fill readouts. Client-side."
  },
  {
    title: "Solar Envelope",
    source: "Zoning by sunlight",
    status: "live",
    href: "/tools-3d/solar-envelope",
    blurb:
      "Carve the largest volume you can build on a site without shadowing the neighbours — the 'solar envelope' (after Knowles). Set site size + latitude, pick the sun window to protect (e.g. winter 9–3), and height is capped everywhere so shadows stay on-site: tallest in the middle, sloping to the edges. Orbit it, export OBJ to Rhino. Client-side."
  }
];

export default function Tools3DPage() {
  return (
    <ToolHub
      title="3D Tooling"
      subtitle="Modeling, Sun & 3D Print"
      intro="On-ramps for moving from model to machine, to the sun, and to the web. Obliquify, the Model Viewer, the Sun & Shadow study, and the Rhino/Grasshopper Python gallery all run entirely in your browser — no account, nothing uploaded."
      cards={CARDS}
    />
  );
}
