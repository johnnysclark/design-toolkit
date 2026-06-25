import { NextResponse } from "next/server";
import { searchSites, geocodeSearch } from "@/lib/site-analysis/datasources";

// Public search. No key, no auth — this is hard public data (D0). Two modes:
//   ?mode=place      → any address / place, via OSM Nominatim (the default)
//   ?mode=superfund  → EPA NPL Superfund sites by name (tuned for the class)
// The model passes (contamination / synthesis) are the gated part, not this.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
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
