"use client";

// Dependency-free SVG charts built from the ported geo.ts output. Bold, graphic,
// legible at small size. Each also exposes a plain-text/table summary via title
// + aria so the data isn't SVG-only (accessibility throughline).

import type { WindRose, SunPath, MonthStat } from "./types";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const r0fmt = (v: number | null) => (v == null ? "—" : Math.round(v).toString());

// Polar helper: bearing measured clockwise from north (0 = up), SVG y-down.
function polar(cx: number, cy: number, r: number, bearing: number): [number, number] {
  const a = ((bearing - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function pct(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}

// --- Wind rose -------------------------------------------------------------

const WIND_BANDS = ["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#0b1f5e"];

export function WindRoseChart({ rose }: { rose: WindRose }) {
  const size = 230;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 88;
  const totals = rose.matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const maxTotal = Math.max(...totals, 0.0001);
  const rings = [0.25, 0.5, 0.75, 1];

  const bandLabels = rose.bands
    .map((hi, i) => (i === 0 ? `<${hi}` : `${rose.bands[i - 1]}–${hi}`))
    .concat(`${rose.bands[rose.bands.length - 1]}+`);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full max-w-[260px]"
        role="img"
        aria-label={`Wind rose. Prevailing direction draws longest. Calm ${pct(rose.calmFraction)} of hours.`}
      >
        {/* grid rings */}
        {rings.map((f) => (
          <circle
            key={f}
            cx={cx}
            cy={cy}
            r={maxR * f}
            fill="none"
            stroke="#e5e5e5"
            strokeWidth={1}
          />
        ))}
        {/* cardinal spokes + labels */}
        {[0, 90, 180, 270].map((b) => {
          const [x2, y2] = polar(cx, cy, maxR, b);
          const [lx, ly] = polar(cx, cy, maxR + 12, b);
          return (
            <g key={b}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#e5e5e5" strokeWidth={1} />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-neutral-500"
                fontSize={11}
                fontWeight={700}
              >
                {["N", "E", "S", "W"][[0, 90, 180, 270].indexOf(b)]}
              </text>
            </g>
          );
        })}
        {/* stacked wedges */}
        {rose.matrix.map((row, d) => {
          const bearing = d * rose.sector;
          const a0 = bearing - rose.sector / 2;
          const a1 = bearing + rose.sector / 2;
          let r0 = 0;
          return (
            <g key={d}>
              {row.map((frac, b) => {
                const r1 = r0 + (frac / maxTotal) * maxR;
                if (r1 - r0 < 0.2) {
                  r0 = r1;
                  return null;
                }
                const pts = [
                  polar(cx, cy, r0, a0),
                  polar(cx, cy, r1, a0),
                  polar(cx, cy, r1, a1),
                  polar(cx, cy, r0, a1)
                ];
                r0 = r1;
                return (
                  <polygon
                    key={b}
                    points={pts.map((p) => p.join(",")).join(" ")}
                    fill={WIND_BANDS[b] ?? WIND_BANDS[WIND_BANDS.length - 1]}
                    stroke="#fff"
                    strokeWidth={0.5}
                  >
                    <title>{`${rose.dirs[d]} · ${bandLabels[b]} m/s · ${pct(frac)} of hours`}</title>
                  </polygon>
                );
              })}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        {bandLabels.map((l, i) => (
          <span key={l} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: WIND_BANDS[i] ?? WIND_BANDS[WIND_BANDS.length - 1] }}
            />
            {l}
          </span>
        ))}
        <span className="text-neutral-400">
          m/s · ring = {pct(maxTotal)} max · calm {pct(rose.calmFraction)}
        </span>
      </figcaption>
    </figure>
  );
}

// --- Sun path --------------------------------------------------------------

const SUN_COLORS: Record<string, string> = {
  summer: "#f59e0b",
  equinox: "#10b981",
  winter: "#3b82f6"
};

export function SunPathChart({ paths }: { paths: SunPath[] }) {
  const size = 230;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 88;
  // altitude 90° at centre, 0° (horizon) at the rim.
  const rFor = (alt: number) => (1 - Math.max(0, Math.min(90, alt)) / 90) * maxR;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full max-w-[260px]"
        role="img"
        aria-label="Sun path diagram for summer solstice, equinox and winter solstice. Centre is overhead; rim is the horizon."
      >
        {/* horizon + altitude rings (30°, 60°) */}
        {[0, 30, 60].map((alt) => (
          <circle
            key={alt}
            cx={cx}
            cy={cy}
            r={rFor(alt)}
            fill="none"
            stroke="#e5e5e5"
            strokeWidth={1}
          />
        ))}
        {[0, 90, 180, 270].map((b) => {
          const [x2, y2] = polar(cx, cy, maxR, b);
          const [lx, ly] = polar(cx, cy, maxR + 12, b);
          return (
            <g key={b}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#e5e5e5" strokeWidth={1} />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-neutral-500"
                fontSize={11}
                fontWeight={700}
              >
                {["N", "E", "S", "W"][[0, 90, 180, 270].indexOf(b)]}
              </text>
            </g>
          );
        })}
        {/* arcs */}
        {paths.map((p) => {
          if (p.points.length < 2) return null;
          const d = p.points
            .map((s, i) => {
              const [x, y] = polar(cx, cy, rFor(s.altitude), s.azimuth);
              return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");
          return (
            <path
              key={p.key}
              d={d}
              fill="none"
              stroke={SUN_COLORS[p.key] ?? "#737373"}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>{`${p.label} — peak altitude ${p.peakAltitude.toFixed(0)}°`}</title>
            </path>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        {paths.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: SUN_COLORS[p.key] ?? "#737373" }}
            />
            {p.label.split(" (")[0]} · peak {p.peakAltitude.toFixed(0)}°
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

// --- Monthly temperature + humidity ---------------------------------------

export function MonthlyClimate({
  temp,
  rh,
  tempUnit = "°C"
}: {
  temp: MonthStat[];
  rh: MonthStat[];
  tempUnit?: string;
}) {
  const w = 300;
  const h = 150;
  const padL = 30;
  const padR = 8;
  const padT = 10;
  const padB = 18;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const lows = temp.map((m) => m.min).filter((v): v is number => v != null);
  const highs = temp.map((m) => m.max).filter((v): v is number => v != null);
  const lo = lows.length ? Math.min(...lows) : 0;
  const hi = highs.length ? Math.max(...highs) : 1;
  const span = hi - lo || 1;
  const x = (i: number) => padL + (plotW * (i + 0.5)) / 12;
  const y = (v: number) => padT + plotH * (1 - (v - lo) / span);
  const colW = (plotW / 12) * 0.5;

  const meanPath = temp
    .map((m, i) => (m.mean == null ? null : `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(m.mean).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Monthly temperature (range and mean) in ${tempUnit}, with relative humidity.`}
      >
        {/* zero line if in range */}
        {lo < 0 && hi > 0 && (
          <line
            x1={padL}
            x2={w - padR}
            y1={y(0)}
            y2={y(0)}
            stroke="#d4d4d4"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}
        {/* axis labels */}
        {[hi, (hi + lo) / 2, lo].map((v, i) => (
          <text
            key={i}
            x={padL - 4}
            y={y(v)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-neutral-400"
            fontSize={9}
          >
            {Math.round(v)}
          </text>
        ))}
        {/* monthly min–max bars */}
        {temp.map((m, i) =>
          m.min == null || m.max == null ? null : (
            <rect
              key={i}
              x={x(i) - colW / 2}
              y={y(m.max)}
              width={colW}
              height={Math.max(1, y(m.min) - y(m.max))}
              rx={2}
              fill="#fcd9b6"
            >
              <title>{`${MONTH_NAMES[i]}: ${r0fmt(m.min)}–${r0fmt(m.max)}°, mean ${r0fmt(m.mean)}°`}</title>
            </rect>
          )
        )}
        {/* mean line */}
        {meanPath && (
          <path d={meanPath} fill="none" stroke="#ea580c" strokeWidth={2.5} strokeLinejoin="round" />
        )}
        {temp.map((m, i) =>
          m.mean == null ? null : <circle key={i} cx={x(i)} cy={y(m.mean)} r={2.2} fill="#ea580c" />
        )}
        {/* month ticks */}
        {MONTHS.map((mlabel, i) => (
          <text
            key={i}
            x={x(i)}
            y={h - 5}
            textAnchor="middle"
            className="fill-neutral-400"
            fontSize={9}
          >
            {mlabel}
          </text>
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-neutral-500">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#fcd9b6" }} />
          monthly range
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-4" style={{ background: "#ea580c" }} />
          mean ({tempUnit})
        </span>
        <RHStrip rh={rh} />
      </figcaption>
    </figure>
  );
}

function RHStrip({ rh }: { rh: MonthStat[] }) {
  const means = rh.map((m) => m.mean);
  return (
    <span className="inline-flex items-center gap-1 text-neutral-400" title="Mean relative humidity by month">
      RH
      <span className="inline-flex items-end gap-[1px]" aria-hidden>
        {means.map((v, i) => (
          <span
            key={i}
            className="inline-block w-[3px] rounded-sm bg-sky-400"
            style={{ height: `${Math.max(2, ((v ?? 0) / 100) * 14)}px` }}
          />
        ))}
      </span>
    </span>
  );
}
