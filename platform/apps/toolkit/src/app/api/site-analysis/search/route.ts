import { NextResponse } from "next/server";
import { searchSites, geocodeSearch, reverseGeocode } from "@/lib/site-analysis/datasources";

// Public search. No key, no auth — this is hard public data (D0). Modes:
//   ?mode=place         → any address / place, via OSM Nominatim (the default)
//   ?mode=superfund     → EPA NPL Superfund sites by name (tuned for the class)
//   ?lat=&lon=          → reverse-geocode a dropped map pin → one named place
// The model passes (contamination / synthesis) are the gated part, not this.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Reverse branch: a dropped pin (lat/lon) → a single named place. Always
  // resolves (falls back to a coordinate label) so a pin is never un-analyzable.
  const latRaw = url.searchParams.get("lat");
  const lonRaw = url.searchParams.get("lon");
  if (latRaw != null && lonRaw != null) {
    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "Invalid lat/lon." }, { status: 400 });
    }
    try {
      const place = await reverseGeocode(lat, lon);
      return NextResponse.json({ mode: "place", place });
    } catch (err: any) {
      console.error("site-analysis/search reverse:", err);
      return NextResponse.json({ error: err?.message || "Reverse geocode failed." }, { status: 500 });
    }
  }

  const q = (url.searchParams.get("q") || "").trim();
  const mode = url.searchParams.get("mode") === "superfund" ? "superfund" : "place";
  if (q.length < 2) {
    return NextResponse.json({ error: "Enter at least 2 characters." }, { status: 400 });
  }
  try {
    if (mode === "superfund") {
      const results = await searchSites(q);
      return NextResponse.json({ mode, results });
    }
    const results = await geocodeSearch(q);
    return NextResponse.json({ mode, results });
  } catch (err: any) {
    console.error("site-analysis/search:", err);
    return NextResponse.json(
      { error: err?.message || "Search failed." },
      { status: 500 }
    );
  }
}
