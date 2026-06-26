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
    <text x="420" y="206" font-size="12" fill="#777" text-anchor="middle">nested flat parts</text>`)
};

export function getDiagram(id: string): string | undefined {
  return DIAGRAMS[id];
}
