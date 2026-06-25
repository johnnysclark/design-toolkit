// Generates the bundled sample-archive images (simple architectural line-art) so
// the app runs out of the box. Deterministic; safe to re-run. The sidecar notes
// that turn some of these into entries are committed alongside the images.
//
//   node seed.js

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = fileURLToPath(new URL("../sample-archive", import.meta.url));

const frame = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750" viewBox="0 0 1000 750">
  <rect width="1000" height="750" fill="#f4f1ea"/>
  <g fill="none" stroke="#1c1b18" stroke-width="6" stroke-linejoin="round">${inner}</g>
</svg>`;

const IMAGES = {
  "courtyard-house.png": frame(`
    <rect x="120" y="100" width="760" height="550"/>
    <rect x="370" y="280" width="260" height="190"/>
    <line x1="120" y1="280" x2="370" y2="280"/><line x1="120" y1="470" x2="370" y2="470"/>
    <line x1="630" y1="280" x2="880" y2="280"/><line x1="630" y1="470" x2="880" y2="470"/>
    <line x1="370" y1="100" x2="370" y2="280"/><line x1="630" y1="100" x2="630" y2="280"/>
    <line x1="370" y1="470" x2="370" y2="650"/><line x1="630" y1="470" x2="630" y2="650"/>`),

  "section-study.png": frame(`
    <line x1="100" y1="650" x2="900" y2="650"/>
    <line x1="140" y1="500" x2="860" y2="500"/>
    <line x1="140" y1="350" x2="860" y2="350"/>
    <polyline points="140,350 500,200 860,350"/>
    <line x1="200" y1="650" x2="200" y2="350"/><line x1="380" y1="650" x2="380" y2="350"/>
    <line x1="620" y1="650" x2="620" y2="350"/><line x1="800" y1="650" x2="800" y2="350"/>`),

  "facade-grid.png": frame(`
    <rect x="160" y="120" width="680" height="510"/>
    ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) =>
      `<rect x="${210 + c * 120}" y="${160 + r * 115}" width="80" height="80"/>`).join("")).join("")}`),

  "library-project/plan.png": frame(`
    <rect x="120" y="120" width="760" height="510"/>
    <line x1="120" y1="375" x2="520" y2="375"/>
    <line x1="520" y1="120" x2="520" y2="630"/>
    ${[0, 1, 2].map((i) => `<line x1="${180 + i * 90}" y1="140" x2="${180 + i * 90}" y2="360"/>`).join("")}
    <circle cx="700" cy="375" r="120"/>`),

  "library-project/interior.png": frame(`
    <polygon points="120,140 880,140 760,610 240,610"/>
    <line x1="240" y1="610" x2="120" y2="140"/><line x1="760" y1="610" x2="880" y2="140"/>
    <line x1="380" y1="610" x2="330" y2="180"/><line x1="620" y1="610" x2="670" y2="180"/>
    <line x1="240" y1="450" x2="760" y2="450"/><line x1="300" y1="300" x2="700" y2="300"/>`)
};

for (const [rel, svg] of Object.entries(IMAGES)) {
  const abs = join(ROOT, rel);
  await mkdir(dirname(abs), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(abs);
  console.log("wrote", rel);
}
console.log("Sample images ready in", ROOT);
