// Clean, schematic SVG illustrations — one per demo image. These are the offline,
// license-safe stand-ins shown until the scrape pipeline (build.mjs) swaps in the real
// Wikimedia Commons photographs. Each is a self-contained <svg> (has xmlns so it renders
// as a data: URI). Palette matches the app: warm paper + ink, a little sky and accent.

const W = 1000, H = 750;
const frame = (inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#f1ece1"/>
${inner}
${label ? `<text x="28" y="${H - 26}" font-family="Georgia, 'Times New Roman', serif" font-size="26" fill="#8a4b2f" opacity="0.85">${label}</text>` : ""}
</svg>`;

const INK = "#1c1b18", SKY = "#dde5e9", STONE = "#e7dccb", CONCRETE = "#d8cfbf", WATER = "#b7c7cd", SHADE = "#cabfa9";

export const ILLUSTRATIONS = {
  // Salk — central court, water rill running to the Pacific horizon, flanking lab blocks.
  salkCourt: frame(`
    <rect x="0" y="0" width="${W}" height="300" fill="${SKY}"/>
    <polygon points="120,710 880,710 560,300 440,300" fill="${STONE}" stroke="${INK}" stroke-width="3"/>
    <polygon points="120,710 440,300 440,150 120,500" fill="${CONCRETE}" stroke="${INK}" stroke-width="4"/>
    <polygon points="880,710 560,300 560,150 880,500" fill="${CONCRETE}" stroke="${INK}" stroke-width="4"/>
    <polygon points="491,710 509,710 504,303 496,303" fill="${WATER}" stroke="#9fb2b8" stroke-width="1.5"/>
    <g stroke="${INK}" stroke-width="2.5" fill="${SHADE}">
      <polygon points="170,470 250,440 250,360 170,388"/>
      <polygon points="300,418 380,392 380,322 300,346"/>
      <polygon points="830,470 750,440 750,360 830,388"/>
      <polygon points="700,418 620,392 620,322 700,346"/>
    </g>
    <line x1="120" y1="300" x2="880" y2="300" stroke="${INK}" stroke-width="1.5" opacity="0.5"/>`,
    "Salk Institute — court on axis"),

  // Kimbell — row of cycloid barrel vaults (elevation).
  kimbellExterior: frame(`
    <rect x="0" y="0" width="${W}" height="430" fill="${SKY}"/>
    <g stroke="${INK}" stroke-width="4">
      ${[0,1,2,3,4].map(i => {
        const x = 120 + i*152;
        return `<path d="M ${x} 430 Q ${x+76} 300 ${x+152} 430 Z" fill="${STONE}"/>`;
      }).join("")}
      <rect x="120" y="430" width="760" height="210" fill="${CONCRETE}"/>
      ${[0,1,2,3,4].map(i => `<line x1="${120+i*152}" y1="430" x2="${120+i*152}" y2="640" />`).join("")}
      <line x1="120" y1="640" x2="880" y2="640"/>
    </g>
    <g stroke="${INK}" stroke-width="2" fill="${SHADE}">
      ${[0,1,2,3].map(i => `<rect x="${175+i*152}" y="500" width="60" height="140"/>`).join("")}
    </g>`,
    "Kimbell Art Museum — vaulted bays"),

  // Kimbell interior — a single cycloid vault with the apex light-slot and reflector.
  kimbellInterior: frame(`
    <path d="M 120 250 Q 500 60 880 250 L 880 300 Q 500 120 120 300 Z" fill="${CONCRETE}" stroke="${INK}" stroke-width="4"/>
    <rect x="470" y="95" width="60" height="14" fill="#fff" stroke="${INK}" stroke-width="2"/>
    <path d="M 455 150 Q 500 132 545 150" fill="none" stroke="${INK}" stroke-width="3"/>
    <g stroke="#e8c878" stroke-width="3" opacity="0.9">
      <line x1="500" y1="115" x2="250" y2="300"/><line x1="500" y1="115" x2="750" y2="300"/>
      <line x1="500" y1="115" x2="380" y2="320"/><line x1="500" y1="115" x2="620" y2="320"/>
    </g>
    <line x1="120" y1="640" x2="880" y2="640" stroke="${INK}" stroke-width="4"/>
    <line x1="120" y1="300" x2="120" y2="640" stroke="${INK}" stroke-width="4"/>
    <line x1="880" y1="300" x2="880" y2="640" stroke="${INK}" stroke-width="4"/>
    <rect x="360" y="430" width="120" height="150" fill="${SHADE}" stroke="${INK}" stroke-width="2.5"/>`,
    "Kimbell — light slot at the vault crown"),

  // Exeter Library — the atrium's giant circular openings in the concrete inner wall.
  exeterLibrary: frame(`
    <rect x="140" y="110" width="720" height="530" fill="${CONCRETE}" stroke="${INK}" stroke-width="4"/>
    ${[[330,330],[670,330],[330,470],[670,470]].map(([cx,cy]) =>
      `<circle cx="${cx}" cy="${cy}" r="120" fill="${STONE}" stroke="${INK}" stroke-width="4"/>`).join("")}
    <g stroke="${INK}" stroke-width="2" opacity="0.8">
      ${[[330,330],[670,330],[330,470],[670,470]].map(([cx,cy]) =>
        `<line x1="${cx-110}" y1="${cy}" x2="${cx+110}" y2="${cy}"/><line x1="${cx}" y1="${cy-110}" x2="${cx}" y2="${cy+110}"/>`).join("")}
    </g>
    <line x1="500" y1="110" x2="500" y2="640" stroke="${INK}" stroke-width="2" opacity="0.4"/>`,
    "Phillips Exeter Library — atrium openings"),

  // Farnsworth — white steel-and-glass pavilion floating on slender columns.
  farnsworth: frame(`
    <rect x="0" y="470" width="${W}" height="280" fill="#cdd9cd"/>
    <rect x="150" y="300" width="700" height="34" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <rect x="150" y="470" width="700" height="26" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <rect x="210" y="334" width="580" height="136" fill="${SKY}" stroke="${INK}" stroke-width="2"/>
    <g stroke="${INK}" stroke-width="2" opacity="0.7">
      ${[0,1,2,3,4,5].map(i => `<line x1="${250+i*95}" y1="334" x2="${250+i*95}" y2="470"/>`).join("")}
    </g>
    <g stroke="${INK}" stroke-width="6">
      ${[180,360,540,720,820].map(x => `<line x1="${x}" y1="300" x2="${x}" y2="560"/>`).join("")}
    </g>
    <rect x="300" y="496" width="240" height="14" fill="${STONE}" stroke="${INK}" stroke-width="2"/>
    <rect x="330" y="510" width="180" height="12" fill="${STONE}" stroke="${INK}" stroke-width="2"/>`,
    "Farnsworth House — floating pavilion"),

  // Barcelona Pavilion — free plan: planar walls, column grid, reflecting pool, sculpture.
  barcelonaPavilion: frame(`
    <rect x="120" y="150" width="760" height="450" fill="${STONE}" stroke="${INK}" stroke-width="3"/>
    <g fill="${INK}">
      ${[0,1,2,3].flatMap(r => [0,1].map(c => {
        const x = 300 + c*360, y = 250 + r*90;
        return `<path d="M ${x-9} ${y-3} h6 v-6 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 z"/>`;
      })).join("")}
    </g>
    <rect x="150" y="430" width="260" height="140" fill="${WATER}" stroke="#9fb2b8" stroke-width="2"/>
    <circle cx="360" cy="500" r="16" fill="${SHADE}" stroke="${INK}" stroke-width="2"/>
    <g stroke="${INK}" stroke-width="10" stroke-linecap="square">
      <line x1="300" y1="180" x2="300" y2="300"/>
      <line x1="430" y1="350" x2="600" y2="350"/>
      <line x1="660" y1="200" x2="660" y2="360"/>
      <line x1="500" y1="470" x2="500" y2="570"/>
    </g>`,
    "Barcelona Pavilion — free plan"),

  // Pantheon — section through the coffered dome with the oculus and its light beam.
  pantheon: frame(`
    <rect x="250" y="380" width="500" height="280" fill="${CONCRETE}" stroke="${INK}" stroke-width="4"/>
    <rect x="270" y="400" width="460" height="260" fill="${STONE}"/>
    <path d="M 250 380 A 250 250 0 0 1 750 380 Z" fill="${CONCRETE}" stroke="${INK}" stroke-width="4"/>
    <g stroke="${INK}" stroke-width="1.6" fill="none" opacity="0.75">
      ${[210,170,130,90].map(r => `<path d="M ${500-r} 380 A ${r} ${r} 0 0 1 ${500+r} 380"/>`).join("")}
      ${[-60,-30,0,30,60].map(a => {
        const rad = (a-90)*Math.PI/180;
        return `<line x1="500" y1="380" x2="${(500+230*Math.cos(rad)).toFixed(0)}" y2="${(380+230*Math.sin(rad)).toFixed(0)}"/>`;
      }).join("")}
    </g>
    <rect x="470" y="128" width="60" height="14" fill="#fff" stroke="${INK}" stroke-width="2"/>
    <polygon points="478,140 522,140 640,660 600,660" fill="#f6e7bf" opacity="0.75"/>
    <line x1="270" y1="660" x2="730" y2="660" stroke="${INK}" stroke-width="4"/>`,
    "Pantheon — dome, coffers, oculus"),

  // Orphan — Salk travertine court detail (paving joints + water channel head).
  salkDetail: frame(`
    <rect x="120" y="120" width="760" height="510" fill="${STONE}" stroke="${INK}" stroke-width="3"/>
    <g stroke="#bfb49d" stroke-width="2">
      ${[1,2,3,4,5,6,7].map(i => `<line x1="120" y1="${120+i*64}" x2="880" y2="${120+i*64}"/>`).join("")}
      ${[1,2,3,4,5,6,7,8,9,10,11].map(i => `<line x1="${120+i*63}" y1="120" x2="${120+i*63}" y2="630"/>`).join("")}
    </g>
    <rect x="470" y="120" width="60" height="510" fill="${WATER}" stroke="#9fb2b8" stroke-width="2"/>
    <rect x="455" y="350" width="90" height="90" fill="${SHADE}" stroke="${INK}" stroke-width="3"/>
    <rect x="760" y="200" width="90" height="260" fill="${CONCRETE}" stroke="${INK}" stroke-width="3"/>
    <g stroke="${INK}" stroke-width="2">${[0,1,2,3].map(i => `<line x1="760" y1="${230+i*60}" x2="850" y2="${230+i*60}"/>`).join("")}</g>`,
    "Salk court — travertine + channel")
};
