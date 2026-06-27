// diagram.js — the "why": a top-down plan of the optical setup, drawn to TRUE angles
// so a wide lens visibly opens a fat cone and a tele lens a thin one. Shows the
// camera, field-of-view cone, picture plane, focus plane, the depth-of-field band,
// the subject, and distance ticks. Pure SVG; rebuilt on every change.

const VB_W = 560, VB_H = 240;
const ORIGIN_X = 72, RIGHT_PAD = 22, Y_CENTER = 120;
const PLOT_W = VB_W - ORIGIN_X - RIGHT_PAD;

function niceMax(...meters) {
  const need = Math.max(...meters.filter((m) => isFinite(m)), 6) * 1.12;
  for (const m of [8, 12, 20, 32, 50, 80, 120]) if (m >= need) return m;
  return 160;
}
const fmt = (m) => (m >= 100 ? Math.round(m) : m >= 10 ? m.toFixed(1) : m.toFixed(2));

// params: { focalMm, fNumber, focusM, subjectDistanceM, hfovDeg, dofNear, dofFar,
//           markers:[{distance}], picturePlaneM }
export function updateDiagram(svg, p) {
  const maxD = niceMax(p.subjectDistanceM, p.focusM, isFinite(p.dofFar) ? p.dofFar : p.focusM * 1.8);
  const xScale = PLOT_W / maxD;          // px per metre, shared by both axes (true angles)
  const X = (d) => ORIGIN_X + Math.min(d, maxD) * xScale;
  const Y = (lat) => Y_CENTER - lat * xScale;
  const half = (p.hfovDeg * Math.PI) / 180 / 2;
  const coneLat = maxD * Math.tan(half);

  const farX = isFinite(p.dofFar) ? X(p.dofFar) : ORIGIN_X + PLOT_W;
  const nearX = X(Math.max(p.dofNear, 0));
  const focusX = X(p.focusM);
  const subjX = X(p.subjectDistanceM);
  const ppX = X(p.picturePlaneM);

  const ticks = (p.markers || [])
    .filter((m) => m.distance <= maxD)
    .map((m) => {
      const x = X(m.distance);
      return `<line x1="${x}" y1="${Y_CENTER - 4}" x2="${x}" y2="${Y_CENTER + 4}" stroke="#111" stroke-width="1"/>
              <text x="${x}" y="${Y_CENTER + 18}" text-anchor="middle" class="vg-dlabel">${m.distance}m</text>`;
    })
    .join("");

  svg.setAttribute("viewBox", `0 0 ${VB_W} ${VB_H}`);
  svg.innerHTML = `
    <defs>
      <clipPath id="vg-plot"><rect x="${ORIGIN_X - 2}" y="6" width="${PLOT_W + 4}" height="${VB_H - 12}"/></clipPath>
    </defs>
    <g clip-path="url(#vg-plot)">
      <!-- FOV cone -->
      <polygon points="${ORIGIN_X},${Y_CENTER} ${X(maxD)},${Y(coneLat)} ${X(maxD)},${Y(-coneLat)}"
               fill="#1f6feb" fill-opacity="0.10" stroke="none"/>
      <line x1="${ORIGIN_X}" y1="${Y_CENTER}" x2="${X(maxD)}" y2="${Y(coneLat)}" stroke="#1f6feb" stroke-width="1.2"/>
      <line x1="${ORIGIN_X}" y1="${Y_CENTER}" x2="${X(maxD)}" y2="${Y(-coneLat)}" stroke="#1f6feb" stroke-width="1.2"/>

      <!-- depth-of-field band -->
      <rect x="${nearX}" y="14" width="${Math.max(1, farX - nearX)}" height="${VB_H - 28}"
            fill="#159a5c" fill-opacity="0.16"/>
      <line x1="${nearX}" y1="14" x2="${nearX}" y2="${VB_H - 14}" stroke="#159a5c" stroke-width="1.4"/>
      <line x1="${farX}" y1="14" x2="${farX}" y2="${VB_H - 14}" stroke="#159a5c" stroke-width="1.4" ${isFinite(p.dofFar) ? "" : 'stroke-dasharray="4 3"'}/>

      <!-- optical axis -->
      <line x1="${ORIGIN_X}" y1="${Y_CENTER}" x2="${ORIGIN_X + PLOT_W}" y2="${Y_CENTER}" stroke="#111" stroke-width="1" stroke-dasharray="2 3"/>
      ${ticks}

      <!-- picture plane -->
      <line x1="${ppX}" y1="${Y_CENTER - 26}" x2="${ppX}" y2="${Y_CENTER + 26}" stroke="#111" stroke-width="2"/>

      <!-- focus plane -->
      <line x1="${focusX}" y1="20" x2="${focusX}" y2="${VB_H - 20}" stroke="#c2462f" stroke-width="1.6" stroke-dasharray="6 3"/>

      <!-- subject -->
      <circle cx="${subjX}" cy="${Y_CENTER}" r="4.5" fill="#c2462f"/>
    </g>

    <!-- camera body -->
    <rect x="${ORIGIN_X - 26}" y="${Y_CENTER - 11}" width="22" height="22" rx="3" fill="#111"/>
    <polygon points="${ORIGIN_X - 4},${Y_CENTER - 7} ${ORIGIN_X + 4},${Y_CENTER} ${ORIGIN_X - 4},${Y_CENTER + 7}" fill="#111"/>

    <!-- labels -->
    <text x="${ORIGIN_X - 28}" y="${Y_CENTER + 30}" class="vg-dlabel">camera</text>
    <text x="${ppX + 4}" y="${Y_CENTER - 30}" class="vg-dlabel">picture plane</text>
    <text x="${focusX}" y="16" text-anchor="middle" class="vg-dlabel" fill="#c2462f">focus ${fmt(p.focusM)}m</text>
    <text x="${(nearX + farX) / 2}" y="${VB_H - 4}" text-anchor="middle" class="vg-dlabel" fill="#0f7a48">depth of field${isFinite(p.dofFar) ? "" : " → ∞"}</text>
    <text x="${ORIGIN_X + 30}" y="${Y_CENTER - 38}" class="vg-dlabel" fill="#1f6feb">${p.hfovDeg.toFixed(0)}° field of view</text>
  `;
}
