// Wikipedia: the textual-context layer. A clean lead-paragraph summary + link
// for further reading. No API key. Both calls fail soft (return null).

import { fetchJson } from "./http";
import type { TextContext } from "./types";

const REST = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const API = "https://en.wikipedia.org/w/api.php";

export async function summary(title: string): Promise<TextContext | null> {
  try {
    const url = REST + encodeURIComponent(title.replace(/ /g, "_"));
    const data = await fetchJson(url, { timeoutMs: 6000 });
    if (!data || !data.extract) return null;
    return {
      source: "wikipedia",
      title: data.title || title,
      summary: data.extract,
      url:
        data.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`
    };
  } catch {
    return null;
  }
}

export async function searchTitle(query: string): Promise<string | null> {
  try {
    const url =
      `${API}?action=query&format=json&list=search&srlimit=1` +
      `&srsearch=${encodeURIComponent(query)}`;
    const data = await fetchJson(url, { timeoutMs: 6000 });
    return data?.query?.search?.[0]?.title || null;
  } catch {
    return null;
  }
}
