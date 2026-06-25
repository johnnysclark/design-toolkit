// The Design Toolkit sections, in the order they appear in the sidebar.
// `status` drives the badge: "live" tools have a working page; "soon" are stubs.
// `requiresAuth` tools need a signed-in user (they spend the API key or need a
// user session for RLS) — the shell is public, but these gate to /login.

export type ToolStatus = "live" | "soon";

export interface ToolItem {
  href: string;
  label: string;
  blurb: string;
  status: ToolStatus;
  requiresAuth?: boolean;
}

export const TOOLKIT_NAV: ToolItem[] = [
  { href: "/", label: "Overview", blurb: "The toolkit at a glance.", status: "live" },
  {
    href: "/site-analysis",
    label: "Surveyor",
    blurb: "The measured ground of any place — climate, terrain, water — macro ⇄ micro, Rhino-ready.",
    status: "live"
  },
  {
    href: "/site-design",
    label: "Eco-Architect",
    blurb: "Eco-Architect — form-finding by site forces (sun, wind, terrain), with testable rules + a Rhino 8 round-trip.",
    status: "live"
  },
  {
    href: "/skills-coach",
    label: "Coach",
    blurb: "A tutor for Rhino · Grasshopper · AutoCAD · Revit · Adobe — with levels, doc links, and a concept panel.",
    status: "live",
    requiresAuth: true
  },
  {
    href: "/skills-pathways",
    label: "Cartographer",
    blurb: "A beginner→advanced trail map of 2D & 3D skills — with a tutorial video behind every step.",
    status: "live"
  },
  {
    href: "/librarian",
    label: "Librarian",
    blurb: "Context for any image you find — related plans, drawings, photos + background, catalogued into a growing project library.",
    status: "live",
    requiresAuth: true
  },
  {
    href: "/pinup",
    label: "Archivist",
    blurb: "Studio memory + metadata. Upload work, tag it, keep the record.",
    status: "live",
    requiresAuth: true
  },
  {
    href: "/design-critic",
    label: "Critic",
    blurb: "Lay of the land + adoptable personas. Use with caution — consult humans too.",
    status: "soon"
  },
  {
    href: "/media-2d",
    label: "2D Tooling",
    blurb: "Drawing cleanup · live video · fabrication.",
    status: "soon"
  },
  {
    href: "/tools-3d",
    label: "3D Tooling",
    blurb: "Python · tutorials · Three.js · 3D-print settings.",
    status: "soon"
  },
  {
    href: "/rap",
    label: "RAP",
    blurb: "Radical Accessibility Project — a non-visual / tactile CAD workflow that drives Rhino. The studio's research showcase.",
    status: "live"
  }
];
