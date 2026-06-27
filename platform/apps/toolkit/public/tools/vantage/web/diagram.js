// diagram.js — the camera rig, drawn live next to the perspective view. Two modes
// share one drawer: a PLAN (top-down, horizontal field of view) and a SIDE elevation
// (vertical field of view, above a ground line, the cone tilting with the camera's
// pitch). Both show the view frustum to TRUE angles and shade the "area in focus" —
// the depth-of-field slab between the near and far limits, clipped to the cone.

const CONE = "#1f6feb", DOF = "#159a5c", FOC = "#c2462f", INK = "#111";

function niceMax(...m) {
  const need = Math.max(...m.filter((x) => isFinite(x)), 5) * 1.18;
  for (const v of [6, 8, 12, 20, 32, 50, 80, 120]) if (v >= need) return v;
  return 160;
}
const fmt = (m) => (m >= 100 ? Math.round(m) : m >= 10 ? m.toFixed(1) : m.toFixed(2));
const add = (p, d, s) => [p[0] + d[0] * s, p[1] + d[1] * s];
const pts = (a) => a.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
const line = (a, b, attr) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" ${attr}/>`;
function T(p, str, { anchor = "start", fill = INK, dx = 0, dy = 0 } = {}) {
  return `<text x="${p[0] + dx}" y="${p[1] + dy}" text-anchor="${anchor}" class="vg-dlabel" `
    + `style="fill:${fill};paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round">${str}</text>`;
}

