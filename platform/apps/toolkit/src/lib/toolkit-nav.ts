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
    label: "Site Analysis",
    blurb: "The measured ground of any place — climate, terrain, water — macro ⇄ micro, Rhino-ready.",
    status: "live"
  },
  {
    href: "/site-design",
    label: "Site Design",
    blurb: "Gable Studio — form-finding by site forces (sun, wind, terrain), with testable rules + a Rhino 8 round-trip.",
    status: "live"
  },
  {
    href: "/skills-coach",
    label: "Skills Coach",
    blurb: "Rhino · Revit · Adobe · Vibe-Coding · Portfolio / Storytelling.",
    status: "soon"
  },
  {
    href: "/librarian",
    label: "Librarian",
    blurb: "Precedent dossiers — every claim tagged, attacked, left for you to verify.",
    status: "live",
    requiresAuth: true
  },
  {
    href: "/pinup",
    label: "Pinup Wall",
    blurb: "Studio memory + metadata. Upload work, tag it, keep the record.",
    status: "live",
    requiresAuth: true
  },
  {
    href: "/design-critic",
    label: "Design Critic",
    blurb: "Lay of the land + adoptable personas. Use with caution — consult humans too.",
    status: "soon"
  },
  {
    href: "/media-2d",
    label: "2D Media Tools",
    blurb: "Drawing cleanup · live video · fabrication.",
    status: "soon"
  },
  {
    href: "/tools-3d",
    label: "3D Tools",
    blurb: "Python · tutorials · Three.js · 3D-print settings.",
    status: "soon"
  },
  {
    href: "/rap",
    label: "RAP",
    blurb: "Accessibility (RAP) — non-visual / tactile CAD workflow.",
    status: "soon"
  }
];
