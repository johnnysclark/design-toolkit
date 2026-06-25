// Wikimedia Commons: resolves filenames → real image URLs + per-image license,
// and does targeted full-text searches (e.g. "Villa Savoye floor plan") to find
// drawings, sections, interiors, model photos. Licenses are PER IMAGE — we carry
// the LicenseShortName + Artist so the UI can attribute correctly. No API key.

import { fetchJson, stripHtml } from "./http";
import type { RelatedImage } from "./types";

const API = "https://commons.wikimedia.org/w/api.php";
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|tiff?|svg)$/i;

function pageToImage(page: any, kind?: string): RelatedImage | null {
  const info = page?.imageinfo?.[0];
  if (!info?.url || !IMAGE_EXT.test(info.url)) return null;
  const title: string = page.title || "";
  const ext = info.extmetadata || {};
  return {
    url: info.url,
    thumbUrl: info.thumburl || info.url,
    title: title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, ""),
    kind,
    source: "wikimedia-commons",
    sourceUrl:
      info.descriptionurl ||
      `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
    license: ext.LicenseShortName?.value,
    attribution: ext.Artist?.value ? stripHtml(ext.Artist.value) : undefined
  };
}

function mapPages(data: any, kind?: string): RelatedImage[] {
  const pages = data?.query?.pages;
  if (!pages) return [];
  return Object.values(pages)
    .map((p: any) => pageToImage(p, kind))
    .filter(Boolean) as RelatedImage[];
}

// Resolve bare P18 filenames (e.g. "Villa Savoye.jpg") to image records.
export async function imageInfo(filenames: string[], kind?: string): Promise<RelatedImage[]> {
  const titles = filenames
    .filter(Boolean)
    .map((f) => (f.startsWith("File:") ? f : `File:${f}`));
  if (!titles.length) return [];
  const url =
    `${API}?action=query&format=json&prop=imageinfo` +
    `&iiprop=url|extmetadata&iiurlwidth=480&titles=${encodeURIComponent(titles.join("|"))}`;
  const data = await fetchJson(url, { timeoutMs: 7000 });
  return mapPages(data, kind);
}

// All files in a building's Commons category (from Wikidata P373). This is the
// best free image source — a curated set of photos/drawings for the subject,
// far more relevant than full-text search.
export async function categoryImages(
  category: string,
  limit = 24,
  kind?: string
): Promise<RelatedImage[]> {
  const title = category.startsWith("Category:") ? category : `Category:${category}`;
  const url =
    `${API}?action=query&format=json&generator=categorymembers` +
    `&gcmtitle=${encodeURIComponent(title)}&gcmtype=file&gcmlimit=${limit}` +
    `&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480`;
  const data = await fetchJson(url, { timeoutMs: 7000 });
  return mapPages(data, kind);
}

// Full-text image search. `filetype:bitmap|drawing` biases toward actual images
// (drops PDFs/audio that otherwise dominate). `kind` tags the results with our
// best guess at what they are (the query usually encodes it).
export async function searchImages(
  query: string,
  limit = 6,
  kind?: string
): Promise<RelatedImage[]> {
  const url =
    `${API}?action=query&format=json&generator=search` +
    `&gsrsearch=${encodeURIComponent(query + " filetype:bitmap|drawing")}` +
    `&gsrnamespace=6&gsrlimit=${limit}` +
    `&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480`;
  const data = await fetchJson(url, { timeoutMs: 7000 });
  return mapPages(data, kind);
}
