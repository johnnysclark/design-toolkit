// Tiny fetch helper for the keyless archive APIs: a descriptive User-Agent
// (Wikimedia etiquette — they throttle anonymous default agents) plus a hard
// timeout so one slow endpoint can't blow the route's 60s budget.

const UA =
  "AllMeansWorks-Librarian/0.1 (https://toolkit.allmeans.works; mailto:jsclark2@gmail.com)";

export async function fetchJson<T = any>(
  url: string,
  opts: { timeoutMs?: number; headers?: Record<string, string> } = {}
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        "Api-User-Agent": UA,
        Accept: "application/json",
        ...(opts.headers || {})
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
