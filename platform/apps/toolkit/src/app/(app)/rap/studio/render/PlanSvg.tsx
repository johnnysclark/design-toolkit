// 2D tactile plan — renders the shared plan model to SVG (north-up, 1-bit look).
// The same model rasterises to the PIAF swell-paper PNG, so screen == print.

import { buildPlanModel, PLAN_WEIGHTS, type DrawPrim } from "./planModel";
import type { State } from "../engine/types";

const WEIGHTS = PLAN_WEIGHTS;

export default function PlanSvg({ state, className, levelFilter = null }: { state: State; className?: string; levelFilter?: number | null }) {
  const { prims, bounds } = buildPlanModel(state, levelFilter);
  const { minX, minY, maxX, maxY } = bounds;
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  // World → SVG, flipping Y so the plan reads north-up.
  const fy = (y: number) => minY + maxY - y;

  return (
    <svg
      viewBox={`${minX} ${minY} ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="Tactile plan preview. The full model is described in text in the Read-back panel."
      style={{ background: "#fff", width: "100%", height: "100%", display: "block" }}
    >
      {prims.map((p, i) => (
        <Prim key={i} p={p} fy={fy} />
      ))}
    </svg>
  );
}

function Prim({ p, fy }: { p: DrawPrim; fy: (y: number) => number }) {
  if (p.kind === "line") {
    const d = p.pts.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${fy(pt.y)}`).join(" ");
    return (
      <path
        d={d}
        fill="none"
        stroke="#111"
        strokeWidth={WEIGHTS[p.weight]}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={p.dashed ? "3 2" : undefined}
      />
    );
  }
  if (p.kind === "fill") {
    const d = p.pts.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${fy(pt.y)}`).join(" ") + " Z";
    return <path d={d} fill="#111" stroke="none" />;
  }
  if (p.kind === "circle") {
    return <circle cx={p.c.x} cy={fy(p.c.y)} r={p.r} fill={p.fill ? "#111" : "none"} stroke="#111" strokeWidth={WEIGHTS.light} />;
  }
  // text — drawn upright (we flipped coords, not the canvas)
  return (
    <text
      x={p.at.x}
      y={fy(p.at.y)}
      fontSize={p.size}
      fill="#111"
      textAnchor={p.anchor === "middle" ? "middle" : "start"}
      dominantBaseline="middle"
      fontFamily={p.braille ? "'Apple Braille','Segoe UI Symbol',monospace" : "'IBM Plex Mono', monospace"}
      style={{ userSelect: "none" }}
    >
      {p.text}
    </text>
  );
}