// p: { mode:'plan'|'side', fovDeg, focusM, dofNear, dofFar, subjectDistanceM,
//      eyeHeightM, pitchDeg, markers:[{distance}] }
function drawRig(svg, p) {
  const side = p.mode === "side";
  const VB_W = 520, VB_H = side ? 250 : 196;
  const ORIGIN_X = 60, RIGHT_PAD = 16, plotW = VB_W - ORIGIN_X - RIGHT_PAD;
  const maxD = niceMax(p.subjectDistanceM, p.focusM, isFinite(p.dofFar) ? p.dofFar : p.focusM * 1.8);
  const scale = plotW / maxD;
  const groundY = VB_H - 20;
  const camY = side ? Math.max(40, groundY - p.eyeHeightM * scale) : VB_H / 2;
  const Cs = [ORIGIN_X, camY];

  const pitch = side ? (p.pitchDeg * Math.PI) / 180 : 0;
  const vHalf = (p.fovDeg * Math.PI) / 180 / 2;
  const ax = [Math.cos(pitch), -Math.sin(pitch)];
  const upDir = [Math.cos(pitch + vHalf), -Math.sin(pitch + vHalf)];
  const dnDir = [Math.cos(pitch - vHalf), -Math.sin(pitch - vHalf)];
  const onAxis = (d) => add(Cs, ax, d * scale);
  const coneUp = (d) => add(Cs, upDir, (d / Math.cos(vHalf)) * scale);
  const coneDn = (d) => add(Cs, dnDir, (d / Math.cos(vHalf)) * scale);

  const near = Math.max(0.05, p.dofNear);
  const far = isFinite(p.dofFar) ? Math.min(p.dofFar, maxD) : maxD;
  const focus = Math.min(Math.max(p.focusM, 0.05), maxD);
  const subj = Math.min(Math.max(p.subjectDistanceM, 0.1), maxD);
  const farOpen = !isFinite(p.dofFar);

  const ticks = (p.markers || []).filter((m) => m.distance <= maxD * 0.99).map((m) => {
    const a = onAxis(m.distance), perp = [ax[1], -ax[0]];
    return line(add(a, perp, 4), add(a, perp, -4), `stroke="${INK}" stroke-width="1"`)
      + T(add(a, [0, 1], 14), m.distance + "m", { anchor: "middle" });
  }).join("");

  let b = "";
  b += `<defs><clipPath id="vg-rc-${side ? "s" : "p"}"><rect x="${ORIGIN_X - 2}" y="4" width="${plotW + 4}" height="${VB_H - 8}"/></clipPath></defs>`;
  b += `<g clip-path="url(#vg-rc-${side ? "s" : "p"})">`;

  // field-of-view cone
  b += `<polygon points="${pts([Cs, coneUp(maxD), coneDn(maxD)])}" fill="${CONE}" fill-opacity="0.09"/>`;
  b += line(Cs, coneUp(maxD), `stroke="${CONE}" stroke-width="1.2"`);
  b += line(Cs, coneDn(maxD), `stroke="${CONE}" stroke-width="1.2"`);

  // the in-focus slab (area of play in focus) — DoF between near & far, clipped to the cone
  b += `<polygon points="${pts([coneUp(near), coneUp(far), coneDn(far), coneDn(near)])}" fill="${DOF}" fill-opacity="0.22"/>`;
  b += line(coneUp(near), coneDn(near), `stroke="${DOF}" stroke-width="1.5"`);
  b += line(coneUp(far), coneDn(far), `stroke="${DOF}" stroke-width="1.5" ${farOpen ? 'stroke-dasharray="5 3"' : ""}`);

  // optical axis + focus plane
  b += line(Cs, onAxis(maxD), `stroke="${INK}" stroke-width="1" stroke-dasharray="2 3" opacity="0.7"`);
  b += line(coneUp(focus), coneDn(focus), `stroke="${FOC}" stroke-width="1.6" stroke-dasharray="6 3"`);

  if (side) {
    // ground + a column down to it from the subject point on the axis
    b += line([ORIGIN_X - 2, groundY], [VB_W - RIGHT_PAD, groundY], `stroke="${INK}" stroke-width="1.4"`);
    const sp = onAxis(subj);
    b += line(sp, [sp[0], groundY], `stroke="${FOC}" stroke-width="1" opacity="0.5" stroke-dasharray="3 2"`);
  }
  b += ticks;
  // subject marker
  b += `<circle cx="${onAxis(subj)[0].toFixed(1)}" cy="${onAxis(subj)[1].toFixed(1)}" r="4.2" fill="${FOC}"/>`;
  b += `</g>`;

  // eye-level / horizon line (side) — drawn over the clip so the label reads
  if (side) {
    b += line([ORIGIN_X - 2, camY], [VB_W - RIGHT_PAD, camY], `stroke="${INK}" stroke-width="1" stroke-dasharray="7 5" opacity="0.8"`);
    b += T([VB_W - RIGHT_PAD, camY - 5], "eye level", { anchor: "end" });
    b += T([ORIGIN_X - 4, groundY + 14], "ground", { anchor: "start" });
  }

  // camera glyph
  b += `<circle cx="${Cs[0]}" cy="${Cs[1]}" r="5" fill="${INK}"/>`;
  b += line(Cs, onAxis(0.7), `stroke="${INK}" stroke-width="3"`);
  b += T([ORIGIN_X - 6, camY + (side ? -10 : 18)], "camera", { anchor: side ? "end" : "start" });

  // labels — all text is BLACK (house rule); the colour-coding lives in the lines.
  b += T(onAxis(maxD * 0.5), `${Math.round(p.fovDeg)}° ${side ? "vertical" : "horizontal"} FOV`, { anchor: "middle", dy: -8 });
  b += T(coneUp(focus), `focus ${fmt(p.focusM)} m`, { anchor: "middle", dy: -6 });
  const dofMid = coneDn((near + far) / 2);
  b += T(dofMid, `in focus${farOpen ? " → ∞" : ""}`, { anchor: "middle", dy: 14 });

  svg.setAttribute("viewBox", `0 0 ${VB_W} ${VB_H}`);
  svg.innerHTML = b;
}

export const updatePlan = (svg, p) => drawRig(svg, { ...p, mode: "plan" });
export const updateSide = (svg, p) => drawRig(svg, { ...p, mode: "side" });
