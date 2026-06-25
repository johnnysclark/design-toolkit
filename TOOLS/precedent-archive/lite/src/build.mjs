// Assembles the self-contained lite/index.html.
//
// For each image it TRIES Wikimedia Commons (real photo + author/license/source) and
// FALLS BACK to the offline SVG illustration when the network is unavailable or a file
// can't be resolved. So: run it here (Commons blocked) → an all-illustration demo that
// works offline; run it on a normal network → the same demo with the real photographs.
//
// Node >= 18, zero dependencies (global fetch only).
//
//   node src/build.mjs

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ILLUSTRATIONS } from "./illustrations.mjs";
import { ARCHIVE } from "./data.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = "PrecedentArchiveDemo/0.1 (educational; offline-first)";
const API = "https://commons.wikimedia.org/w/api.php";
const TIMEOUT = 15000;

const svgDataUri = (key) =>
  "data:image/svg+xml;base64," + Buffer.from(ILLUSTRATIONS[key] || "", "utf8").toString("base64");

const stripHtml = (s) =>
  String(s || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally { clearTimeout(t); }
}

async function commonsThumb(title) {
  const url = `${API}?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1100&titles=${encodeURIComponent(title)}`;
  const j = await getJson(url);
  const pages = j.query?.pages || {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl) throw new Error("no thumburl for " + title);
  const res = await fetch(info.thumburl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("thumb HTTP " + res.status);
  const mime = res.headers.get("content-type") || "image/jpeg";
  const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  const meta = info.extmetadata || {};
  return {
    src: `data:${mime.split(";")[0]};base64,${b64}`,
    credit: {
      author: stripHtml(meta.Artist?.value) || "unknown",
      license: stripHtml(meta.LicenseShortName?.value) || "see source",
      sourceUrl: info.descriptionurl || ""
    }
  };
}

async function searchTitle(query) {
  const url = `${API}?action=query&format=json&list=search&srnamespace=6&srlimit=1&srsearch=${encodeURIComponent(query)}`;
  const j = await getJson(url);
  return j.query?.search?.[0]?.title || null;
}

// Resolve one image to { src, credit }, real photo if reachable else SVG illustration.
async function resolveImage(spec, label) {
  const attempts = [];
  if (spec.commonsFile) attempts.push(spec.commonsFile);
  for (const title of attempts) {
    try { const r = await commonsThumb(title); console.log(`  ✓ photo: ${label} ← ${title}`); return r; }
    catch (e) { /* try next */ }
  }
  if (spec.commonsQuery) {
    try {
      const t = await searchTitle(spec.commonsQuery);
      if (t) { const r = await commonsThumb(t); console.log(`  ✓ photo: ${label} ← search:"${spec.commonsQuery}" → ${t}`); return r; }
    } catch (e) { /* fall through */ }
  }
  console.log(`  • illustration: ${label}`);
  return { src: svgDataUri(spec.illustration), credit: { placeholder: true } };
}

async function main() {
  let real = 0, placeholder = 0;
  const entries = [];
  for (const e of ARCHIVE.entries) {
    const images = [];
    for (const img of e.images) {
      const { src, credit } = await resolveImage(img, `${e.title} / ${img.illustration}`);
      credit.placeholder ? placeholder++ : real++;
      images.push({
        src, credit,
        alt: img.alt || "", altSource: img.altSource || (img.alt ? "human" : "empty"),
        caption: img.caption || "", primary: !!img.primary, tactilePrepped: false,
        ...(img.cannedAlt ? { cannedAlt: img.cannedAlt } : {})
      });
    }
    entries.push({ id: e.id, title: e.title, type: e.type, tags: e.tags || [], notes: e.notes || "",
      sources: e.sources || [], related: e.related || [], updated: e.updated || "", images });
  }

  const orphans = [];
  for (const o of ARCHIVE.orphans) {
    const { src, credit } = await resolveImage(o, `orphan / ${o.illustration}`);
    credit.placeholder ? placeholder++ : real++;
    orphans.push({ id: o.id, name: o.name, src, credit, ...(o.cannedAlt ? { cannedAlt: o.cannedAlt } : {}) });
  }

  const DATA = { types: ARCHIVE.types, entries, orphans };
  const template = await readFile(join(HERE, "template.html"), "utf8");
  const html = template.replace("/*__DATA__*/null", JSON.stringify(DATA));
  const outPath = join(HERE, "..", "index.html");
  await writeFile(outPath, html);

  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`\nWrote ${outPath}`);
  console.log(`Images: ${real} real photo(s), ${placeholder} illustration(s). File size: ${kb} KB.`);
  if (placeholder && !real) console.log("(No network → all illustrations. Re-run on an unrestricted network to embed the real Commons photos.)");
}

main().catch((e) => { console.error("Build failed:", e); process.exit(1); });
