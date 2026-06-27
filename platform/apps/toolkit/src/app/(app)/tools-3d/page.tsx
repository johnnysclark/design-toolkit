import ToolHub, { HubCard } from "@/components/ToolHub";

// 3D Tooling is a hub: on-ramps for students moving from model to machine and to
// the web. Obliquify is built and client-only (no API key, no sign-in), so the
// page is public. "Proposed" cards are ideas from Claude, clearly marked.
export const metadata = {
  title: "3D Tooling · Design Toolkit",
  description:
    "A bench of 3D tools — Obliquify (oblique projection), a Three.js Model Viewer, and a Rhino/Grasshopper Python snippet gallery, with 3D-print/PIAF settings proposed."
};

const CARDS: HubCard[] = [
  {
    title: "Obliquify",
    source: "Rebuilt — original source not found",
    status: "rebuilt",
    href: "/tools-3d/obliquify",
    blurb:
      "Turn a flat drawing — an elevation, plan, or photo — into an oblique (paraline) projection: extrude it into depth at an adjustable angle and direction, choose cabinet / cavalier presets, shade the sides, outline the edges, and export a transparent PNG."
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
  }
];

export default function Tools3DPage() {
  return (
    <ToolHub
      title="3D Tooling"
      subtitle="Modeling & 3D Print"
      intro="On-ramps for moving from model to machine and to the web. Obliquify, the Model Viewer, and the Rhino/Grasshopper Python gallery all run entirely in your browser — no account, nothing uploaded. (Obliquify is a fresh rebuild — point us at your original and we'll match it.)"
      cards={CARDS}
    />
  );
}
