// SVG serialisation — command lists → a `d` string, layers → <path> elements,
// result → a complete, self-contained <svg> document sized in original-image px.

import type { Cmd, Layer, TraceResult } from "./types";

function num(v: number): string {
  if (Object.is(v, -0) || Math.abs(v) < 5e-3) return "0";
  const s = v.toFixed(2);
  return s.indexOf(".") >= 0 ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

export function cmdsToD(cmds: Cmd[]): string {
  let d = "";
  for (const c of cmds) {
    if (c.c === "M") d += `M${num(c.x)} ${num(c.y)}`;
    else if (c.c === "L") d += `L${num(c.x)} ${num(c.y)}`;
    else if (c.c === "C")
      d += `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`;
    else d += "Z";
  }
  return d;
}

export function layerToPath(layer: Layer): string {
  const d = layer.subpaths.map((sp) => cmdsToD(sp.cmds)).join("");
  if (!d) return "";
  if (layer.kind === "fill") {
    return `<path d="${d}" fill="${layer.color}" fill-rule="evenodd"/>`;
  }
  const sw = num(layer.width ?? 1);
  return `<path d="${d}" fill="none" stroke="${layer.color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

export function toSVG(res: TraceResult, background: string | null): string {
  const W = num(res.width);
  const H = num(res.height);
  const bg = background ? `<rect x="0" y="0" width="${W}" height="${H}" fill="${background}"/>` : "";
  const body = res.layers.map(layerToPath).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" ` +
    `viewBox="0 0 ${W} ${H}">${bg}${body}</svg>`
  );
}
