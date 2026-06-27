import { NextResponse } from "next/server";
import { contextAt } from "@/lib/site-analysis/layers";

// Public, hard-data-only (D0). Nearby OpenStreetMap context geometry (building
// footprints, roads, water, green space) for a point, via the Overpass API — for
// BOTH map display and Rhino-importable context export. Kept in its own endpoint
// (not the core analyze pass) because the full-geometry query is heavier; the UI
// fetches it lazily when the student asks for surroundings. No key, no auth.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const latStr = url.searchParams.get("lat");
  const lonStr = url.searchParams.get("lon");
  const lat = Number(latStr);
  const lon = Number(lonStr);
  const radius = Number(url.searchParams.get("radius")) || 350;
  // Number(null) and Number("") are both 0, which passes isFinite — so reject
  // absent/empty params explicitly before the numeric check.
  if (latStr == null || lonStr == null || latStr.trim() === "" || lonStr.trim() === "" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Provide lat + lon." }, { status: 400 });
  }
  try {
    const context = await contextAt(lon, lat, radius);
    if (!context) {
      return NextResponse.json({ context: null, note: "No OpenStreetMap context found near this point." });
    }
    return NextResponse.json({ context });
  } catch (err: any) {
    console.error("site-analysis/context:", err);
    return NextResponse.json({ error: err?.message || "Context lookup failed." }, { status: 500 });
  }
}
