import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";

// Typography matches the Overview page's `.di-doc` system so the two read as
// siblings: Archivo Black (the app's --font-display, wired in the root layout)
// uppercase for headings + pills, a readable system sans for the body, and one
// loaded webfont — IBM Plex Mono — reserved for the CLI / code blocks. Content
// tracks the ACADIA 2026 paper, "Accessibility Harness & Adaptive Pedagogy for
// Non-Visual Design Authorship." The student and institution are anonymized,
// following the paper.
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "RAP — Radical Accessibility Project",
  description:
    "The Accessibility Harness: a non-visual, tactile CAD workflow that lets a blind or low-vision student author architecture in the same studio as sighted peers."
};

// ─── Capability entries (each with a small inline-SVG mock of how it works) ───
type Tool = { no: string; title: string; runs: string; body: React.ReactNode; mock: string };

const TOOLS: Tool[] = [
  {
    no: "01",
    title: "Controller & Layout Jig — the authoring layer",
    runs: "Runs as — a Python CLI (stdlib only) editing the canonical State JSON.",
    body: (
      <p>
        The Controller is a command-line interface the student uses to edit a persistent{" "}
        <code>state.json</code> directly. Commands like <code>set bay A rotation 30</code> or{" "}
        <code>wall A on</code> express design intent as structured language, and each returns a
        spoken-style confirmation. The design lives in the JSON as parameters — as pure text —
        while a small Rhino-Python <b>Watcher</b> reads that state and rebuilds the model. The CLI
        is the guardrail that lets a blind student drive and inspect geometry without ever touching
        the inaccessible GUI.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 200" role="img" aria-label="Controller mock: a typed command and its spoken-style confirmation">
      <rect width="640" height="200" fill="#fff"/>
      <rect x="24" y="22" width="592" height="156" rx="6" fill="#0e0e0e"/>
      <g font-family="IBM Plex Mono, monospace" font-size="13.5">
        <text x="42" y="54" fill="#7fd17f">&gt;&gt; set bay A origin 20 10</text>
        <text x="42" y="80" fill="#dcdcdc">OK: Bay A origin = (20.0, 10.0). Was (18.0, 8.0).</text>
        <text x="42" y="112" fill="#7fd17f">&gt;&gt; wall A on</text>
        <text x="42" y="138" fill="#dcdcdc">OK: Bay A walls ON, 6-inch thick.</text>
        <text x="42" y="166" fill="#7fd17f">&gt;&gt; <tspan fill="#dcdcdc">describe</tspan> <tspan fill="#666">| read back by screen reader</tspan></text>
      </g>
    </svg>`
  },
  {
    no: "02",
    title: "Digital Assistant — querier, coder, tutor",
    runs: "Runs as — an LLM (Claude Code) over MCP, surfaced through accessible Channels.",
    body: (
      <p>
        The AI layer wraps one model in three coordinated roles: <b>querier</b> (&ldquo;where is the
        front door?&rdquo; — answered from the JSON state), <b>coder</b> (drives RhinoPython to edit
        the model), and <b>tutor</b> (teaches the underlying Rhino concepts so the student grows
        toward self-sufficiency). Because default agent terminals are illegible to screen readers,
        Claude Code&rsquo;s <b>Channels</b> re-render every turn as structured, navigable HTML —
        ARIA landmarks, tool calls in disclosures, and a live <code>state.json</code> tree.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 180" role="img" aria-label="Digital Assistant mock: a natural-language request fanning into query, code, and tutoring roles">
      <rect width="640" height="180" fill="#fff"/>
      <rect x="24" y="28" width="270" height="40" rx="8" fill="#1A45F0"/>
      <text x="40" y="53" font-family="IBM Plex Sans" font-size="13.5" fill="#fff">&ldquo;make the corridor wider&rdquo;</text>
      <path d="M300 48 l34 0 m-8 -6 l8 6 l-8 6" stroke="#111" stroke-width="1.6" fill="none"/>
      <rect x="342" y="26" width="120" height="44" rx="6" fill="#111"/>
      <text x="358" y="45" font-family="IBM Plex Sans" font-size="12" fill="#fff">Digital</text>
      <text x="358" y="61" font-family="IBM Plex Sans" font-size="12" fill="#fff">Assistant</text>
      <g font-family="IBM Plex Sans" font-size="12" fill="#333">
        <rect x="24" y="110" width="180" height="34" rx="4" fill="#f4f4f4" stroke="#e0e0e0"/><text x="36" y="132">querier · ask the model</text>
        <rect x="216" y="110" width="180" height="34" rx="4" fill="#f4f4f4" stroke="#e0e0e0"/><text x="228" y="132">coder · edit via RhinoPython</text>
        <rect x="408" y="110" width="208" height="34" rx="4" fill="#f4f4f4" stroke="#e0e0e0"/><text x="420" y="132">tutor · learn the concepts</text>
      </g>
      <path d="M402 70 L114 110 M402 70 L306 110 M402 70 L500 110" stroke="#ccc" fill="none"/>
    </svg>`
  },
  {
    no: "03",
    title: "Image Describer — drawings into structured text",
    runs: "Runs as — a vision model with a Whole-to-Part description schema.",
    body: (
      <p>
        Architectural images — a plan, photo, section, or diagram — are described as a navigable
        hierarchy rather than a flat paragraph: <b>Macro</b> (the whole composition), <b>Meso</b>{" "}
        (its parts in moderate depth), then <b>Micro</b> (finer-grain features and measurements).
        The same schema turns reference images and classmates&rsquo; work into something a screen
        reader can traverse — and, inverted, lets description itself become the act of authorship.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 200" role="img" aria-label="Image describer mock: an image resolving into macro, meso, and micro text bands">
      <rect width="640" height="200" fill="#fff"/>
      <rect x="24" y="28" width="150" height="144" rx="4" fill="#f4f4f4" stroke="#ddd"/>
      <g stroke="#bbb" stroke-width="1.3" fill="none"><rect x="46" y="52" width="106" height="96"/><line x1="46" y1="100" x2="152" y2="100"/><line x1="99" y1="52" x2="99" y2="148"/></g>
      <g font-family="IBM Plex Sans" font-size="12.5">
        <rect x="200" y="34" width="416" height="40" rx="4" fill="#f7f7f4" stroke="#e6e6e0"/>
        <text x="214" y="51" fill="#999" font-size="10.5" letter-spacing="1">MACRO</text><text x="214" y="68" fill="#222">A single-story glass pavilion in fine black line.</text>
        <rect x="200" y="82" width="416" height="40" rx="4" fill="#f7f7f4" stroke="#e6e6e0"/>
        <text x="214" y="99" fill="#999" font-size="10.5" letter-spacing="1">MESO</text><text x="214" y="116" fill="#222">Rectangular plan, long axis left to right, central core.</text>
        <rect x="200" y="130" width="416" height="40" rx="4" fill="#f7f7f4" stroke="#e6e6e0"/>
        <text x="214" y="147" fill="#999" font-size="10.5" letter-spacing="1">MICRO</text><text x="214" y="164" fill="#222">Eight wide-flange columns, two rows of four, 19&#39; o.c.</text>
      </g>
    </svg>`
  },
  {
    no: "04",
    title: "TACT — tactile graphics (PIAF swell paper)",
    runs: "Runs as — pure-Python pipeline + its own MCP server (7 functions).",
    body: (
      <p>
        Converts a design into a physical raised-line graphic readable by touch. Output is laser
        printed on PIAF microcapsule paper with carbon toner and fed through a heater — the carbon
        absorbs heat, the capsules swell, and black lines rise off the page as ridges. TACT renders
        straight from the state file or converts any image with tuned presets, holding black density
        in the 25&ndash;40% band where touch reads best, with BANA-compliant braille labels that
        stay paper-absolute at any model scale.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 200" role="img" aria-label="TACT mock: a plan drawing turning into raised tactile ridges with a braille label">
      <rect width="640" height="200" fill="#fff"/>
      <g stroke="#111" stroke-width="1.5" fill="none"><rect x="40" y="44" width="150" height="112"/><line x1="40" y1="100" x2="190" y2="100"/><line x1="115" y1="44" x2="115" y2="156"/><rect x="58" y="92" width="16" height="16" fill="#111"/></g>
      <text x="40" y="178" font-family="IBM Plex Sans" font-size="11" fill="#888">state.json → plan</text>
      <path d="M214 100 l34 0 m-8 -6 l8 6 l-8 6" stroke="#111" stroke-width="1.6" fill="none"/>
      <g>
        <rect x="270" y="44" width="200" height="112" rx="3" fill="#faf6ee" stroke="#e7dcc6"/>
        <g stroke="#c9a24b" stroke-width="3.4" stroke-linecap="round" fill="none" opacity="0.95"><rect x="292" y="62" width="156" height="80" rx="2"/><line x1="292" y1="102" x2="448" y2="102"/><line x1="370" y1="62" x2="370" y2="142"/></g>
        <g fill="#7a5a16"><circle cx="486" cy="64" r="2.4"/><circle cx="486" cy="72" r="2.4"/><circle cx="494" cy="64" r="2.4"/><circle cx="494" cy="80" r="2.4"/><circle cx="502" cy="68" r="2.4"/><circle cx="502" cy="76" r="2.4"/></g>
      </g>
      <text x="270" y="178" font-family="IBM Plex Sans" font-size="11" fill="#888">raised ridges + braille key — read by hand</text>
    </svg>`
  },
  {
    no: "05",
    title: "3D Print — tactile scale models",
    runs: "Runs as — pure-Python STL export to a Bambu Lab 3D printer.",
    body: (
      <p>
        Generates a watertight triangle mesh from the same parametric model — no Rhino
        dependency — validates solidity, and exports a binary STL scaled at 1:200. The printer lives
        in the studio, not a separate fabrication lab, so the physical object a student lifts off the
        bed during review stays in sync with the design they are editing by text and touch.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 170" role="img" aria-label="3D print mock: a wireframe massing extruding into a printed relief block">
      <rect width="640" height="170" fill="#fff"/>
      <g stroke="#111" stroke-width="1.4" fill="none">
        <path d="M70 64 L156 44 L156 110 L70 130 Z"/><path d="M70 64 L126 82 L212 62 L156 44"/><path d="M126 82 L126 148 L70 130"/><path d="M126 148 L212 128 L212 62"/>
      </g>
      <path d="M250 96 l40 0 m-8 -6 l8 6 l-8 6" stroke="#111" stroke-width="1.6" fill="none"/>
      <g stroke="#111" stroke-width="1.3" fill="#f1f1f1">
        <path d="M330 86 L470 56 L560 78 L420 110 Z" fill="#fafafa"/>
        <path d="M330 86 L330 126 L420 150 L420 110 Z"/>
        <path d="M420 110 L420 150 L560 118 L560 78 Z" fill="#ececec"/>
      </g>
      <text x="330" y="166" font-family="IBM Plex Sans" font-size="11" fill="#888">held during review · 1:200 · watertight STL</text>
    </svg>`
  }
];

// ─── The five constitutive properties of the Harness pattern (ACADIA §4.5) ───
const PROPS: { n: string; term: string; def: string }[] = [
  { n: "01", term: "Sense-agnostic state", def: "The canonical design lives in a JSON file that privileges no modality. Any renderer can be plugged in to consume it." },
  { n: "02", term: "Renderer parity", def: "The visual viewport, the tactile media, and the CLI and web interfaces all consume the same state. The viewport is one renderer among several, not the source of truth." },
  { n: "03", term: "Multiple authoring channels", def: "CLI commands, voice transcribed to CLI, direct JSON edits, and LLM-translated natural-language intent all reach the same state. The student picks the channel that fits the task." },
  { n: "04", term: "LLM skill scaffolding", def: "One model, three scaffolded roles — querier, coder, tutor — so the assistant is a ramp toward independence, not a permanent dependency." },
  { n: "05", term: "Auditability", def: "Every action is reversible and inspectable; the state is human-readable and version-controllable; every command and tool call is logged. “Trust but verify” is enforced by the substrate." }
];

// ─── Four candidate implications for studio practice (ACADIA §5) ───
const IMPLICATIONS: { title: string; body: string }[] = [
  { title: "An explicit textual design state", body: "A stable, version-controllable, queryable record of where a design stands — supporting voice, CLI, direct JSON, and natural language without ad-hoc adaptation." },
  { title: "Multi-modal critique", body: "Once state is sense-agnostic, critique can run through tactile prints, spoken description, and the viewport in parallel — the pin-up stops being the privileged forum." },
  { title: "AI-scaffolded verification", body: "Ask the model what is actually in your file — “what did I just do?”, “what layer are the columns on?” — grounded in the textual state rather than a screenshot." },
  { title: "Protocols designed for access", body: "“Using your words,” Macro/Meso/Micro alt-text, written notes alongside drawings — communication designed for access tends to beat communication retrofitted for it." }
];

// ─── What is on the horizon ───
const HORIZON: { title: string; body: string }[] = [
  { title: "Spatial audio of a design", body: "Binaural rendering — walk a plan and hear volume as reverb, wall proximity as tone, ceiling height as pitch." },
  { title: "Vibrotactile models & haptic gloves", body: "Surfaces and gloves that encode material, load, or edges as vibration you feel under the fingertips." },
  { title: "Live pin-array tactile display", body: "A refreshable pin surface that redraws the current state in real time — a dynamic tactile screen, not a static print." },
  { title: "Live AI scene description", body: "Continuous narration during studio, pin-ups, and site visits via smart glasses — including Socratic questions about the space." }
];

const STYLES = `
.di-doc{ color:#141414; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; font-size:17px; line-height:1.62; -webkit-font-smoothing:antialiased; }
.di-doc h1,.di-doc h2,.di-doc h3{ font-family:var(--font-display),ui-sans-serif,system-ui,sans-serif; color:#111; margin:0; font-weight:400; text-transform:uppercase; letter-spacing:-.01em; }
.di-doc a{ color:#1A45F0; }
.di-doc em{ font-style:italic; }
.di-doc code{ font-family:var(--font-mono),ui-monospace,monospace; font-size:.86em; background:#f1f1ef; padding:1px 5px; border-radius:3px; color:#1a1a1a; }
.di-doc .wrap{ max-width:760px; margin:0 auto; }

.di-doc header{ border-bottom:2px solid #111; padding:2px 0 22px; }
.di-doc .kicker{ font-size:13px; letter-spacing:.16em; text-transform:uppercase; color:#666; }
.di-doc header h1{ font-size:clamp(28px,4.6vw,42px); line-height:1.04; letter-spacing:-.02em; margin-top:12px; font-weight:400; }
.di-doc .sub{ font-weight:500; font-size:15px; color:#555; margin-top:8px; letter-spacing:.01em; }
.di-doc .lede{ font-weight:500; font-size:clamp(17px,2.2vw,20px); line-height:1.4; color:#222; margin-top:14px; max-width:58ch; }
.di-doc .byline{ font-size:14.5px; color:#444; margin-top:14px; max-width:64ch; }
.di-doc .byline b{ font-weight:500; color:#111; }

.di-doc .exec{ padding:28px 0 6px; }
.di-doc .exec .lbl{ font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:#888; margin-bottom:10px; }
.di-doc .exec .sum{ font-size:19px; line-height:1.6; color:#111; margin:0; max-width:62ch; }
.di-doc .hl{ font-weight:500; box-shadow:inset 0 -0.38em 0 #F1EBD6; }
.di-doc .glance{ display:grid; grid-template-columns:repeat(3,1fr); gap:0; margin-top:24px; border:1px solid #e6e6e6; border-radius:4px; overflow:hidden; background:#fff; }
.di-doc .gcell{ padding:14px 16px; border-right:1px solid #ededed; }
.di-doc .gcell:last-child{ border-right:none; }
.di-doc .gcell .gk{ font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:#999; margin-bottom:6px; }
.di-doc .gcell .gv{ font-size:14.5px; line-height:1.4; color:#222; }

.di-doc .jump{ margin-top:26px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.di-doc .jump .jlbl{ font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#999; margin-right:4px; }
.di-doc .jump a{ font-family:var(--font-display),sans-serif; text-transform:uppercase; letter-spacing:-.01em; font-size:11.5px; text-decoration:none; color:#111; background:#fff; border:1px solid #111; border-radius:999px; padding:6px 12px; }
.di-doc .jump a:hover{ border-color:#111; }

.di-doc .fig{ margin:22px 0 6px; border:1px solid #e6e6e6; border-radius:4px; overflow:hidden; background:#fff; }
.di-doc .fig img{ display:block; width:100%; height:auto; }
.di-doc .fig.pad img{ padding:14px; }
.di-doc .fig figcaption{ font-size:12.5px; line-height:1.45; color:#777; padding:10px 14px; border-top:1px solid #ededed; font-style:italic; }

.di-doc .khead{ border-top:2px solid #111; margin-top:44px; padding-top:15px; margin-bottom:14px; }
.di-doc .khead h2{ font-size:24px; letter-spacing:-.01em; }
.di-doc .khead p{ font-size:15px; color:#555; margin:7px 0 0; max-width:60ch; }

.di-doc .pipe-cap{ font-size:13px; color:#777; margin:2px 0 8px; }

.di-doc .modes{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin:18px 0 6px; }
.di-doc .mode{ border:1px solid #e6e6e6; border-radius:4px; padding:15px 16px; background:#fff; }
.di-doc .mode .mn{ font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#999; }
.di-doc .mode .mt{ font-weight:600; font-size:15.5px; color:#111; margin:3px 0 6px; }
.di-doc .mode p{ font-size:13.5px; line-height:1.5; color:#444; margin:0; }

.di-doc .body p{ font-size:17px; line-height:1.72; margin:0 0 18px; color:#1a1a1a; max-width:64ch; }
.di-doc .body p.first{ font-size:19px; line-height:1.58; color:#111; }

.di-doc .props{ margin:6px 0; border:1px solid #e6e6e6; border-radius:4px; overflow:hidden; background:#fff; }
.di-doc .prop{ display:grid; grid-template-columns:54px 1fr; gap:0; border-top:1px solid #ededed; }
.di-doc .prop:first-child{ border-top:none; }
.di-doc .prop .pn{ font-family:var(--font-display),sans-serif; font-size:13px; color:#bbb; padding:16px 0 16px 18px; }
.di-doc .prop .pc{ padding:15px 18px 15px 4px; }
.di-doc .prop .pt{ font-weight:500; font-size:16px; color:#111; }
.di-doc .prop .pd{ font-size:14.5px; line-height:1.5; color:#444; margin-top:4px; max-width:60ch; }

.di-doc .tool-entry{ display:grid; grid-template-columns:minmax(0,1.04fr) minmax(0,1fr); gap:28px; align-items:center; padding:26px 0; border-top:1px solid #ededed; }
.di-doc .tool-entry:first-of-type{ border-top:none; }
.di-doc .te-no{ font-family:var(--font-display),sans-serif; font-size:13px; color:#bbb; letter-spacing:.04em; margin-bottom:4px; }
.di-doc .te-text h3{ font-size:19px; line-height:1.14; margin:0 0 9px; }
.di-doc .te-text p{ font-size:15px; line-height:1.56; color:#2e2e2e; margin:0; }
.di-doc .te-text code{ font-size:12.5px; }
.di-doc .te-deliver{ font-size:12.5px; color:#8a8a8a; margin-top:11px; letter-spacing:.01em; }
.di-doc .te-mock{ border:1px solid #e2e2e2; border-radius:4px; background:#fff; overflow:hidden; }
.di-doc .te-mock svg{ display:block; width:100%; height:auto; }

.di-doc .feature{ border-top:2px solid #111; border-bottom:2px solid #111; padding:28px 0; margin:30px 0 0; }
.di-doc .feature .fl{ font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#888; margin-bottom:13px; }
.di-doc .feature p{ font-weight:700; font-size:21px; line-height:1.36; letter-spacing:-.005em; color:#111; margin:0; max-width:30ch; }
.di-doc .feature p .hl{ box-shadow:inset 0 -0.36em 0 #F1EBD6; }

.di-doc .readout{ background:#0e0e0e; border-radius:6px; padding:18px 20px; margin:18px 0; overflow-x:auto; }
.di-doc .readout pre{ margin:0; font-family:var(--font-mono),ui-monospace,monospace; font-size:13px; line-height:1.62; color:#dcdcdc; white-space:pre; }
.di-doc .readout .p{ color:#7fd17f; }
.di-doc .readout .c{ color:#6f6f6f; }

.di-doc .desk{ border:1px solid #e6e6e6; border-radius:4px; background:#fafafa; padding:20px 22px; margin:6px 0; }
.di-doc .desk p{ font-size:15.5px; line-height:1.6; color:#2a2a2a; margin:0; max-width:66ch; }

.di-doc .horizon{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:6px 0; }
.di-doc .hcell{ border:1px solid #e6e6e6; border-left:3px solid #111; border-radius:4px; padding:14px 16px; background:#fff; }
.di-doc .hcell .ht{ font-weight:600; font-size:15px; color:#111; margin-bottom:5px; }
.di-doc .hcell .hb{ font-size:13.5px; line-height:1.5; color:#444; }

.di-doc .demo{ border:1px dashed #c9b27a; background:#fbf8f0; border-radius:6px; padding:20px 22px; margin:18px 0 6px; }
.di-doc .demo .dl{ font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#a98a3c; margin-bottom:8px; }
.di-doc .demo .dt{ font-weight:600; font-size:18px; color:#111; margin:0 0 8px; }
.di-doc .demo p{ font-size:15px; line-height:1.6; color:#3a3320; margin:0; max-width:64ch; }

.di-doc .end{ border-top:2px solid #111; margin-top:46px; padding:22px 0 10px; }
.di-doc .end p{ font-size:14.5px; color:#555; margin:0 0 9px; max-width:64ch; }
.di-doc .end b{ color:#222; font-weight:500; }

@media (max-width:720px){
  .di-doc .tool-entry{ grid-template-columns:1fr; gap:14px; }
  .di-doc .glance,.di-doc .modes,.di-doc .horizon{ grid-template-columns:1fr; }
  .di-doc .gcell{ border-right:none; border-bottom:1px solid #ededed; }
  .di-doc .gcell:last-child{ border-bottom:none; }
}

/* Site rule — all text is black, never grey. The SVG mocks keep their own
   fills, the dark terminal readout keeps its terminal colors, and the inverted
   CTA buttons keep their white text. */
.di-doc, .di-doc *:not(a){ color:#111 !important; }
.di-doc a{ color:#1A45F0 !important; }
.di-doc a.cta{ color:#fff !important; }
.di-doc .readout pre{ color:#dcdcdc !important; }
.di-doc .readout .p{ color:#7fd17f !important; }
.di-doc .readout .c{ color:#6f6f6f !important; }
`;

export default function RAP() {
  return (
    <div className={`di-doc ${mono.variable}`}>
      <style>{STYLES}</style>

      <div className="wrap">
        <header>
          <div className="kicker">All Means Works · Studio research</div>
          <h1>RAP</h1>
          <p className="sub" style={{ color: "#111", fontWeight: 600 }}>Radical Accessibility Project</p>
          <p className="sub">Accessibility Harness &amp; Adaptive Pedagogy for Non-Visual Design Authorship · ACADIA 2026</p>
          <p className="lede">
            Architecture assumes you can see. RAP inverts the premise — wrapping an AI assistant
            around a design that lives in text, so a blind student can author CAD geometry
            independently in the same studio as sighted peers.
          </p>
          <p className="byline">
            A studio research project co-designed with a legally blind undergraduate architecture
            student — the project&rsquo;s primary user — at a major public university&rsquo;s school
            of architecture. Open-source; code for the Controller, Watcher, and image-to-tactile
            pipeline is to be released on publication.
          </p>
        </header>

        <a
          href="/rap/studio"
          className="cta"
          style={{
            display: "inline-block",
            marginTop: 2,
            padding: "12px 20px",
            background: "#111",
            color: "#fff",
            textDecoration: "none",
            fontFamily: "var(--font-display),sans-serif",
            textTransform: "uppercase",
            letterSpacing: "-.01em",
            fontWeight: 400,
            fontSize: 14,
            borderRadius: 6
          }}
        >
          ▶&nbsp;&nbsp;Try RAP Studio — author a plan in your browser
        </a>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <figure className="fig">
          <img src="/rap-figures/fig-tactile-axon.jpg" alt="Hands reading a swell-paper tactile axonometric drawing; raised black lines form a three-dimensional massing on textured paper amid other tactile sheets." />
          <figcaption>A swell-paper tactile axonometric, read by hand — the design made physical.</figcaption>
        </figure>

        <section className="exec">
          <div className="lbl">What it is</div>
          <p className="sum">
            The <span className="hl">Accessibility Harness</span> is a configuration pattern, not a
            replacement CAD app and not a single accessible tool — it is a coordination layer. It
            wraps a large language model with a sense-agnostic design state, surrounds that state
            with tactile and linguistic renderers, and treats the student&rsquo;s spoken intent as
            an authoring channel. The student drives the work; the assistant is the translation
            interface to an otherwise sighted-default discipline. The aim is{" "}
            <span className="hl">parity, not accommodation</span>: the student depends on the
            studio&rsquo;s infrastructure, AI tools, and classmates the way every other student does,
            rather than on bespoke sighted mediation.
          </p>
          <div className="glance">
            <div className="gcell">
              <div className="gk">The move</div>
              <div className="gv">A pattern, not a tool. Swap a renderer or a channel; never rebuild the modeler.</div>
            </div>
            <div className="gcell">
              <div className="gk">Who</div>
              <div className="gv">Co-designed with a legally blind architecture student — its primary user. A work in progress.</div>
            </div>
            <div className="gcell">
              <div className="gk">Runs as</div>
              <div className="gv">Local-first, command-line + Claude Code, open-source. Drives Rhino 8.</div>
            </div>
          </div>

          <div className="jump">
            <span className="jlbl">On this page</span>
            <a href="#how">How it works</a>
            <a href="#properties">Five properties</a>
            <a href="#tools">The tools</a>
            <a href="#argument">The argument</a>
            <a href="#implications">For the studio</a>
            <a href="#horizon">What&rsquo;s next</a>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <figure className="fig pad">
            <img src="/rap-figures/fig-harness-topology.png" alt="Diagram: the Radical Accessibility Harness wraps an LLM engine (Claude, swappable) with Personality, Skills, and Standards, connected through an accessible Web UI to the student user and to external tools." />
            <figcaption>The Harness topology — a swappable LLM engine wrapped by personality, skills, and standards, reached by the student through an accessible web UI.</figcaption>
          </figure>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
        <div className="khead" id="how">
          <h2>How it works — Controller, State, Watcher, Channels</h2>
          <p>
            The design is a single canonical <code>state.json</code>. A Controller (CLI) edits it, a
            Watcher rebuilds it in Rhino, and Channels make the AI assistant legible to a screen
            reader. Everything else either writes to that state or reads from it.
          </p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <figure className="fig pad">
          <img src="/rap-figures/fig-harness-tools.png" alt="Diagram: the Harness at center, connected by live link to the Layout Jig, Rhino, and an accessible TUI; by file hand-off to the PIAF machine and 3D printer; and by manual workflow to a silicone mat, physical models, and a 3D pen; with a camera for image capture." />
          <figcaption>The Harness and its tools — live links (CLI / JSON watcher / Channels), file hand-offs to the tactile printers, and manual studio tools, all organized around the canonical state.</figcaption>
        </figure>
        <p className="pipe-cap">
          The dominant trajectory of AI-assisted CAD keeps the viewport as the source of truth. RAP
          makes the CLI the authoring layer instead — and reduces Rhino to{" "}
          <span className="hl">one renderer among several</span> that consume the canonical state.
          Same inputs → same <code>state.json</code> → same geometry, every time.
        </p>

        <div className="modes">
          <div className="mode">
            <div className="mn">ROLE 1 · QUERIER</div>
            <div className="mt">Ask the model</div>
            <p>&ldquo;How many windows are on the east elevation?&rdquo; — answered from the JSON state, spoken back to verify intent in lieu of viewing.</p>
          </div>
          <div className="mode">
            <div className="mn">ROLE 2 · CODER</div>
            <div className="mt">Edit the model</div>
            <p>The assistant drives RhinoPython to change the state — the student authoring through language and structured commands.</p>
          </div>
          <div className="mode">
            <div className="mn">ROLE 3 · TUTOR</div>
            <div className="mt">Learn the craft</div>
            <p>It teaches the underlying Rhino and RhinoPython concepts, so the assistant is a bridge to self-sufficiency, not a black box.</p>
          </div>
        </div>

        {/* ── FIVE PROPERTIES ──────────────────────────────────────── */}
        <div className="khead" id="properties">
          <h2>The five constitutive properties</h2>
          <p>
            The Controller, the State JSON, the Watcher and Channels, the tactile renderers, and the
            linguistic renderers don&rsquo;t add up to a single tool — they constitute a pattern.
            These five properties are what make it one.
          </p>
        </div>
        <div className="props">
          {PROPS.map((p) => (
            <div className="prop" key={p.n}>
              <div className="pn">{p.n}</div>
              <div className="pc">
                <div className="pt">{p.term}</div>
                <div className="pd">{p.def}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── THE TOOLS ────────────────────────────────────────────── */}
        <div className="khead" id="tools">
          <h2>The tools — renderers and channels</h2>
          <p>
            The capabilities that hang off the canonical state. Each adds commands without touching
            the others, and follows one rule: if it can&rsquo;t be heard, felt, or read by a screen
            reader, it doesn&rsquo;t ship.
          </p>
        </div>

        {TOOLS.map((t) => (
          <article className="tool-entry" key={t.no}>
            <div className="te-text">
              <div className="te-no">{t.no}</div>
              <h3>{t.title}</h3>
              {t.body}
              <p className="te-deliver">{t.runs}</p>
            </div>
            <div className="te-mock" dangerouslySetInnerHTML={{ __html: t.mock }} />
          </article>
        ))}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <figure className="fig">
          <img src="/rap-figures/fig-web-ui-rhino.jpg" alt="Screenshot: an accessible web client showing a navigable chat and a structured state tree beside the Rhino viewport, which displays a tactile axonometric model." />
          <figcaption>The accessible web client — agent turns re-rendered as navigable HTML with a live state tree — beside the Rhino viewport.</figcaption>
        </figure>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <figure className="fig">
          <img src="/rap-figures/fig-image-describer.jpg" alt="Left: a black-and-white photograph of Notre-Dame du Haut. Right: the same image converted to a half-tone dot pattern for tactile printing — tone is preserved, depth is not." />
          <figcaption>Image Describer: a perspective photograph and its half-tone tactile translation — tone survives, depth does not. (Notre-Dame du Haut, Le Corbusier, 1955.)</figcaption>
        </figure>

        {/* ── THE DESK ─────────────────────────────────────────────── */}
        <div className="khead">
          <h2>The Desk — where the loop physically closes</h2>
        </div>
        <div className="desk">
          <p>
            Tactile authorship sits at a workstation the team calls <b>The Desk</b>: an all-in-one
            that co-locates the CLI host, the PIAF printer, a consumer 3D printer, scanning devices,
            and ergonomic analog tools at fixed positions. A print emerges within arm&rsquo;s reach;
            a 3D-printed mass lifts off the bed without changing rooms; the scanner for reading
            classmates&rsquo; work is on the same surface. The loop — author, verify by touch, return
            to the CLI, revise — becomes one continuous bodily routine rather than a walk between
            rooms. It is deliberately low-cost and reproducible: any program can co-locate a PIAF and
            a desktop 3D printer with a CLI workstation, and the rest is mostly software.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <figure className="fig">
          <img src="/rap-figures/fig-desk-reading.jpg" alt="Hands reading raised-line swell-paper drawings and a 3D-printed braille and English legend laid out on a desk." />
          <figcaption>Reading a 3D-printed braille / English legend alongside PIAF swell-paper plans and sections at The Desk.</figcaption>
        </figure>

        {/* ── A WORKING LOOP ───────────────────────────────────────── */}
        <div className="khead">
          <h2>One loop, end to end</h2>
          <p>
            Design a small school, audit it for ADA compliance, and produce something to hold — the
            command, render, print, feel, revise cycle a studio runs, with the medium expanded
            rather than removed.
          </p>
        </div>
        <div className="readout">
          <pre>
{``}<span className="p">{`>> `}</span>{`set bay A bays 6 3                OK: Bay A grid = 6 x 3.
`}<span className="p">{`>> `}</span>{`corridor A width 8               OK: Bay A corridor = 8.0 ft, double-loaded.
`}<span className="p">{`>> `}</span>{`aperture A d1 door x 0 2 3 7     OK: Added door d1 (3.0 ft) to bay A.
`}<span className="p">{`>> `}</span>{`audit                           OK: 2 issues. Door d1 meets ADA min (3.0 ft).
`}<span className="p">{`>> `}</span>{`render                          OK: state_tactile.pdf (Letter, 300 DPI, 28.3%).
`}<span className="p">{`>> `}</span>{`tactile3d export school.stl     OK: 4,218 triangles, 1:200 scale.
`}<span className="c">{`# print on swell paper · heat · read by hand   |   send STL to the printer · hold the model`}</span>{`
`}
          </pre>
        </div>

        {/* ── THE ARGUMENT ─────────────────────────────────────────── */}
        <section className="body" id="argument">
          <div className="khead">
            <h2>The argument</h2>
          </div>
          <p className="first">
            Architectural education is overwhelmingly visual. Studio relies on drawings, models,
            screen-based software, and pin-up critique, and the underlying pedagogy assumes a
            sighted learner — so for a blind or low-vision student, nearly every routine task, from
            drafting to peer review, currently requires sighted mediation. Mainstream CAD and BIM
            tools (Rhino, AutoCAD, Revit, Adobe) tested against the JAWS screen reader are simply
            not compatible. Incorporating non-visual methods is therefore a{" "}
            <span className="hl">precondition, not an accommodation</span>.
          </p>
          <p>
            Prior accessibility work in this domain has been tool-shaped — a tactile graphic
            generator here, an accessible CAD substitute there, an alt-text rubric — each retrofitting
            access onto a pedagogy that itself remains visual. The Harness is different on two
            counts: it is a <em>pattern</em>, coordinating every tool around one sense-agnostic
            representation; and it is an accessibility adaptation of the LLM agent-harness pattern,
            not a parallel substitute that recreates the CAD application.
          </p>
          <p>
            What the blind case revealed is that design authorship in a digital studio doesn&rsquo;t
            have to be coupled to any one channel of perception. Semantic clarity, voice and keyboard
            operability, an auditable state, deterministic output — these aren&rsquo;t accessibility
            features so much as engineering virtues that visual tools abandoned for graphical
            convenience. Building for the case the default toolchain ignores turns out to build
            infrastructure other studios should adopt anyway.
          </p>

          <section className="feature">
            <div className="fl">The wager</div>
            <p>
              Architecture is inherently multi-sensory. <span className="hl">The tools we
              inherited are not.</span>
            </p>
          </section>
        </section>

        {/* ── IMPLICATIONS ─────────────────────────────────────────── */}
        <div className="khead" id="implications">
          <h2>What it means for the studio</h2>
          <p>
            Four implications the blind case surfaced — offered as candidate hypotheses drawn from a
            single case over four semesters, not yet a validated portable practice.
          </p>
        </div>
        <div className="horizon">
          {IMPLICATIONS.map((h) => (
            <div className="hcell" key={h.title}>
              <div className="ht">{h.title}</div>
              <div className="hb">{h.body}</div>
            </div>
          ))}
        </div>

        {/* ── WHAT'S NEXT ──────────────────────────────────────────── */}
        <div className="khead" id="horizon">
          <h2>What&rsquo;s next</h2>
          <p>
            The pattern is built to extend — new renderers and channels plug into the same state. On
            the horizon:
          </p>
        </div>
        <div className="horizon">
          {HORIZON.map((h) => (
            <div className="hcell" key={h.title}>
              <div className="ht">{h.title}</div>
              <div className="hb">{h.body}</div>
            </div>
          ))}
        </div>

        <div className="demo">
          <div className="dl">Now live on this site</div>
          <div className="dt">RAP Studio — drive the pattern from the web</div>
          <p>
            A self-contained <a href="/rap/studio" style={{ color: "#111", fontWeight: 600 }}>RAP Studio</a> now runs in the
            toolkit: a screen-reader-first web tool where you author a design in structured language —
            by typed command, by form, or in plain language to the assistant — watch the canonical{" "}
            <code>state.json</code> update as the source of truth, see it rebuilt live in a 3D viewer and
            as a tactile-style plan, read it back as text and Braille, and export the same{" "}
            <code>state.json</code>, a PIAF swell-paper image, and a 3D-print STL. The state matches the
            real schema, so it round-trips to Rhino through the desktop Watcher.
          </p>
          <p style={{ marginTop: 12 }}>
            <a
              href="/rap/studio"
              className="cta"
              style={{
                display: "inline-block",
                padding: "10px 18px",
                background: "#111",
                color: "#fff",
                textDecoration: "none",
                fontFamily: "var(--font-display),sans-serif",
                textTransform: "uppercase",
                letterSpacing: "-.01em",
                fontWeight: 400,
                borderRadius: 6
              }}
            >
              ▶&nbsp;&nbsp;Open RAP Studio
            </a>
          </p>
        </div>

        {/* ── END ──────────────────────────────────────────────────── */}
        <section className="end">
          <p>
            <b>Radical Accessibility Project</b> — a studio research project at a major public
            university&rsquo;s school of architecture, co-designed with a legally blind undergraduate
            architecture student, its primary user. The work is in progress; code for the Controller,
            Watcher, and image-to-tactile pipeline is to be released open-source on publication.
          </p>
        </section>
      </div>
    </div>
  );
}
