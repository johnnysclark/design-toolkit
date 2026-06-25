// Internet add: fetch a URL and pull Open Graph / oEmbed metadata + the primary
// image. Honest scope: this works on pages that publish OG/oEmbed tags. Arbitrary
// scraping is brittle, and login-walled sites (e.g. Instagram) will fail here and
// fall back to a manual stub — that's expected, not a bug.

const UA = "Mozilla/5.0 (compatible; PrecedentArchive/0.1; +local)";

function meta(html, prop) {
  // Match <meta property="og:x" content="..."> or name="..."; attributes in any order.
  const re = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${prop}["'][^>]*>`,
    "i"
  );
  const tag = html.match(re);
  if (!tag) return "";
  const c = tag[0].match(/content\s*=\s*["']([^"']*)["']/i);
  return c ? decodeEntities(c[1].trim()) : "";
}

function linkHref(html, relOrType) {
  const re = new RegExp(`<link[^>]+(?:rel|type)\\s*=\\s*["'][^"']*${relOrType}[^"']*["'][^>]*>`, "i");
  const tag = html.match(re);
  if (!tag) return "";
  const h = tag[0].match(/href\s*=\s*["']([^"']*)["']/i);
  return h ? decodeEntities(h[1].trim()) : "";
}

function titleTag(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].trim()) : "";
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#x?[0-9a-f]+;/gi, (m) => {
      const hex = /x/i.test(m);
      const n = parseInt(m.replace(/[^0-9a-f]/gi, ""), hex ? 16 : 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    });
}

function absolutize(maybeRelative, base) {
  try { return new URL(maybeRelative, base).href; } catch { return maybeRelative; }
}

// Returns { title, imageUrl, canonical, description, isDirectImage }.
export async function fetchUrlMeta(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
    redirect: "follow"
  });
  const finalUrl = res.url || url;
  const ct = (res.headers.get("content-type") || "").toLowerCase();

  if (ct.startsWith("image/")) {
    return { title: "", imageUrl: finalUrl, canonical: finalUrl, description: "", isDirectImage: true };
  }
  if (!ct.includes("html")) {
    return { title: "", imageUrl: "", canonical: finalUrl, description: "", isDirectImage: false };
  }

  const html = (await res.text()).slice(0, 1_500_000);
  const out = {
    title: meta(html, "og:title") || titleTag(html),
    imageUrl: meta(html, "og:image:secure_url") || meta(html, "og:image") || meta(html, "twitter:image"),
    canonical: linkHref(html, "canonical") || meta(html, "og:url") || finalUrl,
    description: meta(html, "og:description") || meta(html, "description"),
    isDirectImage: false
  };

  // oEmbed fallback for the image when OG has none.
  if (!out.imageUrl) {
    const oembed = linkHref(html, "json+oembed");
    if (oembed) {
      try {
        const o = await (await fetch(absolutize(oembed, finalUrl), { headers: { "User-Agent": UA } })).json();
        out.imageUrl = o.thumbnail_url || (o.type === "photo" ? o.url : "") || "";
        out.title = out.title || o.title || "";
      } catch { /* oEmbed is best-effort */ }
    }
  }

  out.imageUrl = out.imageUrl ? absolutize(out.imageUrl, finalUrl) : "";
  out.canonical = absolutize(out.canonical, finalUrl);
  return out;
}

// Download an image URL to a buffer; returns { buffer, ext }.
export async function downloadImage(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`Could not download image (HTTP ${res.status}).`);
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext =
    ct.includes("png") ? ".png" :
    ct.includes("webp") ? ".webp" :
    ct.includes("gif") ? ".gif" :
    ct.includes("svg") ? ".svg" :
    ct.includes("avif") ? ".avif" :
    (/\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.exec(url)?.[1] ? "." + RegExp.$1.toLowerCase().replace("jpeg", "jpg") : ".jpg");
  return { buffer, ext };
}
