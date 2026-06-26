// Skills Pathways — inline SVG concept diagrams for the step modal, keyed by
// node id. Trusted, hand-authored static markup, rendered via
// dangerouslySetInnerHTML (the same pattern as the Overview tool mocks). Kept
// separate from pathways.ts so diagrams can be added incrementally.
//
// House style: a 600x240 viewBox, white ground, #111 line work (≈1.6 stroke),
// ONE #ff3b21 accent per diagram, light-grey fills, small system-sans labels.
// Use the D() helper so every diagram shares the ground, sizing, and font.

const D = (body: string): string =>
  `<svg viewBox="0 0 600 240" style="display:block;width:100%;height:auto" font-family="ui-sans-serif, system-ui, sans-serif"><rect width="600" height="240" fill="#fff"/>${body}</svg>`;

const cap = (x: number, t: string): string =>
  `<text x="${x}" y="40" font-size="11" fill="#bbb" letter-spacing="1.5">${t}</text>`;

export const DIAGRAMS: Record<string, string> = {
  // ── Design Concepts & Theory ─────────────────────────────────────────────
  "dt-elements": D(`${cap(40, "FORMAL ELEMENTS")}
    <g stroke="#111" stroke-width="1.6" fill="none" stroke-linejoin="round">
      <circle cx="95" cy="110" r="5" fill="#111"/>
      <line x1="205" y1="84" x2="285" y2="134"/>
      <path d="M345 130 L420 96 L470 116 L395 150 Z" fill="#f4f4f4"/>
      <path d="M520 84 L548 100 L520 116 L492 100 Z" fill="#f4f4f4"/>
      <path d="M492 100 L520 116 L520 150 L492 134 Z" fill="#fff"/>
      <path d="M520 116 L548 100 L548 134 L520 150 Z" fill="#fafafa"/>
    </g>
    <g font-size="12.5" fill="#777" text-anchor="middle">
      <text x="95" y="186">point</text><text x="245" y="186">line</text>
      <text x="407" y="186">plane</text><text x="520" y="186">volume</text>
    </g>`),

  "dt-ordering": D(`${cap(40, "ORDERING")}
    <line x1="300" y1="70" x2="300" y2="186" stroke="#ff3b21" stroke-width="1.4" stroke-dasharray="5 4"/>
    <text x="300" y="206" font-size="11.5" fill="#ff3b21" text-anchor="middle">axis</text>
    <g stroke="#111" stroke-width="1.4" fill="#f4f4f4">
      <rect x="120" y="120" width="34" height="34"/>
      <rect x="186" y="104" width="50" height="50"/>
      <rect x="270" y="86" width="60" height="68"/>
      <rect x="364" y="104" width="50" height="50"/>
      <rect x="446" y="120" width="34" height="34"/>
    </g>
    <text x="300" y="172" font-size="12.5" fill="#777" text-anchor="middle" dy="2"></text>
    <text x="160" y="232" font-size="12" fill="#999" text-anchor="middle">rhythm + hierarchy about a datum</text>`),

  "dt-precedent": D(`${cap(40, "READING PRECEDENT")}
    <g stroke="#111" stroke-width="1.5" fill="none">
      <path d="M90 150 L90 100 L140 70 L190 100 L190 150 Z" fill="#f4f4f4"/>
      <line x1="90" y1="150" x2="190" y2="150"/>
      <rect x="108" y="116" width="20" height="34" fill="#fff"/>
      <rect x="152" y="116" width="20" height="20" fill="#fff"/>
    </g>
    <text x="140" y="178" font-size="12" fill="#777" text-anchor="middle">a building</text>
    <path d="M232 110 l64 0 m-10 -7 l10 7 l-10 7" stroke="#ff3b21" stroke-width="1.6" fill="none"/>
    <text x="264" y="92" font-size="11.5" fill="#ff3b21" text-anchor="middle">analyze</text>
    <g stroke="#111" stroke-width="1.5" fill="none">
      <rect x="360" y="86" width="150" height="78" fill="#fafafa"/>
      <line x1="435" y1="86" x2="435" y2="164" stroke-dasharray="4 4"/>
      <circle cx="395" cy="125" r="6"/>
      <path d="M455 110 l30 0 m-6 -5 l6 5 l-6 5"/>
    </g>
    <text x="435" y="190" font-size="12" fill="#777" text-anchor="middle">its moves, redrawn</text>`),

  "dt-parti": D(`${cap(40, "PARTI · THE BIG IDEA")}
    <g stroke="#111" stroke-width="1.6" fill="#f4f4f4">
      <rect x="170" y="84" width="110" height="92"/>
      <rect x="320" y="84" width="110" height="92"/>
    </g>
    <rect x="284" y="84" width="32" height="92" fill="#ff3b21"/>
    <text x="300" y="200" font-size="12.5" fill="#777" text-anchor="middle">one move = the whole scheme</text>
    <text x="300" y="222" font-size="11.5" fill="#999" text-anchor="middle">explained in a sentence + a sketch</text>`),

  "dt-scale-body": D(`${cap(40, "SCALE & THE BODY")}
    <line x1="60" y1="178" x2="540" y2="178" stroke="#111" stroke-width="1.4"/>
    <g stroke="#111" stroke-width="1.5" fill="none">
      <circle cx="210" cy="98" r="11"/>
      <line x1="210" y1="109" x2="210" y2="150"/>
      <line x1="210" y1="120" x2="192" y2="138"/><line x1="210" y1="120" x2="228" y2="138"/>
      <line x1="210" y1="150" x2="196" y2="178"/><line x1="210" y1="150" x2="224" y2="178"/>
    </g>
    <g stroke="#ff3b21" stroke-width="1.4" fill="none">
      <line x1="300" y1="76" x2="300" y2="178"/>
      <path d="M296 80 l4 -6 l4 6"/><path d="M296 174 l4 6 l4 -6"/>
    </g>
    <text x="320" y="128" font-size="12" fill="#ff3b21">~ door, ceiling, stair</text>
    <rect x="300" y="76" width="180" height="102" fill="none" stroke="#111" stroke-width="1.4"/>
    <text x="270" y="212" font-size="12" fill="#777" text-anchor="middle">design against the figure</text>`),

  "dt-site-context": D(`${cap(40, "SITE & CONTEXT")}
    <rect x="60" y="70" width="480" height="120" fill="#f7f7f5" stroke="#e3e3e0"/>
    <g stroke="#bbb" stroke-width="1.2" fill="#eef0f2"><rect x="92" y="92" width="40" height="40"/><rect x="92" y="146" width="40" height="30"/><rect x="450" y="100" width="44" height="60"/></g>
    <rect x="250" y="104" width="80" height="64" fill="#111"/>
    <circle cx="120" cy="86" r="9" fill="none" stroke="#ff3b21" stroke-width="1.4"/>
    <path d="M120 86 l-18 -14 M120 86 l-22 4 M120 86 l-10 -22" stroke="#ff3b21" stroke-width="1.2"/>
    <text x="96" y="84" font-size="10.5" fill="#ff3b21">sun</text>
    <path d="M470 130 l-110 6 m12 -6 l-12 6 l12 6" stroke="#ff3b21" stroke-width="1.4" fill="none"/>
    <text x="430" y="120" font-size="10.5" fill="#ff3b21">view</text>
    <text x="290" y="190" font-size="11.5" fill="#fff" text-anchor="middle" dy="-78">site</text>
    <text x="300" y="214" font-size="12" fill="#777" text-anchor="middle">the building responds to forces</text>`),

  "dt-tectonics": D(`${cap(40, "TECTONICS · WALL SECTION")}
    <g stroke="#111" stroke-width="1.5">
      <rect x="230" y="64" width="120" height="16" fill="#d8d8d8"/>
      <rect x="244" y="80" width="92" height="84" fill="#fff"/>
      <line x1="244" y1="80" x2="244" y2="164"/><line x1="336" y1="80" x2="336" y2="164"/>
      <rect x="230" y="164" width="120" height="16" fill="#bdbdbd"/>
      <path d="M210 180 h170" stroke-width="2"/>
      <path d="M210 186 l8 -6 M226 186 l8 -6 M242 186 l8 -6 M258 186 l8 -6 M274 186 l8 -6 M290 186 l8 -6 M306 186 l8 -6 M322 186 l8 -6 M338 186 l8 -6 M354 186 l8 -6" stroke-width="1"/>
    </g>
    <g font-size="11.5" fill="#777"><text x="372" y="74">roof</text><text x="372" y="124">envelope</text><text x="372" y="174">ground</text></g>
    <line x1="290" y1="80" x2="290" y2="164" stroke="#ff3b21" stroke-width="2"/>
    <text x="150" y="120" font-size="11.5" fill="#ff3b21">load path</text>
    <path d="M205 100 l0 70 m-4 -8 l4 8 l4 -8" stroke="#ff3b21" stroke-width="1.4" fill="none"/>`),

  "dt-program-type": D(`${cap(40, "PROGRAM · ADJACENCY")}
    <g stroke="#111" stroke-width="1.3">
      <line x1="180" y1="110" x2="300" y2="96"/><line x1="300" y1="96" x2="300" y2="170"/>
      <line x1="300" y1="96" x2="420" y2="118"/><line x1="300" y1="170" x2="420" y2="118"/>
      <line x1="180" y1="110" x2="300" y2="170"/>
    </g>
    <g stroke="#111" stroke-width="1.4">
      <circle cx="180" cy="110" r="30" fill="#eef0f2"/>
      <circle cx="300" cy="96" r="38" fill="#ff3b21" fill-opacity="0.12" stroke="#ff3b21"/>
      <circle cx="420" cy="118" r="26" fill="#eaf0ec"/>
      <circle cx="300" cy="170" r="22" fill="#f1ece6"/>
    </g>
    <g font-size="11" fill="#555" text-anchor="middle"><text x="180" y="114">public</text><text x="300" y="100">main</text><text x="420" y="122">service</text><text x="300" y="174">private</text></g>
    <text x="300" y="216" font-size="12" fill="#777" text-anchor="middle">organize by relationship, not a room list</text>`),

  "dt-position": D(`${cap(40, "A DESIGN POSITION")}
    <g stroke="#ccc" stroke-width="1.4" fill="none">
      <path d="M300 120 l-150 -46"/><path d="M300 120 l-150 46"/><path d="M300 120 l150 -64"/><path d="M300 120 l150 64"/>
    </g>
    <g fill="#f4f4f4" stroke="#ddd"><circle cx="150" cy="74" r="14"/><circle cx="150" cy="166" r="14"/><circle cx="450" cy="56" r="14"/><circle cx="450" cy="184" r="14"/></g>
    <circle cx="300" cy="120" r="30" fill="#ff3b21" fill-opacity="0.12" stroke="#ff3b21" stroke-width="1.6"/>
    <text x="300" y="124" font-size="11.5" fill="#ff3b21" text-anchor="middle">thesis</text>
    <text x="300" y="200" font-size="12" fill="#777" text-anchor="middle">a stance every move serves</text>`),

  // ── Digital Foundations ──────────────────────────────────────────────────
  "gen-files": D(`${cap(40, "FILE STRUCTURE")}
    <path d="M150 88 h56 l8 10 h140 v92 h-204 z" fill="#eef0f2" stroke="#111" stroke-width="1.3"/>
    <g font-size="12.5" fill="#333"><text x="172" y="120">/model</text><text x="172" y="142">/drawings</text><text x="172" y="164">/portfolio</text></g>
    <line x1="166" y1="106" x2="166" y2="170" stroke="#cdd3d8" stroke-width="1.2"/>
    <text x="372" y="120" font-size="11.5" fill="#ff3b21">house_v03.3dm</text>
    <text x="300" y="214" font-size="12" fill="#777" text-anchor="middle">one folder · clear names · versions</text>`),

  "gen-units": D(`${cap(40, "UNITS & SCALE")}
    <rect x="120" y="146" width="16" height="16" fill="none" stroke="#111" stroke-width="1.4"/>
    <text x="128" y="184" font-size="11" fill="#777" text-anchor="middle">mm</text>
    <path d="M168 150 l66 -42 m-13 1 l13 -1 l-1 13" stroke="#ff3b21" stroke-width="1.5" fill="none"/>
    <text x="214" y="96" font-size="12.5" fill="#ff3b21" text-anchor="middle">×1000?</text>
    <rect x="300" y="78" width="120" height="120" fill="none" stroke="#111" stroke-width="1.4"/>
    <text x="360" y="120" font-size="11" fill="#777" text-anchor="middle">m</text>
    <text x="300" y="222" font-size="12" fill="#777" text-anchor="middle">always model at real, full size</text>`),

  "gen-raster-vector": D(`${cap(40, "RASTER vs VECTOR")}
    <g fill="#cfd6dc"><rect x="100" y="150" width="15" height="15"/><rect x="115" y="135" width="15" height="15"/><rect x="130" y="120" width="15" height="15"/><rect x="145" y="105" width="15" height="15"/><rect x="160" y="90" width="15" height="15"/><rect x="175" y="75" width="15" height="15"/></g>
    <text x="150" y="192" font-size="12" fill="#777" text-anchor="middle">raster · pixels</text>
    <path d="M360 162 C 392 150 408 96 470 84" stroke="#ff3b21" stroke-width="2.2" fill="none"/>
    <circle cx="360" cy="162" r="4" fill="#fff" stroke="#111"/><circle cx="470" cy="84" r="4" fill="#fff" stroke="#111"/>
    <text x="415" y="192" font-size="12" fill="#777" text-anchor="middle">vector · paths</text>`),

  "gen-color-output": D(`${cap(40, "COLOUR & OUTPUT")}
    <g fill-opacity="0.5"><circle cx="195" cy="108" r="34" fill="#ee2233"/><circle cx="172" cy="142" r="34" fill="#22aa55"/><circle cx="218" cy="142" r="34" fill="#3366ff"/></g>
    <text x="195" y="192" font-size="12" fill="#777" text-anchor="middle">RGB · screen</text>
    <path d="M270 128 h54 m-11 -6 l11 6 l-11 6" stroke="#111" stroke-width="1.4" fill="none"/>
    <g fill-opacity="0.55"><circle cx="405" cy="108" r="30" fill="#00bbdd"/><circle cx="386" cy="140" r="30" fill="#ee22aa"/><circle cx="424" cy="140" r="30" fill="#ffdd00"/></g>
    <text x="405" y="192" font-size="12" fill="#777" text-anchor="middle">CMYK · print · 300ppi</text>`),

  "gen-mesh-nurbs": D(`${cap(40, "MESH vs NURBS")}
    <path d="M120 114 L148 82 L190 84 L214 118 L192 156 L146 154 Z" fill="#eef0f2" stroke="#111" stroke-width="1.3"/>
    <path d="M148 82 L192 156 M190 84 L146 154 M120 114 L214 118" stroke="#cbd2d8" stroke-width="1"/>
    <text x="167" y="190" font-size="12" fill="#777" text-anchor="middle">mesh · facets</text>
    <path d="M345 118 C 345 82 470 82 470 118 C 470 154 345 154 345 118 Z" fill="#f4f4f4" stroke="#111" stroke-width="1.5"/>
    <rect x="343" y="80" width="129" height="76" fill="none" stroke="#ff3b21" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="407" y="190" font-size="12" fill="#777" text-anchor="middle">NURBS · exact</text>`),

  "gen-interop": D(`${cap(40, "INTEROPERABILITY")}
    <g stroke="#111" stroke-width="1.3" fill="#f4f4f4"><rect x="86" y="102" width="76" height="46" rx="5"/><rect x="262" y="102" width="76" height="46" rx="5"/><rect x="438" y="102" width="76" height="46" rx="5"/></g>
    <g font-size="12" fill="#333" text-anchor="middle"><text x="124" y="130">Rhino</text><text x="300" y="130">Illustr.</text><text x="476" y="130">InDesign</text></g>
    <path d="M162 125 h100 m-12 -5 l12 5 l-12 5" stroke="#ff3b21" stroke-width="1.4" fill="none"/>
    <path d="M338 125 h100 m-12 -5 l12 5 l-12 5" stroke="#ff3b21" stroke-width="1.4" fill="none"/>
    <g font-size="10.5" fill="#ff3b21" text-anchor="middle"><text x="212" y="112">DWG</text><text x="388" y="112">PDF</text></g>
    <text x="300" y="194" font-size="12" fill="#777" text-anchor="middle">match units · keep layers</text>`),

  "gen-pipeline": D(`${cap(40, "REPRESENTATION PIPELINE")}
    <g stroke="#111" stroke-width="1.3" fill="#f4f4f4"><rect x="74" y="102" width="96" height="46" rx="5"/><rect x="252" y="102" width="96" height="46" rx="5"/><rect x="430" y="102" width="96" height="46" rx="5"/></g>
    <g font-size="12.5" fill="#333" text-anchor="middle"><text x="122" y="130">model</text><text x="300" y="130">drawings</text><text x="478" y="130">board</text></g>
    <path d="M170 125 h82 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.4" fill="none"/>
    <path d="M348 125 h82 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.4" fill="none"/>
    <path d="M122 102 q 178 -44 356 0" stroke="#ff3b21" stroke-width="1.4" fill="none" stroke-dasharray="5 4"/>
    <text x="300" y="66" font-size="11" fill="#ff3b21" text-anchor="middle">change the model → all regenerate</text>`),

  "gen-version": D(`${cap(40, "VERSIONING")}
    <line x1="96" y1="124" x2="500" y2="124" stroke="#111" stroke-width="1.4"/>
    <circle cx="150" cy="124" r="6" fill="#fff" stroke="#111" stroke-width="1.4"/><circle cx="250" cy="124" r="6" fill="#fff" stroke="#111" stroke-width="1.4"/><circle cx="350" cy="124" r="6" fill="#fff" stroke="#111" stroke-width="1.4"/><circle cx="450" cy="124" r="8" fill="#ff3b21"/>
    <g font-size="11.5" fill="#777" text-anchor="middle"><text x="150" y="152">v01</text><text x="250" y="152">v02</text><text x="350" y="152">v03</text></g>
    <text x="450" y="154" font-size="11.5" fill="#ff3b21" text-anchor="middle">final</text>
    <path d="M250 124 l40 -42" stroke="#ccc" stroke-width="1.3"/><circle cx="296" cy="76" r="5" fill="#fff" stroke="#ccc"/>
    <text x="354" y="80" font-size="10.5" fill="#aaa">dead end, kept</text>`),

  "gen-ai": D(`${cap(40, "TRUST BUT VERIFY")}
    <g stroke="#111" stroke-width="1.3" fill="#f4f4f4"><rect x="98" y="98" width="92" height="46" rx="5"/><rect x="360" y="98" width="92" height="46" rx="5"/></g>
    <g font-size="12.5" fill="#333" text-anchor="middle"><text x="144" y="126">prompt</text><text x="406" y="126">output</text></g>
    <path d="M190 121 h170 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.4" fill="none"/>
    <path d="M406 144 q 0 50 -135 50 q -127 0 -127 -44" stroke="#ff3b21" stroke-width="1.5" fill="none" stroke-dasharray="5 4"/>
    <path d="M144 154 l0 -8 m-5 2 l5 -8 l5 8" stroke="#ff3b21" stroke-width="1.5" fill="none"/>
    <text x="300" y="214" font-size="12" fill="#ff3b21" text-anchor="middle">verify the output → iterate</text>`),

  // ── Rhino ────────────────────────────────────────────────────────────────
  "rhino-interface": D(`${cap(40, "GUMBALL")}
    <rect x="232" y="104" width="92" height="62" fill="#f4f4f4" stroke="#111" stroke-width="1.4"/>
    <circle cx="262" cy="150" r="5" fill="#111"/>
    <path d="M262 150 h78 m-12 -6 l12 6 l-12 6" stroke="#ff3b21" stroke-width="2.2" fill="none"/>
    <path d="M262 150 v-72 m-6 12 l6 -12 l6 12" stroke="#ff3b21" stroke-width="2.2" fill="none"/>
    <path d="M262 150 a40 40 0 0 0 -28 -28" stroke="#111" stroke-width="1.6" fill="none"/>
    <rect x="330" y="142" width="12" height="12" fill="#ff3b21"/>
    <g font-size="11" fill="#777"><text x="348" y="158">move</text><text x="244" y="74">·</text></g>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">move · rotate · scale, by number</text>`),

  "rhino-curves": D(`${cap(40, "CURVES & CONTROL POINTS")}
    <polyline points="110,160 180,86 300,110 420,70 500,150" fill="none" stroke="#ddd" stroke-width="1.3" stroke-dasharray="4 4"/>
    <path d="M110 160 C 150 96 240 96 300 110 C 360 124 450 96 500 150" fill="none" stroke="#111" stroke-width="2"/>
    <g fill="#fff" stroke="#ff3b21" stroke-width="1.6"><circle cx="110" cy="160" r="4.5"/><circle cx="180" cy="86" r="4.5"/><circle cx="300" cy="110" r="4.5"/><circle cx="420" cy="70" r="4.5"/><circle cx="500" cy="150" r="4.5"/></g>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">control points shape the curve</text>`),

  "rhino-layers": D(`${cap(40, "LAYERS")}
    <g stroke="#111" stroke-width="1.3">
      <rect x="170" y="84" width="260" height="26" fill="#fff"/><rect x="170" y="116" width="260" height="26" fill="#fff"/><rect x="170" y="148" width="260" height="26" fill="#fff"/>
    </g>
    <rect x="180" y="91" width="12" height="12" fill="#ff3b21"/><rect x="180" y="123" width="12" height="12" fill="#2a5"/><rect x="180" y="155" width="12" height="12" fill="#36c"/>
    <g font-size="12" fill="#333"><text x="204" y="101">Walls</text><text x="204" y="133">Floors</text><text x="204" y="165">Site</text></g>
    <g stroke="#aaa" stroke-width="1.2" fill="none"><path d="M386 97 q6 -7 12 0 q-6 7 -12 0"/><circle cx="392" cy="97" r="1.6" fill="#aaa"/><path d="M386 129 q6 -7 12 0 q-6 7 -12 0"/><circle cx="392" cy="129" r="1.6" fill="#aaa"/><rect x="387" y="161" width="10" height="8"/><path d="M389 161 v-3 a3 3 0 0 1 6 0 v3"/></g>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">show · hide · lock · colour together</text>`),

  "rhino-surfaces": D(`${cap(40, "SURFACES & LOFTING")}
    <path d="M150 80 C 180 60 200 100 230 84" fill="none" stroke="#111" stroke-width="1.8"/>
    <path d="M150 170 C 180 150 200 190 230 174" fill="none" stroke="#111" stroke-width="1.8"/>
    <path d="M150 80 L150 170 M230 84 L230 174 M190 78 L190 182" stroke="#ddd" stroke-width="1"/>
    <path d="M150 80 C 180 60 200 100 230 84 L230 174 C 200 190 180 150 150 170 Z" fill="#ff3b21" fill-opacity="0.08" stroke="none"/>
    <path d="M300 126 h60 m-12 -6 l12 6 l-12 6" stroke="#111" stroke-width="1.4" fill="none"/>
    <path d="M390 86 C 420 66 470 70 500 84 L500 174 C 470 190 420 186 390 166 Z" fill="#f4f4f4" stroke="#111" stroke-width="1.6"/>
    <text x="445" y="206" font-size="12" fill="#777" text-anchor="middle">loft sections into a surface</text>`),

  "rhino-solids": D(`${cap(40, "SOLIDS & BOOLEANS")}
    <rect x="120" y="96" width="80" height="80" fill="#eef0f2" stroke="#111" stroke-width="1.5"/>
    <circle cx="210" cy="136" r="34" fill="#fff" fill-opacity="0.7" stroke="#111" stroke-width="1.5"/>
    <text x="262" y="142" font-size="22" fill="#ff3b21" text-anchor="middle">−</text>
    <path d="M300 136 h44 m-12 -6 l12 6 l-12 6" stroke="#111" stroke-width="1.4" fill="none"/>
    <path d="M380 96 h80 v80 h-80 z M460 136 a34 34 0 0 1 -34 34 a34 34 0 0 1 -34 -34" fill="#eef0f2" stroke="#111" stroke-width="1.5" fill-rule="evenodd"/>
    <path d="M426 102 a34 34 0 0 0 -34 34 v40 h68 v-74 z" fill="#fff"/>
    <path d="M380 96 h80 v80 h-80 z" fill="none" stroke="#111" stroke-width="1.5"/>
    <path d="M460 136 a34 34 0 0 1 -68 0" fill="none" stroke="#ff3b21" stroke-width="1.6"/>
    <text x="420" y="206" font-size="12" fill="#777" text-anchor="middle">add · subtract · intersect solids</text>`),

  "rhino-subd": D(`${cap(40, "SUBD MODELING")}
    <path d="M120 100 L200 86 L210 160 L130 176 Z" fill="none" stroke="#ff3b21" stroke-width="1.4"/>
    <path d="M120 100 L210 160 M200 86 L130 176 M165 93 L170 168" stroke="#ffb9af" stroke-width="1"/>
    <g fill="#fff" stroke="#ff3b21" stroke-width="1.4"><circle cx="120" cy="100" r="3.5"/><circle cx="200" cy="86" r="3.5"/><circle cx="210" cy="160" r="3.5"/><circle cx="130" cy="176" r="3.5"/></g>
    <text x="165" y="206" font-size="12" fill="#777" text-anchor="middle">edit the cage</text>
    <path d="M250 130 h50 m-12 -6 l12 6 l-12 6" stroke="#111" stroke-width="1.4" fill="none"/>
    <path d="M360 130 C 360 92 470 92 480 132 C 488 168 380 178 360 130 Z" fill="#f4f4f4" stroke="#111" stroke-width="1.6"/>
    <text x="425" y="206" font-size="12" fill="#777" text-anchor="middle">smooth result</text>`),

  "rhino-blocks": D(`${cap(40, "BLOCKS · REUSE")}
    <g stroke="#111" stroke-width="1.5" fill="#f4f4f4"><path d="M150 150 l0 -34 m-14 14 a14 14 0 1 1 28 0"/></g>
    <rect x="120" y="150" width="60" height="6" fill="#111"/>
    <text x="150" y="186" font-size="11.5" fill="#ff3b21" text-anchor="middle">1 definition</text>
    <path d="M210 130 h40 m-12 -6 l12 6 l-12 6" stroke="#111" stroke-width="1.4" fill="none"/>
    <g stroke="#111" stroke-width="1.2" fill="#eef0f2"><path d="M300 150 l0 -26 m-10 10 a10 10 0 1 1 20 0"/><path d="M360 150 l0 -26 m-10 10 a10 10 0 1 1 20 0"/><path d="M420 150 l0 -26 m-10 10 a10 10 0 1 1 20 0"/><path d="M480 150 l0 -26 m-10 10 a10 10 0 1 1 20 0"/></g>
    <text x="400" y="186" font-size="11.5" fill="#777" text-anchor="middle">many instances · edit once</text>`),

  "rhino-make2d": D(`${cap(40, "MAKE2D")}
    <g stroke="#111" stroke-width="1.5" fill="none"><path d="M120 150 L120 96 L170 74 L220 96 L220 150 Z" fill="#f4f4f4"/><path d="M120 96 L170 118 L220 96 M170 118 L170 172 M120 150 L170 172 L220 150"/></g>
    <text x="170" y="200" font-size="12" fill="#777" text-anchor="middle">3D model</text>
    <path d="M260 124 h54 m-12 -6 l12 6 l-12 6" stroke="#ff3b21" stroke-width="1.5" fill="none"/>
    <g stroke="#111" stroke-width="1.5" fill="none"><path d="M360 150 L360 96 L470 96 L470 150 Z"/><line x1="415" y1="96" x2="415" y2="150" stroke-dasharray="4 4"/></g>
    <text x="415" y="200" font-size="12" fill="#777" text-anchor="middle">flat 2D linework</text>`),

  "rhino-render": D(`${cap(40, "VIEWS & RENDERS")}
    <circle cx="150" cy="80" r="11" fill="none" stroke="#ff3b21" stroke-width="1.5"/>
    <path d="M150 80 l-16 -12 M150 80 l-20 4 M150 80 l-6 -20" stroke="#ff3b21" stroke-width="1.3"/>
    <text x="132" y="74" font-size="10.5" fill="#ff3b21">sun</text>
    <path d="M250 168 L250 100 L320 76 L390 100 L390 168 Z" fill="#fff" stroke="#111" stroke-width="1.6"/>
    <path d="M250 100 L320 124 L390 100 M320 124 L320 168" stroke="#111" stroke-width="1.4" fill="none"/>
    <path d="M320 124 L390 100 L390 168 L320 168 Z" fill="#ececec"/>
    <path d="M250 100 L320 124 L320 168 L250 168 Z" fill="#f7f7f7"/>
    <text x="320" y="200" font-size="12" fill="#777" text-anchor="middle">light · material · framed view</text>`),

  "rhino-fabrication": D(`${cap(40, "FABRICATION")}
    <g fill="none" stroke="#111" stroke-width="1.4"><ellipse cx="170" cy="128" rx="50" ry="60"/><ellipse cx="170" cy="128" rx="34" ry="44"/><ellipse cx="170" cy="128" rx="18" ry="26"/></g>
    <text x="170" y="206" font-size="12" fill="#777" text-anchor="middle">contours</text>
    <path d="M250 128 h48 m-12 -6 l12 6 l-12 6" stroke="#ff3b21" stroke-width="1.5" fill="none"/>
    <g fill="#f4f4f4" stroke="#111" stroke-width="1.3"><rect x="340" y="92" width="48" height="30"/><rect x="398" y="92" width="48" height="30"/><rect x="456" y="92" width="44" height="30"/><rect x="340" y="132" width="48" height="30"/><rect x="398" y="132" width="48" height="30"/></g>
    <text x="420" y="206" font-size="12" fill="#777" text-anchor="middle">nested flat parts</text>`),

  // ── Grasshopper ──────────────────────────────────────────────────────────
  "gh-intro": D(`${cap(40, "YOUR FIRST DEFINITION")}
    <rect x="90" y="116" width="92" height="26" rx="3" fill="#f4f4f4" stroke="#111" stroke-width="1.2"/>
    <circle cx="106" cy="129" r="5" fill="#ff3b21"/><line x1="112" y1="129" x2="160" y2="129" stroke="#111" stroke-width="1.2"/><text x="170" y="133" font-size="10" fill="#777">3.0</text>
    <path d="M182 129 h34" stroke="#111" stroke-width="1.2"/>
    <rect x="216" y="110" width="78" height="38" rx="3" fill="#eef0f2" stroke="#111" stroke-width="1.2"/><text x="255" y="133" font-size="11" fill="#333" text-anchor="middle">Circle</text>
    <path d="M294 129 h34" stroke="#111" stroke-width="1.2"/>
    <circle cx="400" cy="129" r="42" fill="none" stroke="#ff3b21" stroke-width="2"/>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">drag the slider → geometry updates live</text>`),

  "gh-lists": D(`${cap(40, "LISTS & SEQUENCES")}
    <text x="118" y="102" font-size="13" fill="#333">0, 1, 2, 3, 4 …</text>
    <path d="M150 114 v22 m-5 -8 l5 8 l5 -8" stroke="#ff3b21" stroke-width="1.5" fill="none"/>
    <g fill="#111"><circle cx="120" cy="160" r="4"/><circle cx="180" cy="160" r="4"/><circle cx="240" cy="160" r="4"/><circle cx="300" cy="160" r="4"/><circle cx="360" cy="160" r="4"/><circle cx="420" cy="160" r="4"/><circle cx="480" cy="160" r="4"/></g>
    <text x="300" y="200" font-size="12" fill="#777" text-anchor="middle">numbers place many things at once</text>`),

  "gh-geometry": D(`${cap(40, "POINTS → CURVE → SURFACE")}
    <g fill="#111"><circle cx="100" cy="150" r="3.5"/><circle cx="135" cy="104" r="3.5"/><circle cx="170" cy="140" r="3.5"/></g>
    <text x="135" y="186" font-size="11" fill="#777" text-anchor="middle">points</text>
    <path d="M196 130 h40 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <path d="M256 150 C 280 100 300 160 330 110" fill="none" stroke="#111" stroke-width="1.8"/>
    <text x="293" y="186" font-size="11" fill="#777" text-anchor="middle">curve</text>
    <path d="M352 130 h40 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <path d="M410 150 C 430 104 480 104 500 132 C 490 168 420 176 410 150 Z" fill="#ff3b21" fill-opacity="0.1" stroke="#111" stroke-width="1.5"/>
    <text x="455" y="186" font-size="11" fill="#777" text-anchor="middle">surface</text>`),

  "gh-trees": D(`${cap(40, "DATA TREES")}
    <g stroke="#111" stroke-width="1.3" fill="none"><path d="M160 128 L256 88 M160 128 L256 128 M160 128 L256 168"/></g>
    <circle cx="160" cy="128" r="6" fill="#ff3b21"/>
    <g font-family="ui-monospace, monospace" font-size="11" fill="#333"><text x="266" y="92">{0;0}</text><text x="266" y="132">{0;1}</text><text x="266" y="172">{0;2}</text></g>
    <g fill="#111"><circle cx="392" cy="88" r="3"/><circle cx="408" cy="88" r="3"/><circle cx="392" cy="128" r="3"/><circle cx="392" cy="168" r="3"/><circle cx="408" cy="168" r="3"/><circle cx="424" cy="168" r="3"/></g>
    <text x="300" y="210" font-size="12" fill="#777" text-anchor="middle">data in branches, addressed by path</text>`),

  "gh-matching": D(`${cap(40, "MATCHING & FILTERING")}
    <g fill="#111"><circle cx="170" cy="92" r="4"/><circle cx="170" cy="128" r="4"/><circle cx="170" cy="164" r="4"/></g>
    <g fill="#ff3b21"><rect x="356" y="88" width="9" height="9"/><rect x="356" y="124" width="9" height="9"/><rect x="356" y="160" width="9" height="9"/></g>
    <g stroke="#111" stroke-width="1.2"><line x1="176" y1="92" x2="356" y2="92"/><line x1="176" y1="128" x2="356" y2="128"/><line x1="176" y1="164" x2="356" y2="164"/></g>
    <text x="170" y="190" font-size="11" fill="#777" text-anchor="middle">list A</text><text x="360" y="190" font-size="11" fill="#777" text-anchor="middle">list B</text>
    <text x="300" y="214" font-size="12" fill="#777" text-anchor="middle">pair lists · split by a rule</text>`),

  "gh-attractors": D(`${cap(40, "ATTRACTORS")}
    <g fill="#111"><circle cx="140" cy="92" r="2"/><circle cx="190" cy="92" r="2.5"/><circle cx="240" cy="92" r="3"/><circle cx="290" cy="92" r="4"/><circle cx="340" cy="92" r="5"/><circle cx="390" cy="92" r="6.5"/><circle cx="140" cy="128" r="2"/><circle cx="190" cy="128" r="2.5"/><circle cx="240" cy="128" r="3.5"/><circle cx="290" cy="128" r="4.5"/><circle cx="340" cy="128" r="6"/><circle cx="390" cy="128" r="8"/><circle cx="140" cy="164" r="2"/><circle cx="190" cy="164" r="2.5"/><circle cx="240" cy="164" r="3"/><circle cx="290" cy="164" r="4"/><circle cx="340" cy="164" r="5"/><circle cx="390" cy="164" r="6.5"/></g>
    <circle cx="460" cy="128" r="7" fill="none" stroke="#ff3b21" stroke-width="2"/><text x="460" y="156" font-size="10.5" fill="#ff3b21" text-anchor="middle">attractor</text>
    <text x="255" y="208" font-size="12" fill="#777" text-anchor="middle">distance drives the variation</text>`),

  "gh-clusters": D(`${cap(40, "CLUSTERS")}
    <g stroke="#bbb" stroke-width="1.2" fill="#fafafa"><rect x="96" y="92" width="42" height="22" rx="2"/><rect x="150" y="122" width="42" height="22" rx="2"/><rect x="96" y="152" width="42" height="22" rx="2"/></g>
    <g stroke="#ccc" stroke-width="1"><line x1="138" y1="103" x2="150" y2="133"/><line x1="138" y1="163" x2="150" y2="133"/></g>
    <path d="M210 130 h44 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <rect x="300" y="104" width="120" height="52" rx="4" fill="#ff3b21" fill-opacity="0.08" stroke="#ff3b21" stroke-width="1.5"/>
    <text x="360" y="134" font-size="12" fill="#333" text-anchor="middle">Cluster</text>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">bundle stable logic, reuse it</text>`),

  "gh-fields": D(`${cap(40, "FORM-FINDING")}
    <g stroke="#111" stroke-width="1.1" fill="none"><path d="M120 92 L200 112 L280 98 L360 118 L440 94 M140 152 L220 170 L300 154 L380 174 L460 152 M120 92 L140 152 M200 112 L220 170 M280 98 L300 154 M360 118 L380 174 M440 94 L460 152"/></g>
    <g fill="#ff3b21"><circle cx="120" cy="92" r="4"/><circle cx="440" cy="94" r="4"/><circle cx="140" cy="152" r="4"/><circle cx="460" cy="152" r="4"/></g>
    <text x="290" y="210" font-size="12" fill="#777" text-anchor="middle">goals relax into a shape (anchors in red)</text>`),

  "gh-export": D(`${cap(40, "BAKE & EXPORT")}
    <rect x="84" y="106" width="80" height="40" rx="3" fill="#eef0f2" stroke="#111" stroke-width="1.2"/><text x="124" y="130" font-size="10.5" fill="#333" text-anchor="middle">definition</text>
    <path d="M164 126 h40 m-12 -5 l12 5 l-12 5" stroke="#ff3b21" stroke-width="1.4" fill="none"/><text x="184" y="108" font-size="9.5" fill="#ff3b21" text-anchor="middle">bake</text>
    <g stroke="#111" stroke-width="1.3" fill="#f4f4f4"><rect x="244" y="100" width="44" height="24"/><rect x="294" y="100" width="44" height="24"/><rect x="244" y="130" width="44" height="24"/></g><text x="291" y="174" font-size="10.5" fill="#777" text-anchor="middle">layers</text>
    <path d="M350 126 h40 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <g stroke="#111" stroke-width="1.3" fill="none"><rect x="420" y="100" width="90" height="54"/><line x1="465" y1="100" x2="465" y2="154" stroke-dasharray="4 4"/></g><text x="465" y="174" font-size="10.5" fill="#777" text-anchor="middle">drawing</text>`),

  // ── AutoCAD ──────────────────────────────────────────────────────────────
  "acad-draw": D(`${cap(40, "DRAW WITH PRECISION")}
    <polyline points="120,164 200,100 300,142 400,92 480,152" fill="none" stroke="#111" stroke-width="1.8"/>
    <g fill="#fff" stroke="#ff3b21" stroke-width="1.5"><rect x="116" y="160" width="8" height="8"/><rect x="196" y="96" width="8" height="8"/><rect x="296" y="138" width="8" height="8"/><rect x="396" y="88" width="8" height="8"/><rect x="476" y="148" width="8" height="8"/></g>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">snap to exact points</text>`),

  "acad-layers": D(`${cap(40, "LAYERS")}
    <g stroke="#111" stroke-width="1.2" fill="#fff"><rect x="178" y="92" width="244" height="26"/><rect x="178" y="124" width="244" height="26"/><rect x="178" y="156" width="244" height="26"/></g>
    <rect x="190" y="100" width="12" height="10" fill="#e23"/><rect x="190" y="132" width="12" height="10" fill="#2a5"/><rect x="190" y="164" width="12" height="10" fill="#36c"/>
    <g font-size="11.5" fill="#333"><text x="212" y="110">WALL</text><text x="212" y="142">DOOR</text><text x="212" y="174">GRID</text></g>
    <g font-size="10" fill="#999" text-anchor="end"><text x="412" y="110">0.50</text><text x="412" y="142">0.25</text><text x="412" y="174">0.13</text></g>
    <text x="300" y="208" font-size="12" fill="#777" text-anchor="middle">colour → printed lineweight</text>`),

  "acad-modify": D(`${cap(40, "MODIFY")}
    <path d="M100 96 L160 96 L160 158" fill="none" stroke="#111" stroke-width="1.6"/>
    <path d="M100 108 L148 108 L148 158" fill="none" stroke="#ff3b21" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="128" y="184" font-size="11" fill="#777" text-anchor="middle">offset</text>
    <path d="M250 96 L250 146 Q250 158 262 158 L312 158" fill="none" stroke="#111" stroke-width="1.6"/>
    <text x="280" y="184" font-size="11" fill="#777" text-anchor="middle">fillet</text>
    <g fill="#f4f4f4" stroke="#111" stroke-width="1.3"><rect x="392" y="96" width="18" height="44"/><rect x="422" y="96" width="18" height="44"/><rect x="452" y="96" width="18" height="44"/><rect x="482" y="96" width="18" height="44"/></g>
    <text x="446" y="184" font-size="11" fill="#777" text-anchor="middle">array</text>`),

  "acad-blocks": D(`${cap(40, "BLOCKS")}
    <g stroke="#111" stroke-width="1.5" fill="#f4f4f4"><circle cx="150" cy="126" r="20"/></g>
    <line x1="150" y1="106" x2="150" y2="146" stroke="#111" stroke-width="1.3"/><line x1="130" y1="126" x2="170" y2="126" stroke="#111" stroke-width="1.3"/>
    <text x="150" y="172" font-size="11" fill="#ff3b21" text-anchor="middle">1 block</text>
    <path d="M190 126 h36 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <g stroke="#111" stroke-width="1.2" fill="#eef0f2"><circle cx="280" cy="126" r="14"/><circle cx="340" cy="126" r="14"/><circle cx="400" cy="126" r="14"/><circle cx="460" cy="126" r="14"/></g>
    <text x="370" y="172" font-size="11" fill="#777" text-anchor="middle">many inserts · redefine once</text>`),

  "acad-annotate": D(`${cap(40, "ANNOTATE")}
    <rect x="140" y="96" width="220" height="60" fill="none" stroke="#111" stroke-width="1.5"/>
    <g stroke="#e2e2e2" stroke-width="1"><line x1="180" y1="96" x2="140" y2="136"/><line x1="240" y1="96" x2="160" y2="156"/><line x1="300" y1="96" x2="220" y2="156"/><line x1="356" y1="120" x2="280" y2="156"/></g>
    <g stroke="#ff3b21" stroke-width="1.2"><line x1="140" y1="176" x2="360" y2="176"/><path d="M144 172 l-4 4 l4 4" fill="none"/><path d="M356 172 l4 4 l-4 4" fill="none"/></g>
    <text x="250" y="194" font-size="11" fill="#ff3b21" text-anchor="middle">4200</text>
    <text x="300" y="220" font-size="12" fill="#777" text-anchor="middle">dimensions · hatch · text</text>`),

  "acad-linework": D(`${cap(40, "LINE WEIGHTS")}
    <g stroke="#111" fill="none"><path d="M120 92 h340" stroke-width="4"/><path d="M120 122 h340" stroke-width="2.2"/><path d="M120 150 h340" stroke-width="1.2"/><path d="M120 176 h340" stroke-width="0.6"/></g>
    <g font-size="11" fill="#777"><text x="472" y="96">cut</text><text x="472" y="126">seen</text><text x="472" y="154">texture</text><text x="472" y="180">dims</text></g>
    <text x="290" y="216" font-size="12" fill="#777" text-anchor="middle">hierarchy gives a drawing depth</text>`),

  "acad-layouts": D(`${cap(40, "LAYOUTS")}
    <rect x="84" y="94" width="116" height="92" fill="#f7f7f7" stroke="#111" stroke-width="1.3"/><path d="M104 162 L134 112 L164 152" fill="none" stroke="#111" stroke-width="1.2"/><text x="142" y="204" font-size="10.5" fill="#777" text-anchor="middle">model 1:1</text>
    <path d="M214 140 h36 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <rect x="296" y="80" width="208" height="118" fill="#fff" stroke="#111" stroke-width="1.4"/>
    <rect x="314" y="96" width="124" height="70" fill="none" stroke="#ff3b21" stroke-width="1.4"/><path d="M332 150 L356 116 L380 148" fill="none" stroke="#111" stroke-width="1"/>
    <rect x="448" y="150" width="44" height="40" fill="none" stroke="#111" stroke-width="1"/>
    <text x="400" y="216" font-size="12" fill="#777" text-anchor="middle">sheet · scaled viewport · title block</text>`),

  "acad-rhino": D(`${cap(40, "ROUND-TRIP")}
    <g stroke="#111" stroke-width="1.3" fill="#f4f4f4"><rect x="84" y="106" width="78" height="44" rx="5"/><rect x="261" y="106" width="78" height="44" rx="5"/><rect x="438" y="106" width="78" height="44" rx="5"/></g>
    <g font-size="11.5" fill="#333" text-anchor="middle"><text x="123" y="132">Rhino</text><text x="300" y="132">AutoCAD</text><text x="477" y="132">Illustr.</text></g>
    <path d="M162 120 h99 m-12 -5 l12 5 l-12 5" stroke="#ff3b21" stroke-width="1.4" fill="none"/>
    <path d="M339 136 h99 m-12 -5 l12 5 l-12 5" stroke="#ff3b21" stroke-width="1.4" fill="none"/>
    <text x="212" y="110" font-size="10" fill="#ff3b21" text-anchor="middle">DWG</text>
    <text x="388" y="158" font-size="10" fill="#ff3b21" text-anchor="middle">DWG</text>
    <text x="300" y="194" font-size="12" fill="#777" text-anchor="middle">match units · keep layers</text>`),

  "acad-diagrams": D(`${cap(40, "FIGURE-GROUND")}
    <rect x="150" y="80" width="300" height="106" fill="#111"/>
    <g fill="#fff"><rect x="170" y="96" width="40" height="34"/><rect x="226" y="96" width="30" height="50"/><rect x="170" y="146" width="60" height="26"/><rect x="280" y="100" width="50" height="44"/><rect x="350" y="96" width="36" height="58"/><rect x="300" y="156" width="80" height="18"/><rect x="402" y="110" width="34" height="48"/></g>
    <text x="300" y="210" font-size="12" fill="#777" text-anchor="middle">buildings solid, ground void — one idea</text>`),

  // ── Revit ────────────────────────────────────────────────────────────────
  "rvt-intro": D(`${cap(40, "FAMILY · TYPE · INSTANCE")}
    <rect x="92" y="100" width="86" height="54" rx="4" fill="#f4f4f4" stroke="#111" stroke-width="1.3"/><text x="135" y="131" font-size="11.5" fill="#333" text-anchor="middle">family</text>
    <path d="M180 127 h34 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <rect x="226" y="100" width="86" height="54" rx="4" fill="#eef0f2" stroke="#111" stroke-width="1.3"/><text x="269" y="131" font-size="11.5" fill="#333" text-anchor="middle">type</text>
    <path d="M314 127 h34 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <g fill="#ff3b21" fill-opacity="0.12" stroke="#ff3b21" stroke-width="1.3"><rect x="360" y="92" width="68" height="28" rx="3"/><rect x="360" y="128" width="68" height="28" rx="3"/></g>
    <text x="394" y="178" font-size="10.5" fill="#777" text-anchor="middle">instances</text>
    <text x="300" y="212" font-size="12" fill="#777" text-anchor="middle">type changes all · instance changes one</text>`),

  "rvt-levels": D(`${cap(40, "LEVELS & GRIDS")}
    <g stroke="#111" stroke-width="1.2"><line x1="120" y1="104" x2="480" y2="104"/><line x1="120" y1="142" x2="480" y2="142"/><line x1="120" y1="180" x2="480" y2="180"/></g>
    <g fill="#fff" stroke="#111" stroke-width="1.1"><circle cx="112" cy="104" r="9"/><circle cx="112" cy="142" r="9"/><circle cx="112" cy="180" r="9"/></g>
    <g font-size="8.5" fill="#333" text-anchor="middle"><text x="112" y="107">L3</text><text x="112" y="145">L2</text><text x="112" y="183">L1</text></g>
    <g stroke="#ff3b21" stroke-width="1" stroke-dasharray="4 3"><line x1="210" y1="92" x2="210" y2="190"/><line x1="320" y1="92" x2="320" y2="190"/><line x1="430" y1="92" x2="430" y2="190"/></g>
    <g fill="#fff" stroke="#ff3b21" stroke-width="1"><circle cx="210" cy="86" r="8"/><circle cx="320" cy="86" r="8"/><circle cx="430" cy="86" r="8"/></g>
    <g font-size="8" fill="#ff3b21" text-anchor="middle"><text x="210" y="89">A</text><text x="320" y="89">B</text><text x="430" y="89">C</text></g>
    <text x="300" y="214" font-size="12" fill="#777" text-anchor="middle">levels host elements; grids locate them</text>`),

  "rvt-walls": D(`${cap(40, "WALLS · FLOORS · ROOFS")}
    <path d="M200 110 L300 70 L400 110" fill="none" stroke="#111" stroke-width="1.6"/>
    <rect x="200" y="110" width="200" height="58" fill="#f4f4f4" stroke="#111" stroke-width="1.4"/>
    <rect x="194" y="168" width="212" height="10" fill="#bdbdbd" stroke="#111" stroke-width="1.2"/>
    <line x1="300" y1="110" x2="300" y2="168" stroke="#dddddd" stroke-width="1"/>
    <g font-size="10.5" fill="#777"><text x="416" y="92">roof</text><text x="416" y="145">wall</text><text x="416" y="178">floor</text></g>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">one model → plan, section, 3D at once</text>`),

  "rvt-massing": D(`${cap(40, "CONCEPTUAL MASSING")}
    <path d="M230 80 L370 80 L390 180 L210 180 Z" fill="#eef0f2" stroke="#111" stroke-width="1.4"/>
    <g stroke="#ff3b21" stroke-width="1"><line x1="218" y1="113" x2="382" y2="113"/><line x1="214" y1="146" x2="386" y2="146"/></g>
    <g font-size="9.5" fill="#ff3b21" text-anchor="start"><text x="396" y="104">420 m²</text><text x="396" y="138">480 m²</text><text x="396" y="174">540 m²</text></g>
    <text x="300" y="210" font-size="12" fill="#777" text-anchor="middle">push the form, read the floor area</text>`),

  "rvt-data": D(`${cap(40, "SCHEDULES")}
    <rect x="178" y="84" width="244" height="24" fill="#f4f4f4" stroke="#111" stroke-width="1.1"/>
    <rect x="178" y="108" width="244" height="68" fill="#fff" stroke="#111" stroke-width="1.1"/>
    <g stroke="#dddddd" stroke-width="1"><line x1="178" y1="130" x2="422" y2="130"/><line x1="178" y1="153" x2="422" y2="153"/></g>
    <line x1="320" y1="84" x2="320" y2="176" stroke="#111" stroke-width="1.1"/>
    <g font-size="10.5" fill="#333"><text x="190" y="100">Room</text><text x="332" y="100">Area</text><text x="190" y="124">Gallery</text><text x="332" y="124" fill="#ff3b21">201 m²</text><text x="190" y="147">Lobby</text><text x="332" y="147">88 m²</text><text x="190" y="170">Office</text><text x="332" y="170">42 m²</text></g>
    <text x="300" y="208" font-size="12" fill="#777" text-anchor="middle">live tables from the model's data</text>`),

  "rvt-views": D(`${cap(40, "VIEWS FROM ONE MODEL")}
    <rect x="250" y="66" width="100" height="46" fill="#eef0f2" stroke="#111" stroke-width="1.4"/><text x="300" y="94" font-size="11" fill="#333" text-anchor="middle">model</text>
    <g stroke="#111" stroke-width="1.1" fill="none"><path d="M280 112 L168 148 m12 -7 l-12 7 l3 -11"/><path d="M300 112 L300 148 m-5 -9 l5 9 l5 -9"/><path d="M320 112 L432 148 m-3 -11 l3 11 l-12 -3"/></g>
    <g stroke="#111" stroke-width="1.2" fill="#fff"><rect x="118" y="148" width="56" height="40"/><rect x="272" y="148" width="56" height="40"/><rect x="426" y="148" width="56" height="40"/></g>
    <g font-size="10" fill="#777" text-anchor="middle"><text x="146" y="204">plan</text><text x="300" y="204">section</text><text x="454" y="204">3D</text></g>`),

  "rvt-docs": D(`${cap(40, "SHEETS")}
    <rect x="200" y="74" width="200" height="120" fill="#fff" stroke="#111" stroke-width="1.4"/>
    <rect x="214" y="88" width="120" height="64" fill="none" stroke="#111" stroke-width="1.1"/><path d="M230 140 L256 106 L282 138" fill="none" stroke="#111" stroke-width="1"/>
    <rect x="344" y="88" width="44" height="64" fill="#f7f7f7" stroke="#111" stroke-width="1"/>
    <rect x="214" y="162" width="174" height="22" fill="#f4f4f4" stroke="#111" stroke-width="1"/><text x="380" y="178" font-size="10" fill="#ff3b21" text-anchor="end">A-101</text>
    <text x="300" y="214" font-size="12" fill="#777" text-anchor="middle">views on a titled sheet</text>`),

  "rvt-graphics": D(`${cap(40, "PRESENTATION GRAPHICS")}
    <rect x="176" y="96" width="120" height="88" fill="#ff3b21" fill-opacity="0.12"/>
    <rect x="300" y="96" width="124" height="50" fill="#eaf0ec"/>
    <rect x="300" y="148" width="124" height="36" fill="#f1ece6"/>
    <path d="M170 90 h260 v100 h-260 z" fill="none" stroke="#111" stroke-width="3"/>
    <line x1="296" y1="96" x2="296" y2="184" stroke="#111" stroke-width="1.4"/>
    <text x="300" y="212" font-size="12" fill="#777" text-anchor="middle">poché + colour fill, not defaults</text>`),

  "rvt-phases": D(`${cap(40, "PHASING")}
    <path d="M150 170 L150 110 L230 110 L230 170" fill="none" stroke="#aaaaaa" stroke-width="1.6"/>
    <text x="190" y="190" font-size="10.5" fill="#aaa" text-anchor="middle">existing</text>
    <path d="M270 170 L270 110 L350 110" fill="none" stroke="#111" stroke-width="1.4" stroke-dasharray="6 5"/>
    <text x="312" y="190" font-size="10.5" fill="#777" text-anchor="middle">demolished</text>
    <path d="M390 170 L390 110 L470 110 L470 170" fill="none" stroke="#ff3b21" stroke-width="2"/>
    <text x="430" y="190" font-size="10.5" fill="#ff3b21" text-anchor="middle">new</text>
    <text x="300" y="216" font-size="12" fill="#777" text-anchor="middle">one model, three stories over time</text>`),

  // ── Adobe ────────────────────────────────────────────────────────────────
  "adobe-foundations": D(`${cap(40, "THE RIGHT APP")}
    <g stroke="#111" stroke-width="1.3"><rect x="100" y="100" width="70" height="56" rx="6" fill="#eef0f2"/><rect x="262" y="100" width="70" height="56" rx="6" fill="#f1ece6"/><rect x="424" y="100" width="70" height="56" rx="6" fill="#eaf0ec"/></g>
    <g font-size="13" font-weight="600" fill="#333" text-anchor="middle"><text x="135" y="134">Ps</text><text x="297" y="134">Ai</text><text x="459" y="134">Id</text></g>
    <g font-size="11" fill="#777" text-anchor="middle"><text x="135" y="180">raster</text><text x="297" y="180">vector</text><text x="459" y="180">layout</text></g>
    <text x="300" y="212" font-size="12" fill="#777" text-anchor="middle">match the app to the task</text>`),

  "ps-basics": D(`${cap(40, "LAYERS & MASKS")}
    <g stroke="#111" stroke-width="1.3"><rect x="200" y="92" width="200" height="26" fill="#fff"/><rect x="200" y="124" width="200" height="26" fill="#fff"/><rect x="200" y="156" width="200" height="26" fill="#f4f4f4"/></g>
    <rect x="208" y="98" width="14" height="14" fill="#ff3b21"/><rect x="226" y="98" width="14" height="14" fill="#111"/>
    <g font-size="11" fill="#333"><text x="250" y="109">cut-out + mask</text><text x="250" y="141">adjustment</text><text x="250" y="173">background</text></g>
    <text x="300" y="208" font-size="12" fill="#777" text-anchor="middle">mask, don't delete — stay editable</text>`),

  "ai-basics": D(`${cap(40, "ARTBOARDS & PEN")}
    <rect x="160" y="80" width="200" height="110" fill="#fff" stroke="#111" stroke-width="1.4"/>
    <text x="160" y="74" font-size="10" fill="#999">artboard</text>
    <path d="M190 160 C 230 100 300 100 340 150" fill="none" stroke="#111" stroke-width="1.8"/>
    <line x1="190" y1="160" x2="232" y2="118" stroke="#ff3b21" stroke-width="1"/><circle cx="232" cy="118" r="3" fill="#ff3b21"/>
    <g fill="#fff" stroke="#ff3b21" stroke-width="1.5"><rect x="186" y="156" width="8" height="8"/><rect x="336" y="146" width="8" height="8"/></g>
    <text x="380" y="206" font-size="12" fill="#777" text-anchor="middle">precise vector paths, any size</text>`),

  "ps-nondestructive": D(`${cap(40, "NON-DESTRUCTIVE")}
    <g stroke="#111" stroke-width="1.3" fill="#fff"><rect x="190" y="86" width="220" height="24"/><rect x="190" y="116" width="220" height="24"/><rect x="190" y="146" width="220" height="24"/></g>
    <g font-size="10.5" fill="#333"><text x="222" y="102">Curves (adjustment)</text><text x="222" y="132">Sky + mask</text><text x="222" y="162">Render (base)</text></g>
    <rect x="200" y="120" width="12" height="12" fill="#111"/><rect x="200" y="90" width="12" height="12" fill="#ff3b21"/>
    <text x="300" y="200" font-size="12" fill="#777" text-anchor="middle">masks · smart objects · adjustments</text>`),

  "ai-vector": D(`${cap(40, "PATHFINDER")}
    <circle cx="210" cy="128" r="34" fill="#eef0f2" stroke="#111" stroke-width="1.4"/>
    <rect x="228" y="100" width="56" height="56" fill="#f1ece6" fill-opacity="0.75" stroke="#111" stroke-width="1.4"/>
    <path d="M312 128 h44 m-12 -6 l12 6 l-12 6" stroke="#111" stroke-width="1.3" fill="none"/>
    <path d="M390 128 a34 34 0 0 1 34 -34 v34 h28 v28 h-62 z" fill="#ff3b21" fill-opacity="0.12" stroke="#ff3b21" stroke-width="1.5"/>
    <text x="300" y="208" font-size="12" fill="#777" text-anchor="middle">combine shapes: unite · subtract</text>`),

  "ps-collage": D(`${cap(40, "COLLAGE")}
    <g stroke="#111" stroke-width="1"><rect x="200" y="78" width="200" height="22" fill="#dfe7ee"/><rect x="200" y="104" width="200" height="22" fill="#eee6dd"/><rect x="200" y="130" width="200" height="22" fill="#e3ece4"/><rect x="200" y="156" width="200" height="22" fill="#f4f4f4"/></g>
    <g font-size="10" fill="#555" text-anchor="end"><text x="392" y="93">sky</text><text x="392" y="119">entourage</text><text x="392" y="145">texture</text><text x="392" y="171">base</text></g>
    <line x1="180" y1="78" x2="180" y2="178" stroke="#ff3b21" stroke-width="1.5"/><path d="M176 168 l4 12 l4 -12 z" fill="#ff3b21"/>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">composite layers into atmosphere</text>`),

  "id-layout": D(`${cap(40, "LAYOUT GRID")}
    <rect x="150" y="80" width="140" height="110" fill="#fff" stroke="#111" stroke-width="1.3"/><rect x="310" y="80" width="140" height="110" fill="#fff" stroke="#111" stroke-width="1.3"/>
    <g stroke="#eeeeee" stroke-width="1"><line x1="196" y1="80" x2="196" y2="190"/><line x1="244" y1="80" x2="244" y2="190"/><line x1="356" y1="80" x2="356" y2="190"/><line x1="404" y1="80" x2="404" y2="190"/></g>
    <rect x="162" y="92" width="116" height="50" fill="#eef0f2"/><rect x="162" y="150" width="60" height="28" fill="#f4f4f4"/>
    <rect x="322" y="92" width="116" height="36" fill="#eef0f2"/><g stroke="#ff3b21" stroke-width="1.2"><line x1="322" y1="142" x2="438" y2="142"/><line x1="322" y1="152" x2="410" y2="152"/></g>
    <text x="300" y="210" font-size="12" fill="#777" text-anchor="middle">a grid + placed images + styles</text>`),

  "id-print": D(`${cap(40, "PRINT-READY")}
    <rect x="210" y="80" width="180" height="110" fill="#eef0f2"/>
    <rect x="222" y="92" width="156" height="86" fill="#fff" stroke="#111" stroke-width="1.2" stroke-dasharray="4 3"/>
    <g stroke="#111" stroke-width="1.2"><path d="M210 68 v-10 M198 80 h-10 M390 68 v-10 M402 80 h10 M210 202 v10 M198 190 h-10 M390 202 v10 M402 190 h10"/></g>
    <text x="300" y="62" font-size="10" fill="#ff3b21" text-anchor="middle">bleed</text>
    <text x="300" y="226" font-size="12" fill="#777" text-anchor="middle">bleed + crop marks · preflight · package</text>`),

  "portfolio-systems": D(`${cap(40, "PORTFOLIO SYSTEM")}
    <g stroke="#111" stroke-width="1.2" fill="#fff"><rect x="120" y="92" width="100" height="74"/><rect x="250" y="92" width="100" height="74"/><rect x="380" y="92" width="100" height="74"/></g>
    <g fill="#eef0f2"><rect x="128" y="100" width="84" height="40"/><rect x="258" y="100" width="84" height="40"/><rect x="388" y="100" width="84" height="40"/></g>
    <g stroke="#ff3b21" stroke-width="1.1"><line x1="128" y1="150" x2="200" y2="150"/><line x1="258" y1="150" x2="330" y2="150"/><line x1="388" y1="150" x2="460" y2="150"/></g>
    <text x="300" y="200" font-size="12" fill="#777" text-anchor="middle">one grid + type + palette, every page</text>`),

  // ── Architectural Media ──────────────────────────────────────────────────
  "am-orthographic": D(`${cap(40, "PLAN · SECTION · ELEVATION")}
    <g stroke="#111" stroke-width="1.4" fill="none"><rect x="110" y="100" width="80" height="64" fill="#f4f4f4"/><rect x="132" y="100" width="16" height="20" fill="#fff"/></g>
    <text x="150" y="186" font-size="10.5" fill="#777" text-anchor="middle">plan</text>
    <path d="M250 164 L250 110 L330 110 L330 164" fill="none" stroke="#111" stroke-width="2.6"/><path d="M250 164 L330 164" stroke="#111" stroke-width="2.6"/>
    <text x="290" y="186" font-size="10.5" fill="#777" text-anchor="middle">section</text>
    <path d="M400 164 L400 116 L450 90 L500 116 L500 164 Z" fill="#fff" stroke="#111" stroke-width="1.4"/><rect x="418" y="130" width="16" height="34" fill="none" stroke="#111" stroke-width="1.4"/>
    <text x="450" y="186" font-size="10.5" fill="#777" text-anchor="middle">elevation</text>
    <text x="300" y="210" font-size="12" fill="#777" text-anchor="middle">the primary language; cut = heaviest</text>`),

  "am-hand": D(`${cap(40, "HAND DRAWING")}
    <path d="M150 150 C 200 90 260 200 320 120 C 360 70 420 160 470 110" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/>
    <path d="M150 160 C 205 105 255 205 322 132" fill="none" stroke="#cccccc" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M452 94 l30 -14 l8 16 l-30 14 z" fill="#ff3b21" fill-opacity="0.15" stroke="#ff3b21" stroke-width="1.3"/>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">think fast, loose, by hand</text>`),

  "am-diagram": D(`${cap(40, "THE DIAGRAM")}
    <rect x="180" y="92" width="240" height="92" fill="#f4f4f4" stroke="#111" stroke-width="1.3"/>
    <rect x="180" y="92" width="120" height="92" fill="#ff3b21" fill-opacity="0.12"/>
    <line x1="300" y1="92" x2="300" y2="184" stroke="#111" stroke-width="1.6" stroke-dasharray="5 4"/>
    <path d="M120 138 h54 m-12 -6 l12 6 l-12 6" stroke="#111" stroke-width="1.6" fill="none"/>
    <text x="300" y="210" font-size="12" fill="#777" text-anchor="middle">one idea, everything else stripped</text>`),

  "am-collage": D(`${cap(40, "COLLAGE · POST-DIGITAL")}
    <rect x="190" y="84" width="220" height="96" fill="#eef0f2" stroke="#111" stroke-width="1.3"/>
    <g stroke="#111" stroke-width="1.2" fill="none"><path d="M210 180 L210 120 L250 120 L250 180"/><path d="M300 180 L300 110 L348 110 L348 180"/></g>
    <g stroke="#111" stroke-width="1.3" fill="none"><circle cx="280" cy="150" r="8"/><line x1="280" y1="158" x2="280" y2="176"/></g>
    <rect x="360" y="96" width="40" height="30" fill="#fff" stroke="#111" stroke-width="1"/>
    <rect x="190" y="84" width="220" height="96" fill="#ff3b21" fill-opacity="0.05"/>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">flat, textured, atmospheric</text>`),

  "am-rendering": D(`${cap(40, "RENDERING")}
    <circle cx="150" cy="80" r="11" fill="none" stroke="#ff3b21" stroke-width="1.5"/><path d="M150 80 l-16 -12 M150 80 l-20 4 M150 80 l-6 -20" stroke="#ff3b21" stroke-width="1.3"/>
    <path d="M250 170 L250 104 L320 80 L390 104 L390 170 Z" fill="#fff" stroke="#111" stroke-width="1.5"/>
    <path d="M250 104 L320 128 L390 104 M320 128 L320 170" stroke="#111" stroke-width="1.3" fill="none"/>
    <path d="M320 128 L390 104 L390 170 L320 170 Z" fill="#ececec"/>
    <g stroke="#111" stroke-width="1.3" fill="#fff"><rect x="438" y="118" width="40" height="28"/><path d="M478 124 l16 -8 v32 l-16 -8 z"/></g>
    <text x="460" y="166" font-size="10" fill="#777" text-anchor="middle">camera</text>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">light · material · framed shot</text>`),

  "am-axon": D(`${cap(40, "EXPLODED AXON")}
    <g stroke="#111" stroke-width="1.4"><path d="M230 174 L320 204 L410 174 L320 144 Z" fill="#f7f7f7"/><path d="M232 120 L320 150 L408 120 L320 90 Z" fill="#eef0f2"/><path d="M250 72 L320 98 L390 72 L320 46 Z" fill="#fff"/></g>
    <g stroke="#ff3b21" stroke-width="1" stroke-dasharray="4 4"><line x1="320" y1="144" x2="320" y2="158"/><line x1="320" y1="90" x2="320" y2="104"/></g>
    <g font-size="10" fill="#777"><text x="416" y="124">floors</text><text x="398" y="68">roof</text><text x="416" y="178">ground</text></g>
    <text x="300" y="226" font-size="12" fill="#777" text-anchor="middle">pull apart to show the layers</text>`),

  "am-photoreal": D(`${cap(40, "PHOTOREALISM")}
    <rect x="180" y="80" width="240" height="104" fill="#eef0f2"/>
    <path d="M180 150 L260 110 L300 130 L360 96 L420 124 L420 184 L180 184 Z" fill="#dfe3e7"/>
    <circle cx="372" cy="106" r="12" fill="#fff" fill-opacity="0.8"/>
    <rect x="180" y="80" width="240" height="104" fill="none" stroke="#111" stroke-width="1.3"/>
    <path d="M196 170 h22" stroke="#ff3b21" stroke-width="1.4" fill="none"/><path d="M196 170 v-14" stroke="#ff3b21" stroke-width="1.4" fill="none"/>
    <text x="300" y="208" font-size="12" fill="#777" text-anchor="middle">PBR · real light · depth of field</text>`),

  "am-animation": D(`${cap(40, "ANIMATION")}
    <rect x="150" y="100" width="300" height="56" fill="#fff" stroke="#111" stroke-width="1.3"/>
    <g fill="#111"><rect x="156" y="104" width="6" height="8"/><rect x="156" y="144" width="6" height="8"/><rect x="226" y="104" width="6" height="8"/><rect x="226" y="144" width="6" height="8"/><rect x="296" y="104" width="6" height="8"/><rect x="296" y="144" width="6" height="8"/><rect x="366" y="104" width="6" height="8"/><rect x="366" y="144" width="6" height="8"/><rect x="438" y="104" width="6" height="8"/><rect x="438" y="144" width="6" height="8"/></g>
    <g stroke="#dddddd" stroke-width="1"><line x1="234" y1="100" x2="234" y2="156"/><line x1="304" y1="100" x2="304" y2="156"/><line x1="374" y1="100" x2="374" y2="156"/></g>
    <path d="M170 128 q 70 -30 140 0 t 130 0" fill="none" stroke="#ff3b21" stroke-width="1.6"/>
    <text x="300" y="186" font-size="11" fill="#ff3b21" text-anchor="middle">camera path</text>
    <text x="300" y="210" font-size="12" fill="#777" text-anchor="middle">a motivated move, kept short</text>`),

  "am-realtime": D(`${cap(40, "REAL-TIME & VR")}
    <rect x="170" y="84" width="180" height="106" rx="4" fill="#fff" stroke="#111" stroke-width="1.4"/>
    <path d="M180 178 L240 120 L280 150 L330 108 L340 178 Z" fill="#eef0f2"/>
    <rect x="170" y="84" width="180" height="106" rx="4" fill="none" stroke="#111" stroke-width="1.4"/>
    <circle cx="260" cy="140" r="16" fill="#fff" fill-opacity="0.85" stroke="#111" stroke-width="1.2"/><path d="M255 132 l12 8 l-12 8 z" fill="#ff3b21"/>
    <path d="M396 116 h70 a10 10 0 0 1 10 10 v18 a10 10 0 0 1 -10 10 h-22 l-10 10 l-10 -10 h-18 a10 10 0 0 1 -10 -10 v-18 a10 10 0 0 1 10 -10 z" fill="#f4f4f4" stroke="#111" stroke-width="1.4"/>
    <text x="430" y="176" font-size="10" fill="#777" text-anchor="middle">VR</text>
    <text x="300" y="212" font-size="12" fill="#777" text-anchor="middle">explore the model live</text>`),

  // ── Agentic Coding ───────────────────────────────────────────────────────
  "ac-mindset": D(`${cap(40, "VIBE-CODING")}
    <circle cx="150" cy="124" r="16" fill="none" stroke="#111" stroke-width="1.4"/><path d="M150 140 v22 M150 146 l-14 8 M150 146 l14 8" stroke="#111" stroke-width="1.4" fill="none"/>
    <text x="150" y="196" font-size="10.5" fill="#777" text-anchor="middle">you (author)</text>
    <path d="M186 120 h120 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.4" fill="none"/>
    <rect x="320" y="100" width="110" height="56" rx="6" fill="#ff3b21" fill-opacity="0.1" stroke="#ff3b21" stroke-width="1.5"/><text x="375" y="133" font-size="12" fill="#333" text-anchor="middle">agent</text>
    <path d="M375 156 q 0 42 -112 42 q -113 0 -113 -36" stroke="#111" stroke-width="1.2" fill="none" stroke-dasharray="5 4"/>
    <text x="300" y="216" font-size="12" fill="#777" text-anchor="middle">direct & verify, don't type</text>`),

  "ac-setup": D(`${cap(40, "FIRST SETUP")}
    <rect x="160" y="84" width="220" height="110" rx="5" fill="#111"/>
    <circle cx="176" cy="98" r="3" fill="#ff5f56"/><circle cx="188" cy="98" r="3" fill="#ffbd2e"/><circle cx="200" cy="98" r="3" fill="#27c93f"/>
    <g fill="#ffffff" font-family="ui-monospace, monospace" font-size="11"><text x="178" y="124">$ claude</text></g>
    <g fill="#ff8a7d" font-family="ui-monospace, monospace" font-size="11"><text x="178" y="148">make a page that…</text></g>
    <path d="M396 130 h26 l6 8 h44 v44 h-76 z" fill="#eef0f2" stroke="#111" stroke-width="1.2"/>
    <text x="300" y="216" font-size="12" fill="#777" text-anchor="middle">a tool, a folder, a tiny first goal</text>`),

  "ac-prompting": D(`${cap(40, "PROMPTING")}
    <rect x="120" y="96" width="120" height="80" fill="#fff" stroke="#111" stroke-width="1.2"/>
    <g stroke="#999999" stroke-width="1.2"><line x1="134" y1="116" x2="226" y2="116"/><line x1="134" y1="132" x2="226" y2="132"/><line x1="134" y1="148" x2="200" y2="148"/></g>
    <text x="180" y="192" font-size="10.5" fill="#ff3b21" text-anchor="middle">clear spec</text>
    <path d="M250 136 h44 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <rect x="320" y="96" width="120" height="80" fill="#eef0f2" stroke="#111" stroke-width="1.2"/><text x="380" y="142" font-size="11" fill="#333" text-anchor="middle">output</text>
    <path d="M380 176 q 0 32 -100 32 q -100 0 -100 -28" stroke="#ff3b21" stroke-width="1.3" fill="none" stroke-dasharray="5 4"/>
    <text x="300" y="212" font-size="12" fill="#777" text-anchor="middle">specify, then iterate in small steps</text>`),

  "ac-webapp": D(`${cap(40, "A SIMPLE WEB APP")}
    <rect x="180" y="84" width="240" height="106" rx="5" fill="#fff" stroke="#111" stroke-width="1.4"/>
    <rect x="180" y="84" width="240" height="22" rx="5" fill="#f4f4f4" stroke="#111" stroke-width="1.4"/>
    <circle cx="194" cy="95" r="3" fill="#cccccc"/><circle cx="206" cy="95" r="3" fill="#cccccc"/><circle cx="218" cy="95" r="3" fill="#cccccc"/>
    <rect x="208" y="124" width="184" height="18" fill="#eef0f2"/><rect x="208" y="150" width="100" height="22" fill="#ff3b21" fill-opacity="0.15" stroke="#ff3b21" stroke-width="1.2"/>
    <text x="258" y="165" font-size="10" fill="#ff3b21" text-anchor="middle">run</text>
    <text x="300" y="212" font-size="12" fill="#777" text-anchor="middle">one tool, one job, in the browser</text>`),

  "ac-data": D(`${cap(40, "DATA & THE KEY TRAP")}
    <g stroke="#111" stroke-width="1.3" fill="#fff"><rect x="74" y="106" width="96" height="44" rx="4"/><rect x="252" y="106" width="96" height="44" rx="4"/><rect x="430" y="106" width="96" height="44" rx="4"/></g>
    <g font-size="11" fill="#333" text-anchor="middle"><text x="122" y="124">browser</text><text x="300" y="121">function</text><text x="478" y="124">model</text></g>
    <text x="300" y="138" font-size="8.5" fill="#777" text-anchor="middle">(holds the key)</text>
    <path d="M170 128 h82 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <path d="M348 128 h82 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <circle cx="300" cy="90" r="6" fill="none" stroke="#ff3b21" stroke-width="1.4"/><path d="M300 96 v8" stroke="#ff3b21" stroke-width="1.4"/>
    <text x="318" y="86" font-size="9.5" fill="#ff3b21">key</text>
    <text x="300" y="200" font-size="12" fill="#777" text-anchor="middle">never put the key in browser code</text>`),

  "ac-harness": D(`${cap(40, "AGENT HARNESS")}
    <rect x="160" y="74" width="220" height="108" rx="10" fill="none" stroke="#111" stroke-width="1.4" stroke-dasharray="6 4"/>
    <rect x="220" y="98" width="100" height="60" rx="6" fill="#ff3b21" fill-opacity="0.1" stroke="#ff3b21" stroke-width="1.5"/><text x="270" y="133" font-size="11.5" fill="#333" text-anchor="middle">model</text>
    <g font-size="10" fill="#777"><text x="166" y="70">rules</text><text x="330" y="70">memory</text><text x="166" y="196">tools</text><text x="318" y="196">guardrails</text></g>
    <text x="300" y="222" font-size="12" fill="#777" text-anchor="middle">scaffolding makes it predictable</text>`),

  "ac-deploy": D(`${cap(40, "DEPLOY")}
    <g stroke="#111" stroke-width="1.3" fill="#f4f4f4"><rect x="70" y="106" width="80" height="44" rx="4"/><rect x="220" y="106" width="80" height="44" rx="4"/><rect x="370" y="106" width="80" height="44" rx="4"/></g>
    <g font-size="10.5" fill="#333" text-anchor="middle"><text x="110" y="131">code</text><text x="260" y="131">GitHub</text><text x="410" y="131">Vercel</text></g>
    <path d="M150 128 h70 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <path d="M300 128 h70 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/>
    <path d="M450 128 h40 m-12 -5 l12 5 l-12 5" stroke="#ff3b21" stroke-width="1.4" fill="none"/>
    <circle cx="520" cy="128" r="18" fill="none" stroke="#ff3b21" stroke-width="1.5"/><path d="M502 128 h36 M520 110 a26 26 0 0 1 0 36 a26 26 0 0 1 0 -36" stroke="#ff3b21" stroke-width="1" fill="none"/>
    <text x="300" y="200" font-size="12" fill="#777" text-anchor="middle">push → auto-deploys live</text>`),

  "ac-design-tools": D(`${cap(40, "AUTOMATE DESIGN SOFTWARE")}
    <rect x="110" y="104" width="96" height="50" rx="6" fill="#ff3b21" fill-opacity="0.1" stroke="#ff3b21" stroke-width="1.5"/><text x="158" y="133" font-size="11" fill="#333" text-anchor="middle">agent</text>
    <path d="M206 129 h44 m-12 -5 l12 5 l-12 5" stroke="#111" stroke-width="1.3" fill="none"/><text x="228" y="112" font-size="9" fill="#ff3b21" text-anchor="middle">script</text>
    <rect x="262" y="92" width="120" height="74" fill="#fff" stroke="#111" stroke-width="1.4"/>
    <path d="M278 150 L308 110 L338 142 L366 104" fill="none" stroke="#111" stroke-width="1.4"/>
    <text x="322" y="184" font-size="10.5" fill="#777" text-anchor="middle">Rhino / Grasshopper</text>
    <text x="300" y="214" font-size="12" fill="#777" text-anchor="middle">turn a chore into a button</text>`),

  "ac-judgment": D(`${cap(40, "JUDGMENT & ETHICS")}
    <line x1="300" y1="80" x2="300" y2="170" stroke="#111" stroke-width="1.6"/><rect x="288" y="170" width="24" height="8" fill="#111"/>
    <line x1="210" y1="100" x2="390" y2="100" stroke="#111" stroke-width="1.6"/>
    <path d="M210 100 L190 140 L230 140 Z" fill="#eef0f2" stroke="#111" stroke-width="1.1"/>
    <path d="M390 100 L370 140 L410 140 Z" fill="#ff3b21" fill-opacity="0.1" stroke="#ff3b21" stroke-width="1.1"/>
    <g font-size="10" fill="#777" text-anchor="middle"><text x="210" y="158">offload</text><text x="390" y="158">build skill</text></g>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">know when to use it — and credit it</text>`),

  // ── Professional Practice ────────────────────────────────────────────────
  "pp-portfolio": D(`${cap(40, "INTERNSHIP PORTFOLIO")}
    <g stroke="#111" stroke-width="1.2" fill="#fff"><rect x="120" y="92" width="80" height="100"/><rect x="210" y="92" width="80" height="100"/><rect x="300" y="92" width="80" height="100"/></g>
    <rect x="392" y="80" width="90" height="116" fill="#fff" stroke="#ff3b21" stroke-width="1.8"/>
    <rect x="400" y="90" width="74" height="56" fill="#eef0f2"/><g stroke="#bbbbbb" stroke-width="1"><line x1="400" y1="158" x2="474" y2="158"/><line x1="400" y1="168" x2="452" y2="168"/></g>
    <text x="437" y="212" font-size="10.5" fill="#ff3b21" text-anchor="middle">your best, first</text>
    <text x="210" y="212" font-size="11" fill="#777" text-anchor="middle">curate to 3–5</text>`),

  "pp-readiness": D(`${cap(40, "SOFTWARE READINESS")}
    <g stroke="#111" stroke-width="1.3"><rect x="120" y="100" width="80" height="50" rx="6" fill="#eef0f2"/><rect x="222" y="100" width="80" height="50" rx="6" fill="#f1ece6"/><rect x="324" y="100" width="80" height="50" rx="6" fill="#eaf0ec"/><rect x="426" y="100" width="60" height="50" rx="6" fill="#f4ecf0"/></g>
    <g font-size="11.5" fill="#333" text-anchor="middle"><text x="160" y="129">Revit</text><text x="262" y="129">Rhino</text><text x="364" y="129">Adobe</text><text x="456" y="129">CAD</text></g>
    <path d="M150 168 l8 8 l16 -18" fill="none" stroke="#ff3b21" stroke-width="1.8"/>
    <text x="300" y="200" font-size="12" fill="#777" text-anchor="middle">be useful on day one</text>`),

  "pp-communication": D(`${cap(40, "COMMUNICATION")}
    <rect x="200" y="96" width="200" height="84" fill="#fff" stroke="#111" stroke-width="1.4"/>
    <path d="M200 96 L300 150 L400 96" fill="none" stroke="#111" stroke-width="1.3"/>
    <path d="M360 158 l10 10 l20 -24" fill="none" stroke="#ff3b21" stroke-width="1.8"/>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">confirm the goal + deadline, ask early</text>`),

  "pp-drawing-sets": D(`${cap(40, "DRAWING SETS")}
    <g stroke="#111" stroke-width="1.2" fill="#fff"><rect x="206" y="76" width="150" height="100"/><rect x="220" y="90" width="150" height="100"/><rect x="234" y="104" width="150" height="100"/></g>
    <rect x="244" y="114" width="100" height="58" fill="#eef0f2"/><path d="M256 164 L282 130 L308 162" fill="none" stroke="#111" stroke-width="1"/>
    <rect x="244" y="176" width="130" height="16" fill="#f4f4f4"/><text x="368" y="188" font-size="9" fill="#ff3b21" text-anchor="end">A-101</text>
    <text x="300" y="220" font-size="12" fill="#777" text-anchor="middle">sheets that reference each other</text>`),

  "pp-teamwork": D(`${cap(40, "TEAMWORK")}
    <rect x="220" y="92" width="160" height="80" rx="4" fill="#eef0f2" stroke="#111" stroke-width="1.3"/><text x="300" y="138" font-size="11" fill="#333" text-anchor="middle">shared model</text>
    <g stroke="#111" stroke-width="1.3" fill="#fff"><circle cx="150" cy="110" r="12"/><path d="M134 152 a16 18 0 0 1 32 0"/></g>
    <g stroke="#111" stroke-width="1.3" fill="#fff"><circle cx="450" cy="110" r="12"/><path d="M434 152 a16 18 0 0 1 32 0"/></g>
    <g stroke="#ff3b21" stroke-width="1.2"><line x1="170" y1="124" x2="220" y2="128"/><line x1="430" y1="124" x2="380" y2="128"/></g>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">standards so anyone can open your file</text>`),

  "pp-redlines": D(`${cap(40, "REDLINES")}
    <rect x="180" y="84" width="240" height="104" fill="#fff" stroke="#111" stroke-width="1.3"/>
    <path d="M200 160 L240 110 L290 150 L340 104" fill="none" stroke="#111" stroke-width="1.2"/>
    <circle cx="290" cy="150" r="14" fill="none" stroke="#ff3b21" stroke-width="1.8"/><path d="M304 140 l22 -16" stroke="#ff3b21" stroke-width="1.8" fill="none"/>
    <text x="352" y="120" font-size="10.5" fill="#ff3b21">fix this</text>
    <text x="300" y="210" font-size="12" fill="#777" text-anchor="middle">do exactly what's marked; ask if unclear</text>`),

  "pp-consultants": D(`${cap(40, "THE PROJECT TEAM")}
    <g stroke="#111" stroke-width="1.2"><line x1="300" y1="128" x2="150" y2="90"/><line x1="300" y1="128" x2="150" y2="170"/><line x1="300" y1="128" x2="450" y2="90"/><line x1="300" y1="128" x2="450" y2="170"/></g>
    <g fill="#eef0f2" stroke="#111" stroke-width="1.1"><circle cx="150" cy="90" r="16"/><circle cx="150" cy="170" r="16"/><circle cx="450" cy="90" r="16"/><circle cx="450" cy="170" r="16"/></g>
    <circle cx="300" cy="128" r="26" fill="#ff3b21" fill-opacity="0.12" stroke="#ff3b21" stroke-width="1.5"/><text x="300" y="132" font-size="9.5" fill="#333" text-anchor="middle">architect</text>
    <g font-size="9" fill="#555" text-anchor="middle"><text x="150" y="93">struct</text><text x="150" y="173">MEP</text><text x="450" y="93">civil</text><text x="450" y="173">land.</text></g>
    <text x="300" y="216" font-size="12" fill="#777" text-anchor="middle">a building is a team — you coordinate</text>`),

  "pp-deliverables": D(`${cap(40, "DELIVERABLES")}
    <line x1="110" y1="130" x2="470" y2="130" stroke="#111" stroke-width="1.4"/>
    <g fill="#fff" stroke="#111" stroke-width="1.3"><circle cx="150" cy="130" r="6"/><circle cx="280" cy="130" r="6"/></g>
    <rect x="446" y="112" width="36" height="36" fill="#ff3b21" fill-opacity="0.12" stroke="#ff3b21" stroke-width="1.5"/>
    <path d="M454 130 l6 7 l14 -16" fill="none" stroke="#ff3b21" stroke-width="1.8"/>
    <g font-size="10" fill="#777" text-anchor="middle"><text x="150" y="154">start</text><text x="280" y="154">draft</text><text x="464" y="166">QA · due</text></g>
    <text x="300" y="206" font-size="12" fill="#777" text-anchor="middle">own it end-to-end; check before handoff</text>`),

  "pp-career": D(`${cap(40, "CAREER PATH")}
    <path d="M120 180 L220 180 L220 144 L320 144 L320 108 L420 108 L420 72 L500 72" fill="none" stroke="#111" stroke-width="1.4"/>
    <g fill="#fff" stroke="#111" stroke-width="1.3"><circle cx="120" cy="180" r="6"/><circle cx="320" cy="144" r="6"/></g>
    <circle cx="500" cy="72" r="8" fill="#ff3b21"/>
    <g font-size="10" fill="#777"><text x="106" y="200">intern</text><text x="300" y="100">AXP · ARE</text><text x="470" y="60">licensed</text></g>
    <text x="300" y="222" font-size="12" fill="#777" text-anchor="middle">build breadth + mentors along the way</text>`)
};

export function getDiagram(id: string): string | undefined {
  return DIAGRAMS[id];
}
