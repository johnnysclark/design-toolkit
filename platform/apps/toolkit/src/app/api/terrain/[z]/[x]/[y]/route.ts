// Terrain DEM tile proxy. MapLibre's `raster-dem` source must READ pixel values
// from the DEM PNGs to compute elevation — which fails cross-origin without CORS,
// and the public AWS terrarium tiles send no Access-Control-Allow-Origin header
// (so 3D terrain + hillshade render blank). Proxying them through our own origin
// makes them same-origin (no CORS needed) and lets us cache hard at the edge, so
// after the first fetch each immutable tile is served from Vercel's CDN, not this
// function. Keyless (Mapzen/AWS Terrain Tiles).
export const runtime = "nodejs";

const AWS_TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;
  // Validate to keep this a pure tile proxy (no arbitrary upstream fetch).
  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(y);
  if (!Number.isInteger(zi) || zi < 0 || zi > 15 || !Number.isInteger(xi) || !Number.isInteger(yi) || xi < 0 || yi < 0) {
    return new Response("bad tile", { status: 400 });
  }
  try {
    const upstream = await fetch(`${AWS_TERRARIUM}/${zi}/${xi}/${yi}.png`, {
      signal: AbortSignal.timeout(12000)
    });
    if (!upstream.ok) return new Response("tile not found", { status: upstream.status });
    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": "image/png",
        // Terrain is immutable — cache hard so the edge serves repeats, not us.
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch {
    return new Response("upstream error", { status: 502 });
  }
}
