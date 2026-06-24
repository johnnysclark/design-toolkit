"use client";

import { useState } from "react";

// --- claim tag styling -----------------------------------------------------
const TAG: Record<string, { glyph: string; label: string; cls: string }> = {
  verified: { glyph: "✓", label: "verified", cls: "border-green-300 bg-green-50" },
  "plausible-unverified": {
    glyph: "?",
    label: "unverified",
    cls: "border-amber-300 bg-amber-50"
  },
  "likely-hallucination": {
    glyph: "⚠",
    label: "likely hallucination",
    cls: "border-red-300 bg-red-50"
  }
};

const EXIST: Record<string, string> = {
  certain: "bg-green-100 text-green-800",
  likely: "bg-amber-100 text-amber-800",
  uncertain: "bg-red-100 text-red-800"
};

export default function LibrarianPage() {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(4);
  const [grounded, setGrounded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/librarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), count, grounded })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Librarian</h1>
      <p className="mt-2 max-w-2xl text-neutral-600">
        Builds a precedent dossier, then attacks it. Every claim is broken into
        atomic facts and tagged{" "}
        <span className="font-medium text-green-700">✓ verified</span> /{" "}
        <span className="font-medium text-amber-700">? unverified</span> /{" "}
        <span className="font-medium text-red-700">⚠ likely hallucination</span>{" "}
        — the unverified ones become your worksheet.
      </p>

      <form
        onSubmit={run}
        className="mt-6 space-y-3 rounded-xl border border-neutral-200 bg-white p-5"
      >
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={2}
          placeholder="e.g. adaptive reuse of industrial waterfront structures for public space"
          className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            Precedents
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-md border border-neutral-300 px-2 py-1"
            >
              {[2, 3, 4, 5, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={grounded}
              onChange={(e) => setGrounded(e.target.checked)}
            />
            Web-grounded (slower, attaches real citations)
          </label>
          <button
            type="submit"
            disabled={loading}
            className="ml-auto rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "Working…" : "Build dossier"}
          </button>
        </div>
      </form>

      {loading && (
        <p className="mt-4 text-sm text-neutral-500">
          {grounded
            ? "Searching the web, assembling, then attacking the dossier… this takes a bit."
            : "Assembling, then attacking the dossier…"}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {data && <Results data={data} />}
    </div>
  );
}

function Results({ data }: { data: any }) {
  const { dossier, adversarial, meta } = data;

  const unverified: { name: string; claim: string; status: string }[] = [];
  for (const p of dossier.precedents || []) {
    for (const c of p.claims || []) {
      if (c.status !== "verified")
        unverified.push({ name: p.name, claim: c.claim, status: c.status });
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-neutral-600">
          <span className="font-medium">Interpreted as:</span>{" "}
          {dossier.topic_restatement}{" "}
          <span className="text-neutral-400">
            — {meta.grounded ? "web-grounded" : "model-only, unverified"},{" "}
            {meta.model}
          </span>
        </p>
        <div className="ml-auto flex gap-2">
          <DownloadBtn
            label="JSON"
            filename="dossier.json"
            type="application/json"
            text={() => JSON.stringify(data, null, 2)}
          />
          <DownloadBtn
            label="Markdown"
            filename="dossier.md"
            type="text/markdown"
            text={() => toMarkdown(data)}
          />
        </div>
      </div>

      {/* precedent cards */}
      <section className="space-y-4">
        {(dossier.precedents || []).map((p: any, i: number) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-medium">{p.name}</h3>
              <span
                className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-xs",
                  EXIST[p.existence_confidence] || "bg-neutral-100 text-neutral-700"
                ].join(" ")}
              >
                exists: {p.existence_confidence}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-neutral-500">
              {[p.architect, p.year, p.location, p.program]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-2 text-sm">{p.why_relevant}</p>

            <div className="mt-3 space-y-2">
              {(p.claims || []).map((c: any, j: number) => {
                const t = TAG[c.status] || TAG["plausible-unverified"];
                return (
                  <div
                    key={j}
                    className={["flex gap-3 rounded-lg border p-3", t.cls].join(" ")}
                  >
                    <div
                      className="select-none text-lg leading-none"
                      title={t.label}
                    >
                      {t.glyph}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm">{c.claim}</div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {c.reason}
                      </div>
                      {c.source && (
                        <a
                          href={c.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 block break-all text-xs text-blue-700 underline"
                        >
                          {c.source}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* devil's advocate */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-medium">Devil&rsquo;s advocate — the case against</h2>
        <div className="mt-3 space-y-3">
          {(adversarial.critiques || []).map((c: any, i: number) => (
            <div key={i} className="border-l-2 border-neutral-300 pl-3">
              <div className="text-sm">
                <span className="mr-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs uppercase tracking-wide text-neutral-600">
                  {c.relevance_verdict}
                </span>
                <span className="font-medium">{c.name}</span>
              </div>
              <p className="mt-1 text-sm text-neutral-700">
                {c.strongest_case_against}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
          <span className="font-medium">What an expert would notice:</span>{" "}
          {adversarial.what_an_expert_would_notice}
        </p>
      </section>

      {/* gaps */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-medium">What&rsquo;s missing</h2>
        <p className="mt-2 text-sm text-neutral-700">{dossier.gaps}</p>
      </section>

      {/* verification worksheet */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-medium">Verification worksheet</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Every claim the tool could not back with a source. Check each against a
          real source before you use it.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-1 pr-3">Precedent</th>
                <th className="py-1 pr-3">Claim to verify</th>
                <th className="py-1 pr-3">Flag</th>
                <th className="py-1 pr-3">True / False</th>
              </tr>
            </thead>
            <tbody>
              {unverified.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-2 text-neutral-500">
                    No unverified claims.
                  </td>
                </tr>
              ) : (
                unverified.map((r, i) => (
                  <tr key={i} className="border-t border-neutral-100 align-top">
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3">{r.claim}</td>
                    <td className="py-2 pr-3 text-neutral-500">
                      {(TAG[r.status] || {}).label || r.status}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-neutral-400">
                      ☐ / ☐
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* provenance */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-medium">Provenance log</h2>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700">
          {provenanceText(data)}
        </pre>
      </section>
    </div>
  );
}

// --- provenance + downloads (ported from the original frontend) ------------

function provenanceText(data: any): string {
  const { meta, dossier } = data;
  const total = (dossier.precedents || []).reduce(
    (n: number, p: any) => n + (p.claims || []).length,
    0
  );
  const flagged = (dossier.precedents || []).reduce(
    (n: number, p: any) =>
      n + (p.claims || []).filter((c: any) => c.status === "likely-hallucination").length,
    0
  );
  return [
    `Tool:     Librarian (${meta.model}, ${meta.grounded ? "web-grounded" : "model-only"})`,
    `Asked:    "${meta.topic}" — ${meta.count} precedents, ${meta.generated_at}`,
    `Kept/changed/rejected:  produced ${(dossier.precedents || []).length} precedents, ${total} atomic claims; ${flagged} self-flagged as likely hallucination. [you fill in what you kept]`,
    `Verified: [you fill in — see the verification worksheet above]`
  ].join("\n");
}

function toMarkdown(data: any): string {
  const { meta, dossier, adversarial } = data;
  const L: string[] = [];
  L.push(`# Precedent dossier — ${meta.topic}`, "");
  L.push(`> Interpreted as: ${dossier.topic_restatement}`);
  L.push(
    `> ${meta.grounded ? "Web-grounded" : "Model-only (unverified)"} · ${meta.model} · ${meta.generated_at}`,
    ""
  );

  for (const p of dossier.precedents || []) {
    L.push(`## ${p.name}`);
    L.push(
      `*${p.architect} · ${p.year} · ${p.location} · ${p.program}* — exists: **${p.existence_confidence}**`,
      ""
    );
    L.push(p.why_relevant, "");
    for (const c of p.claims || []) {
      const t = TAG[c.status] || ({} as any);
      L.push(`- ${t.glyph || ""} **${(t.label || c.status).toUpperCase()}** — ${c.claim}`);
      L.push(`  - _why:_ ${c.reason}${c.source ? `  ·  source: ${c.source}` : ""}`);
    }
    L.push("");
  }

  L.push(`## What's missing`, dossier.gaps, "");

  L.push(`## Devil's advocate — the case against`, "");
  for (const c of adversarial.critiques || []) {
    L.push(`### ${c.name} — _${c.relevance_verdict}_`);
    L.push(c.strongest_case_against, "");
  }
  L.push(
    `**What an expert would notice:** ${adversarial.what_an_expert_would_notice}`,
    ""
  );

  L.push(`## Verification worksheet`, "");
  L.push(`| Precedent | Claim to verify | Tool's flag | True/False |`);
  L.push(`|---|---|---|---|`);
  for (const p of dossier.precedents || []) {
    for (const c of p.claims || []) {
      if (c.status === "verified") continue;
      L.push(
        `| ${p.name} | ${String(c.claim).replace(/\|/g, "\\|")} | ${(TAG[c.status] || {}).label || c.status} | ☐ / ☐ |`
      );
    }
  }
  L.push("");

  L.push(`## Provenance log`, "```", provenanceText(data), "```", "");
  return L.join("\n");
}

function DownloadBtn({
  label,
  filename,
  type,
  text
}: {
  label: string;
  filename: string;
  type: string;
  text: () => string;
}) {
  function onClick() {
    const blob = new Blob([text()], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100"
    >
      ↓ {label}
    </button>
  );
}
