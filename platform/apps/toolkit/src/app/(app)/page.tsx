import Link from "next/link";
import { TOOLKIT_NAV } from "@/lib/toolkit-nav";

// Typography matches the rest of the platform: Archivo Black (the app's
// --font-display, wired in the root layout) for the headings + pills, set
// uppercase, and a readable system sans for the long-form statement body.
// Scoped to the `.di-doc` wrapper.

// The nine tools, each with a tiny inline-SVG mock of how it works and a note on
// where it runs. SVGs are static, trusted markup ported verbatim from the
// teaching statement; injected as-is to keep their (kebab-case) attributes.
type Tool = { no: string; href: string | null; title: string; runs: React.ReactNode; body: React.ReactNode; mock: string };

const TOOLS: Tool[] = [
  {
    no: "01",
    title: "Coach",
    href: "/skills-coach",
    runs: "Runs as — LLM chat behind a proxy, or campus Illinois Chat.",
    body: (
      <p>
        A tutor that refuses to just hand over the answer. A student asks how to do something — loft a
        surface in Rhino, set up a sheet in Revit, structure a portfolio spread — and it first asks them to
        commit to an attempt, then responds to <em>that</em>, correcting and extending rather than lecturing
        into a vacuum. Tuned with real expertise per skill, so the dialogue stays specific. The point is to
        make students articulate their thinking before the tool fills the gap.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 230" role="img" aria-label="Skills coach mock: skill chips and a chat that asks a question back">
      <rect width="640" height="230" fill="#fff"/>
      <g font-family="IBM Plex Sans" font-size="12">
        <rect x="24" y="22" width="62" height="24" rx="12" fill="#111"/><text x="38" y="38" fill="#fff">Rhino</text>
        <rect x="94" y="22" width="58" height="24" rx="12" fill="#f4f4f4" stroke="#ddd"/><text x="106" y="38" fill="#555">Revit</text>
        <rect x="160" y="22" width="62" height="24" rx="12" fill="#f4f4f4" stroke="#ddd"/><text x="172" y="38" fill="#555">Adobe</text>
        <rect x="230" y="22" width="92" height="24" rx="12" fill="#f4f4f4" stroke="#ddd"/><text x="242" y="38" fill="#555">vibe-code</text>
      </g>
      <rect x="24" y="64" width="380" height="56" rx="10" fill="#f4f4f4" stroke="#e0e0e0"/>
      <text x="38" y="88" font-family="IBM Plex Sans" font-size="13.5" fill="#222">Before I answer — what did you expect the</text>
      <text x="38" y="108" font-family="IBM Plex Sans" font-size="13.5" fill="#222">command to do, and what did it do instead?</text>
      <rect x="300" y="132" width="316" height="40" rx="10" fill="#1A45F0"/>
      <text x="316" y="157" font-family="IBM Plex Sans" font-size="13.5" fill="#fff">It returned an open polysurface…</text>
      <rect x="24" y="186" width="592" height="34" rx="6" fill="#fff" stroke="#ddd"/>
      <text x="38" y="208" font-family="IBM Plex Sans" font-size="13.5" fill="#1A45F0">›</text>
      <text x="56" y="208" font-family="IBM Plex Sans" font-size="13.5" fill="#aaa">ask about the selected skill…</text>
    </svg>`
  },
  {
    no: "02",
    title: "Surveyor",
    href: "/site-analysis",
    runs: "Runs as — a web app; pulls open climate, terrain, and zoning data, exports Rhino-ready files.",
    body: (
      <p>
        Turns a real parcel into citable evidence — sun path, prevailing wind, climate, zoning and code,
        hydrology, history — so a student&rsquo;s site claims are <em>sourced</em>, not asserted. Hard data
        is free and cited; AI judgment is tagged for the student to verify. The measured ground, exported
        clean to Rhino before anything gets designed on it.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 230" role="img" aria-label="Surveyor mock: a site parcel under a sun-path arc with prevailing wind and sourced data readouts">
      <rect width="640" height="230" fill="#fff"/>
      <path d="M70 150 L210 122 L250 192 L104 212 Z" fill="#f4f4f4" stroke="#111" stroke-width="1.6"/>
      <text x="78" y="174" font-family="IBM Plex Sans" font-size="11" fill="#777">site</text>
      <path d="M44 150 A170 110 0 0 1 384 150" fill="none" stroke="#e0a000" stroke-width="1.6" stroke-dasharray="4 5"/>
      <circle cx="214" cy="42" r="8" fill="#f0c000" stroke="#111" stroke-width="1.2"/>
      <g stroke="#1A45F0" stroke-width="1.6" fill="#1A45F0"><path d="M300 70 l44 0 m-8 -5 l8 5 l-8 5"/></g>
      <text x="300" y="60" font-family="IBM Plex Sans" font-size="11" fill="#777">prevailing wind</text>
      <g font-family="IBM Plex Sans" font-size="12.5" fill="#111">
        <text x="430" y="98">climate · 6a</text>
        <text x="430" y="126">zoning · R-4</text>
        <text x="430" y="154">slope · 4%</text>
        <text x="430" y="182">creek · 80m</text>
      </g>
      <g font-family="IBM Plex Sans" font-size="10" fill="#1A45F0"><text x="582" y="98">cited</text><text x="582" y="126">cited</text></g>
    </svg>`
  },
  {
    no: "03",
    title: "Eco-Architect",
    href: "/site-design",
    runs: "Runs as — a zero-build web app; exports native Rhino 8 + Grasshopper python.",
    body: (
      <p>
        Push massing and watch the physical consequences move: rotate the building and solar gain shifts;
        raise it and wind exposure and views change. Encode design intent as testable <em>rules</em>, then
        round-trip the same constraints to Rhino 8 / Grasshopper. It makes the link between <em>form</em> and{" "}
        <em>forces</em> legible while a scheme is still soft.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 260" role="img" aria-label="Eco-Architect mock: massing controls, an axonometric box, and performance readouts">
      <rect width="640" height="260" fill="#fff"/>
      <g font-family="IBM Plex Sans" font-size="12" fill="#777">
        <text x="24" y="44">orientation</text><line x1="24" y1="54" x2="200" y2="54" stroke="#ddd" stroke-width="3"/><circle cx="80" cy="54" r="7" fill="#1A45F0"/>
        <text x="24" y="92">height</text><line x1="24" y1="102" x2="200" y2="102" stroke="#ddd" stroke-width="3"/><circle cx="150" cy="102" r="7" fill="#1A45F0"/>
        <text x="24" y="140">glazing</text><line x1="24" y1="150" x2="200" y2="150" stroke="#ddd" stroke-width="3"/><circle cx="120" cy="150" r="7" fill="#1A45F0"/>
      </g>
      <g stroke="#111" stroke-width="1.6" fill="none" stroke-linejoin="round">
        <path d="M300 150 L390 120 L470 150 L380 184 Z" fill="#fff"/>
        <path d="M300 150 L300 210 L380 244 L380 184 Z" fill="#f4f4f4"/>
        <path d="M380 184 L380 244 L470 210 L470 150 Z" fill="#fafafa"/>
      </g>
      <circle cx="520" cy="92" r="9" fill="#f0c000" stroke="#111" stroke-width="1.2"/>
      <text x="500" y="76" font-family="IBM Plex Sans" font-size="11" fill="#777">sun</text>
      <g font-family="IBM Plex Sans" font-size="12" fill="#111">
        <text x="300" y="232" fill="#777">solar</text><rect x="300" y="238" width="80" height="6" fill="#e0a000"/>
        <text x="400" y="232" fill="#777">wind</text><rect x="400" y="238" width="50" height="6" fill="#111"/>
        <text x="470" y="232" fill="#777">view</text><rect x="470" y="238" width="95" height="6" fill="#111"/>
      </g>
    </svg>`
  },
  {
    no: "04",
    title: "Cartographer",
    href: "/skills-pathways",
    runs: "Runs as — a static map + video library; no sign-in.",
    body: (
      <p>
        A trail map of 2D and 3D skills from beginner to advanced. Each step opens a tutorial video and the
        shared concept notes, with &ldquo;builds on / leads to&rdquo; links and a hand-off to Coach when a
        student gets stuck. It charts <em>what</em> to learn and in what order; Coach is the tutor for the
        learning itself.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 200" role="img" aria-label="Cartographer mock: a beginner-to-advanced node trail with a tutorial video">
      <rect width="640" height="200" fill="#fff"/>
      <g font-family="IBM Plex Sans" font-size="11" fill="#777"><text x="60" y="40">BEGINNER</text><text x="514" y="40">ADVANCED</text></g>
      <line x1="90" y1="104" x2="552" y2="104" stroke="#ddd" stroke-width="2"/>
      <g fill="#1A45F0"><circle cx="90" cy="104" r="9"/><circle cx="244" cy="104" r="9"/></g>
      <g fill="#fff" stroke="#111" stroke-width="1.6"><circle cx="398" cy="104" r="9"/><circle cx="552" cy="104" r="9"/></g>
      <g font-family="IBM Plex Sans" font-size="12" fill="#111">
        <text x="72" y="140">Lines</text><text x="214" y="140">Surfaces</text><text x="372" y="140">Solids</text><text x="508" y="140">Grasshopper</text>
      </g>
      <rect x="214" y="50" width="60" height="30" rx="6" fill="#111"/>
      <path d="M226 58 l10 7 l-10 7 Z" fill="#fff"/>
      <text x="240" y="69" font-family="IBM Plex Sans" font-size="10.5" fill="#fff">video</text>
      <line x1="244" y1="80" x2="244" y2="95" stroke="#111" stroke-width="1.4"/>
    </svg>`
  },
  {
    no: "03",
    title: "Librarian",
    href: "/librarian",
    runs: "Runs as — a local app (Claude Code), filesystem-based.",
    body: (
      <p>
        The studio&rsquo;s shared memory for references. A student drops in an image they found and gets it
        identified and contextualized — architect, project, the moves worth borrowing — and it accrues into
        a searchable class library of images and texts, tagged and cross-linked. Built as a local app over
        the filesystem (Obsidian-compatible), so the archive stays portable and inspectable rather than
        locked in someone&rsquo;s cloud.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 250" role="img" aria-label="Librarian mock: a search bar and a grid of tagged precedent thumbnails">
      <rect width="640" height="250" fill="#fff"/>
      <rect x="24" y="22" width="430" height="34" rx="6" fill="#fff" stroke="#ddd"/>
      <text x="38" y="44" font-family="IBM Plex Sans" font-size="13.5" fill="#aaa">search name, architect, or theme…</text>
      <text x="470" y="44" font-family="IBM Plex Sans" font-size="12" fill="#888">local · obsidian</text>
      <g>
        <rect x="24" y="74" width="140" height="78" fill="#eef0f2" stroke="#ddd"/><rect x="180" y="74" width="140" height="78" fill="#f1ece6" stroke="#ddd"/><rect x="336" y="74" width="140" height="78" fill="#eaf0ec" stroke="#ddd"/><rect x="492" y="74" width="124" height="78" fill="#efeef2" stroke="#ddd"/>
        <rect x="24" y="166" width="140" height="60" fill="#f1ece6" stroke="#ddd"/><rect x="180" y="166" width="140" height="60" fill="#eaf0ec" stroke="#ddd"/><rect x="336" y="166" width="140" height="60" fill="#eef0f2" stroke="#ddd"/><rect x="492" y="166" width="124" height="60" fill="#f4ecf0" stroke="#ddd"/>
      </g>
      <g font-family="IBM Plex Sans" font-size="10.5" fill="#777">
        <text x="30" y="170">stone · section</text><text x="186" y="170">concrete · light</text><text x="342" y="170">brick · court</text>
      </g>
    </svg>`
  },
  {
    no: "05",
    title: "RAP",
    href: "/rap",
    runs: (
      <>
        Runs as — local + CLI, open-source ·{" "}
        <a href="https://github.com/johnnysclark/Radical-Accessibility-Toolkit" target="_blank" rel="noopener noreferrer">
          repository
        </a>
      </>
    ),
    body: (
      <p>
        The Radical Accessibility Project: making architectural production work without sight. It drives
        Rhino from the command line, generates tactile drawings (PIAF swell paper) and 3D-printed reliefs,
        reads plan and section aloud as spatial audio, and writes structured alt-text. Built local-first and
        open-source so anyone can replicate it, and developed with a blind co-researcher, its
        primary user. The constraints it surfaces sharpen spatial description for every student, not only
        blind ones.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 180" role="img" aria-label="RAP mock: a CLI to JSON to Rhino pipeline branching to tactile, audio, and alt-text">
      <rect width="640" height="180" fill="#fff"/>
      <g font-family="IBM Plex Sans" font-size="13" fill="#111">
        <rect x="24" y="30" width="96" height="40" rx="4" fill="#111"/><text x="50" y="55" fill="#fff">CLI</text>
        <rect x="160" y="30" width="96" height="40" rx="4" fill="#f4f4f4" stroke="#ddd"/><text x="186" y="55">JSON</text>
        <rect x="296" y="30" width="96" height="40" rx="4" fill="#f4f4f4" stroke="#ddd"/><text x="316" y="55">Rhino</text>
      </g>
      <g stroke="#111" stroke-width="1.4" fill="#111">
        <path d="M120 50 l30 0 m-6 -4 l6 4 l-6 4"/>
        <path d="M256 50 l30 0 m-6 -4 l6 4 l-6 4"/>
        <path d="M344 70 L344 104 m-4 -6 l4 6 l4 -6" fill="none"/>
      </g>
      <g font-family="IBM Plex Sans" font-size="12" fill="#333">
        <rect x="220" y="112" width="116" height="34" rx="4" fill="#fff" stroke="#ddd"/><text x="236" y="134">Tactile (PIAF)</text>
        <rect x="352" y="112" width="100" height="34" rx="4" fill="#fff" stroke="#ddd"/><text x="368" y="134">Spatial audio</text>
        <rect x="468" y="112" width="92" height="34" rx="4" fill="#fff" stroke="#ddd"/><text x="484" y="134">Alt-text</text>
      </g>
      <path d="M344 112 L290 112 M344 112 L402 112 M344 112 L512 112" stroke="#ccc" fill="none"/>
    </svg>`
  },
  {
    no: "06",
    title: "2D Tooling",
    href: "/media-2d",
    runs: "Runs as — vision models for cleanup, deterministic paths for fabrication.",
    body: (
      <p>
        A bench of single-purpose widgets for the parts of studio production that currently mean opening
        Photoshop and remembering a workflow: thresholding and vectorizing a scanned or rendered drawing,
        using a live camera as a scale and reference overlay, and prepping geometry for laser cutting. Each
        does one job and gets out of the way.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 150" role="img" aria-label="2D media tools mock: cleanup, live video, and fabrication panels">
      <rect width="640" height="150" fill="#fff"/>
      <rect x="24" y="24" width="184" height="102" rx="4" fill="#fafafa" stroke="#e0e0e0"/>
      <path d="M44 96 q18 -40 36 0 t36 0 t36 0" fill="none" stroke="#bbb" stroke-width="1.2"/>
      <line x1="44" y1="74" x2="188" y2="74" stroke="#111" stroke-width="1.6"/>
      <text x="40" y="116" font-family="IBM Plex Sans" font-size="12" fill="#555">cleanup</text>
      <rect x="228" y="24" width="184" height="102" rx="4" fill="#fafafa" stroke="#e0e0e0"/>
      <rect x="262" y="48" width="116" height="56" fill="#fff" stroke="#111"/><circle cx="320" cy="76" r="13" fill="none" stroke="#111"/>
      <text x="244" y="116" font-family="IBM Plex Sans" font-size="12" fill="#555">live video</text>
      <rect x="432" y="24" width="184" height="102" rx="4" fill="#fafafa" stroke="#e0e0e0"/>
      <path d="M470 50 L580 50 L580 100 L470 100 Z" fill="none" stroke="#111" stroke-dasharray="5 4"/>
      <line x1="470" y1="50" x2="580" y2="100" stroke="#1A45F0"/>
      <text x="448" y="116" font-family="IBM Plex Sans" font-size="12" fill="#555">fabrication</text>
    </svg>`
  },
  {
    no: "07",
    title: "Archivist",
    href: "/pinup",
    runs: "Runs as — a web app with a backend (Supabase) and accounts.",
    body: (
      <p>
        A pin-up wall with memory, built to replace Miro for weekly process work. It&rsquo;s organized the way
        the studio actually runs — sections per TA, rows per student, columns per day — so the week&rsquo;s
        drawings are legible at a glance, peers can react and comment, and the metadata underneath shows
        who&rsquo;s engaging and who&rsquo;s gone quiet. Designed for real load: hundreds of students posting
        every week.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 270" role="img" aria-label="Digital wall mock: a grid with TA sections, student rows, and day columns">
      <rect width="640" height="270" fill="#fff"/>
      <g font-family="IBM Plex Sans" font-size="11" fill="#777">
        <text x="150" y="34">Mon</text><text x="248" y="34">Tue</text><text x="346" y="34">Wed</text><text x="444" y="34">Thu</text><text x="542" y="34">Fri</text>
      </g>
      <line x1="118" y1="44" x2="616" y2="44" stroke="#e4e4e4"/>
      <g font-family="IBM Plex Sans" font-size="11" fill="#111">
        <text x="20" y="62" font-size="10" fill="#999" letter-spacing="1">TA · PRIYA</text>
        <text x="24" y="92">Ana</text><text x="24" y="132">Dev</text>
        <text x="20" y="160" font-size="10" fill="#999" letter-spacing="1">TA · MARCUS</text>
        <text x="24" y="190">Lin</text><text x="24" y="230">Omar</text>
      </g>
      <line x1="118" y1="70" x2="616" y2="70" stroke="#f0f0f0"/>
      <line x1="118" y1="168" x2="616" y2="168" stroke="#f0f0f0"/>
      <g>
        <rect x="130" y="76" width="44" height="34" fill="#eef0f2" stroke="#e0e0e0"/><rect x="228" y="76" width="44" height="34" fill="#f1ece6" stroke="#e0e0e0"/><rect x="326" y="76" width="44" height="34" fill="#eef0f2" stroke="#e0e0e0"/><rect x="424" y="76" width="44" height="34" fill="#eaf0ec" stroke="#e0e0e0"/>
        <rect x="130" y="116" width="44" height="34" fill="#f1ece6" stroke="#e0e0e0"/><rect x="228" y="116" width="44" height="34" fill="#eef0f2" stroke="#e0e0e0"/><rect x="424" y="116" width="44" height="34" fill="#efeef2" stroke="#e0e0e0"/><rect x="522" y="116" width="44" height="34" fill="#eaf0ec" stroke="#e0e0e0"/>
        <rect x="130" y="174" width="44" height="34" fill="#eaf0ec" stroke="#e0e0e0"/><rect x="326" y="174" width="44" height="34" fill="#f1ece6" stroke="#e0e0e0"/><rect x="522" y="174" width="44" height="34" fill="#eef0f2" stroke="#e0e0e0"/>
        <rect x="130" y="214" width="44" height="34" fill="#efeef2" stroke="#e0e0e0"/><rect x="228" y="214" width="44" height="34" fill="#eaf0ec" stroke="#e0e0e0"/><rect x="326" y="214" width="44" height="34" fill="#eef0f2" stroke="#e0e0e0"/><rect x="424" y="214" width="44" height="34" fill="#f1ece6" stroke="#e0e0e0"/>
      </g>
    </svg>`
  },
  {
    no: "08",
    title: "Critic",
    href: "/design-critic",
    runs: "Runs as — LLM behind a proxy; each persona is a system prompt.",
    body: (
      <p>
        A sparring partner, explicitly not a verdict. It adopts a critical persona — a tectonic reading, a
        social one, a formal one — and gives the lay of the land so a student can find blind spots before
        review. The caution is built into the framing: one synthetic position among many, to be weighed
        against a range of human critics, never substituted for them.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 210" role="img" aria-label="Design critic mock: a lens selector, a critique block, and a caution tag">
      <rect width="640" height="210" fill="#fff"/>
      <rect x="24" y="22" width="320" height="36" rx="6" fill="#fff" stroke="#ddd"/>
      <text x="38" y="45" font-family="IBM Plex Sans" font-size="13.5" fill="#222">Lens — the Tectonic critic ▾</text>
      <rect x="356" y="22" width="160" height="36" rx="6" fill="#f4ede6" stroke="#e6c79b"/>
      <text x="370" y="45" font-family="IBM Plex Sans" font-size="12" fill="#8a5a1a">⚠ one position only</text>
      <rect x="24" y="74" width="6" height="112" fill="#7A3E8E"/>
      <g font-family="IBM Plex Sans" font-size="13.5" fill="#222">
        <text x="44" y="94">You're showing a form, but I can't read how</text>
        <text x="44" y="116">it's held up. Where does load go? Draw the</text>
        <text x="44" y="138">structure now — half these moves will change.</text>
        <text x="44" y="168" fill="#888" font-size="12">What's the span, and what's carrying it?</text>
      </g>
    </svg>`
  },
  {
    no: "09",
    title: "3D Tooling",
    href: "/tools-3d",
    runs: "Runs as — Rhino-coupled, plus a static web viewer.",
    body: (
      <p>
        On-ramps for students moving from model to machine and to the web: generating and explaining Rhino /
        Grasshopper Python, dropping a model into a shareable Three.js viewer for the portfolio site, and
        dialing in 3D-print and PIAF presets — with short, task-shaped tutorials that assume you&rsquo;ll
        deviate.
      </p>
    ),
    mock: `<svg viewBox="0 0 640 160" role="img" aria-label="3D tools mock: a wireframe cube with on-ramp labels">
      <rect width="640" height="160" fill="#fff"/>
      <g stroke="#111" stroke-width="1.4" fill="none">
        <path d="M64 60 L150 40 L150 110 L64 130 Z"/>
        <path d="M64 60 L120 78 L206 58 L150 40"/>
        <path d="M120 78 L120 148 L64 130"/>
        <path d="M120 148 L206 128 L206 58"/>
        <path d="M150 110 L206 128" stroke-dasharray="3 3"/>
      </g>
      <g font-family="IBM Plex Sans" font-size="13" fill="#222">
        <rect x="280" y="36" width="120" height="28" rx="4" fill="#f4f4f4" stroke="#ddd"/><text x="296" y="55">Python</text>
        <rect x="280" y="72" width="120" height="28" rx="4" fill="#f4f4f4" stroke="#ddd"/><text x="296" y="91">Three.js viewer</text>
        <rect x="416" y="36" width="160" height="28" rx="4" fill="#f4f4f4" stroke="#ddd"/><text x="432" y="55">3D-print / PIAF</text>
        <rect x="416" y="72" width="160" height="28" rx="4" fill="#f4f4f4" stroke="#ddd"/><text x="432" y="91">Tutorials</text>
      </g>
    </svg>`
  }
];

const STYLES = `
.di-doc{ color:#141414; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; font-size:17px; line-height:1.62; -webkit-font-smoothing:antialiased; }
.di-doc h1,.di-doc h2,.di-doc h3{ font-family:var(--font-display),ui-sans-serif,system-ui,sans-serif; color:#111; margin:0; font-weight:400; text-transform:uppercase; letter-spacing:-.01em; }
.di-doc a{ color:#1A45F0; }
.di-doc em{ font-style:italic; }
.di-doc .wrap{ max-width:760px; margin:0 auto; }

.di-doc header{ border-bottom:2px solid #111; padding:2px 0 22px; }
.di-doc .kicker{ font-size:13px; letter-spacing:.16em; text-transform:uppercase; color:#666; }
.di-doc header h1{ font-size:clamp(26px,4.2vw,38px); line-height:1.04; letter-spacing:-.02em; margin-top:12px; font-weight:400; }
.di-doc .byline{ font-size:15.5px; color:#444; margin-top:13px; }
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

.di-doc .khead{ border-top:2px solid #111; margin-top:44px; padding-top:15px; margin-bottom:10px; }
.di-doc .khead h2{ font-size:24px; letter-spacing:-.01em; }
.di-doc .khead p{ font-size:15px; color:#555; margin:7px 0 0; max-width:60ch; }

.di-doc .tool-entry{ display:grid; grid-template-columns:minmax(0,1.08fr) minmax(0,1fr); gap:28px; align-items:center; padding:26px 0; border-top:1px solid #ededed; }
.di-doc .tool-entry:first-of-type{ border-top:none; }
.di-doc .te-no{ font-family:var(--font-display),sans-serif; font-size:13px; color:#bbb; letter-spacing:.04em; margin-bottom:4px; }
.di-doc .te-text h3{ font-size:20px; line-height:1.14; margin:0 0 9px; }
.di-doc .te-link{ color:inherit; text-decoration:none; }
.di-doc .te-link:hover{ text-decoration:underline; text-underline-offset:3px; text-decoration-thickness:2px; }
.di-doc .te-link span{ color:#1A45F0; }
.di-doc .te-text p{ font-size:15.5px; line-height:1.56; color:#2e2e2e; margin:0; }
.di-doc .te-deliver{ font-size:12.5px; color:#8a8a8a; margin-top:11px; letter-spacing:.01em; }
.di-doc .te-deliver a{ color:#1A45F0; }
.di-doc .te-mock{ border:1px solid #e2e2e2; border-radius:4px; background:#fff; overflow:hidden; }
.di-doc .te-mock svg{ display:block; width:100%; height:auto; }

.di-doc .body p{ font-size:17px; line-height:1.72; margin:0 0 18px; color:#1a1a1a; max-width:64ch; }
.di-doc .body p.first{ font-size:19px; line-height:1.58; color:#111; }

.di-doc .feature{ border-top:2px solid #111; border-bottom:2px solid #111; padding:28px 0; margin:28px 0 0; }
.di-doc .feature .fl{ font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#888; margin-bottom:13px; }
.di-doc .feature p{ font-weight:700; font-size:21px; line-height:1.36; letter-spacing:-.005em; color:#111; margin:0; }

.di-doc .build h3{ font-family:var(--font-display),sans-serif; font-weight:400; font-size:16px; margin:26px 0 6px; color:#111; }
.di-doc .build p{ font-size:16.5px; line-height:1.64; margin:0 0 12px; color:#1f1f1f; max-width:64ch; }
.di-doc .stack-table{ width:100%; border-collapse:collapse; margin:16px 0 8px; font-size:14px; background:#fff; }
.di-doc .stack-table th,.di-doc .stack-table td{ text-align:left; vertical-align:top; padding:10px 12px; border-bottom:1px solid #e8e8e8; }
.di-doc .stack-table th{ font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#888; font-weight:500; border-bottom:1px solid #ccc; }
.di-doc .stack-table td:first-child{ font-weight:500; color:#111; white-space:nowrap; }
.di-doc .stack-table td{ color:#333; }
.di-doc .glance-note{ font-size:12px; color:#888; margin-top:4px; }

.di-doc .end{ border-top:2px solid #111; margin-top:42px; padding:22px 0 10px; }
.di-doc .end p{ font-size:14.5px; color:#555; margin:0 0 9px; max-width:62ch; }

@media (max-width:720px){
  .di-doc .tool-entry{ grid-template-columns:1fr; gap:14px; }
  .di-doc .glance{ grid-template-columns:1fr; }
  .di-doc .gcell{ border-right:none; border-bottom:1px solid #ededed; }
  .di-doc .gcell:last-child{ border-bottom:none; }
}
@media (max-width:560px){
  .di-doc .stack-table thead{ display:none; }
  .di-doc .stack-table, .di-doc .stack-table tbody, .di-doc .stack-table tr, .di-doc .stack-table td{ display:block; width:100%; }
  .di-doc .stack-table tr{ border:1px solid #e8e8e8; border-radius:4px; margin-bottom:10px; padding:6px 12px; }
  .di-doc .stack-table td{ border:none; padding:7px 0; }
  .di-doc .stack-table td::before{ content:attr(data-label); display:block; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:#999; margin-bottom:3px; }
  .di-doc .stack-table td:first-child{ font-size:16px; }
}

/* Site rule — all text is black, never grey. (SVG mocks keep their own fills.) */
.di-doc, .di-doc *:not(a){ color:#111 !important; }
.di-doc a{ color:#1A45F0 !important; }
.di-doc .te-link{ color:#111 !important; }
.di-doc .te-link span{ color:#1A45F0 !important; }
`;

export default function Overview() {
  // Show the tool cards in the SAME order as the left sidebar; any card with no
  // matching tool page (href:null) sorts to the end.
  const navIndex = Object.fromEntries(TOOLKIT_NAV.map((t, i) => [t.href, i]));
  const orderedTools = [...TOOLS].sort(
    (a, b) => (a.href ? navIndex[a.href] ?? 999 : 999) - (b.href ? navIndex[b.href] ?? 999 : 999)
  );

  return (
    <div className="di-doc">
      <style>{STYLES}</style>

      <div className="wrap">
        <header>
          <h1>Agentic Design Studio Instruments</h1>
          <p className="byline">
            <b>John Clark</b> — Teaching Assistant Professor · 1st–3rd year undergraduate design studios
          </p>
        </header>

        <section className="exec">
          <p className="sum">
            Studio students often can&rsquo;t yet defend their designs with rigor. This is a plan to change
            that by teaching them to work with agentic coding tools —{" "}
            <span className="hl">
              instruments that supply the logics, language, and data behind a judgment while leaving the
              judgment to the student
            </span>
            . I&rsquo;ve built nine such tools with Claude Code, covering site analysis, precedent research,
            skills coaching, critique, portfolio narrative, studio culture, and accessibility. They&rsquo;re
            taught inside studio sequences and a short series of agentic-coding workshops, in a &ldquo;trust
            but verify&rdquo; stance that values iteration and edge-case hunting over fluent-sounding answers.
          </p>
          <div className="glance">
            <div className="gcell">
              <div className="gk">What</div>
              <div className="gv">Nine AI tools for the design studio, built in Claude Code.</div>
            </div>
            <div className="gcell">
              <div className="gk">How it&rsquo;s taught</div>
              <div className="gv">Inside studios plus agentic-coding workshops — trust but verify.</div>
            </div>
            <div className="gcell">
              <div className="gk">The open question</div>
              <div className="gv">When to offload thinking to a tool, and when to build the skill the slow way.</div>
            </div>
          </div>
        </section>

        <div className="khead">
          <h2>The toolkit, in examples</h2>
          <p>
            Nine tools, each with a simple mock of how it works and a note on where it runs. Fuller context
            is in the statement below.
          </p>
        </div>

        {orderedTools.map((t, i) => (
          <article className="tool-entry" key={t.title}>
            <div className="te-text">
              <div className="te-no">{String(i + 1).padStart(2, "0")}</div>
              <h3>
                {t.href ? (
                  <Link href={t.href} className="te-link">
                    {t.title} <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  t.title
                )}
              </h3>
              {t.body}
              <p className="te-deliver">{t.runs}</p>
            </div>
            <div className="te-mock" dangerouslySetInnerHTML={{ __html: t.mock }} />
          </article>
        ))}

        <section className="body">
          <div className="khead">
            <h2>The statement, in full</h2>
          </div>
          <p className="first">
            Studio students often can&rsquo;t yet justify their designs with rigor — whether they&rsquo;re
            reasoning from site-specific environmental forces, historical precedent, or creative form
            generation. Our job as studio teachers is to sharpen their reasoning, synthesis, and analysis:
            of a real-world site, and of the buildings they invent for it. Agentic coding tools — AI that
            writes and runs its own code — can help, giving students the{" "}
            <span className="hl">logics, language, and data</span> to make more sophisticated judgments and
            putting computational analysis within reach for the first time. Design thinking is already an
            iterative system — ask questions, gather information and expertise, then form that material into
            built and unbuilt proposals — which is exactly the disposition these tools reward. That&rsquo;s
            why the studio is the natural place to teach them.
          </p>
          <p>
            I&rsquo;ll work in two registers: demonstrating the more sophisticated tools I&rsquo;ve built and
            giving students access to them, and vibe-coding simpler tools together with the class. I expect
            both to become as ubiquitous as the proprietary software students already run in school and
            practice. What I want them to learn is a stance —{" "}
            <span className="hl">move quickly, but iterate in a &ldquo;trust but verify&rdquo; loop</span> that
            hunts for edge cases and failure modes, and brainstorm with these tools fluidly but skeptically.
            I&rsquo;ll introduce them inside studio sequences and run a short series of
            agentic-coding-for-design workshops, since it takes a few sessions to bring students — and
            colleagues — up to speed. (For colleagues moving from chatbots to Claude Code or Codex who want
            real control over a model&rsquo;s inputs, outputs, memory, and behavior, I&rsquo;m glad to help,
            starting with the idea of an <em>agent harness</em> for guiding a model with more clarity.)
          </p>
          <p>
            The learning objective is the same as any studio&rsquo;s: students can explain both the final
            design and the process that produced it. Teaching students to work with AI follows the same
            tenets as teaching them to be resilient designers — which is why building these tools should
            reinforce the core of the studio rather than replace it. The toolkit is detailed in the examples
            above — a production tutor, a site analyzer and form generator, a precedent librarian, a
            portfolio coach, the RAP accessibility toolkit, drawing and fabrication widgets, a studio pin-up
            wall, a design critic, and a set of 3D on-ramps — each at some stage of production, all built
            with Claude Code.
          </p>

          <section className="feature">
            <div className="fl">The question I&rsquo;m putting to the group</div>
            <p>
              How do we reinforce design thinking while teaching AI literacy? Specifically: how do we teach
              students to iterate, to hunt for edge cases, and to judge when to productively offload
              cognition to a tool versus when to double down on the old-school, analog repetition that
              actually builds the neurons?
            </p>
          </section>
        </section>

        <section className="build">
          <div className="khead">
            <h2>Appendix — how it was built</h2>
            <p>
              For colleagues thinking about doing the same. None of this requires being a programmer; it
              requires being willing to direct one.
            </p>
          </div>

          <h3>Built with Claude Code, not a chatbot</h3>
          <p>
            These tools weren&rsquo;t typed out by hand. They were built with Claude Code — an agentic coding
            tool you direct in plain language from the command line. The difference from a chatbot is
            control: instead of copying snippets out of a chat window, the agent reads your files, writes
            code, runs it, sees the errors, and fixes them, in a loop. You stay the author and editor; the
            agent does the typing. That is what vibe-coding means in practice, and it is why a studio teacher
            can ship working tools without a CS degree.
          </p>

          <h3>Where each tool runs</h3>
          <p>
            The single most important thing to understand is that these aren&rsquo;t one app. They fall into
            a few buckets, and the bucket — not the idea — decides how, and whether, you host it.
          </p>
          <table className="stack-table">
            <thead>
              <tr>
                <th>Kind of tool</th>
                <th>Where it runs</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Kind of tool">Static web</td>
                <td data-label="Where it runs">Any static host — Vercel, Netlify, GitHub Pages (free)</td>
                <td data-label="Why">No saved data, no secrets; it just runs in the browser.</td>
              </tr>
              <tr>
                <td data-label="Kind of tool">LLM-backed</td>
                <td data-label="Where it runs">A web page plus a tiny serverless function</td>
                <td data-label="Why">
                  The API key can&rsquo;t live in browser code — the function holds it, proxies the calls,
                  and caps spend.
                </td>
              </tr>
              <tr>
                <td data-label="Kind of tool">Local app</td>
                <td data-label="Where it runs">A small Node / Python server on your own machine</td>
                <td data-label="Why">
                  The filesystem is the source of truth (Obsidian-compatible); nothing to host at all.
                </td>
              </tr>
              <tr>
                <td data-label="Kind of tool">Web app + backend</td>
                <td data-label="Where it runs">A frontend host plus Supabase (Postgres, auth, storage)</td>
                <td data-label="Why">
                  Needs accounts and saved data — e.g. hundreds of students posting weekly.
                </td>
              </tr>
              <tr>
                <td data-label="Kind of tool">Rhino-coupled</td>
                <td data-label="Where it runs">Distributed as a script, run inside Rhino / Grasshopper</td>
                <td data-label="Why">It drives desktop software; an MCP server bridges the agent to Rhino.</td>
              </tr>
            </tbody>
          </table>
          <p className="glance-note">
            The &ldquo;runs as&rdquo; line under each tool above tells you which bucket it is in.
          </p>

          <h3>The trap worth naming: API keys</h3>
          <p>
            Any tool that calls an AI model has a key, and that key is money. It can never sit in code
            running in a student&rsquo;s browser — someone will find it and run up the bill in a weekend. The
            fix is a thin server function between the student and the model that holds the key, limits the
            rate, and sets a hard spend cap. The same layer is where FERPA lives: the moment a tool stores
            student work or sends it to an outside model, you owe students an honest account of where it
            goes. There&rsquo;s also an equity edge — a shared campus key is fair but costs the department;
            asking students to bring their own is cheaper but regressive.
          </p>

          <h3>Trust but verify, and agent harnesses</h3>
          <p>
            The build method is the same stance I want students to learn: get something running, then
            deliberately try to break it — the weird input, the empty case, the edge it wasn&rsquo;t designed
            for. The agent is fast and confident and often wrong, so its output is a first draft to be
            checked, never a final answer. Once you outgrow the chat box, the next concept is the agent
            harness: the scaffolding — memory, the tools it&rsquo;s allowed to call, the rules it must follow
            — you wrap around a model to make its behavior predictable instead of improvised.
          </p>
        </section>

        <section className="end">
          <p>
            The panels above are simple static mocks; the live tools run in this toolkit and their own
            repos. Use the sidebar — or the &ldquo;Live now&rdquo; links up top — to open the ones that are
            ready.
          </p>
        </section>
      </div>
    </div>
  );
}
