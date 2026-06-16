// Frontend: call /api/research, render the dossier, build the verification
// worksheet + provenance log, and wire the Markdown/JSON downloads.

const $ = (id) => document.getElementById(id);
const form = $("form");
const statusEl = $("status");
const errorEl = $("error");
const resultsEl = $("results");

let lastResult = null;

const TAG = {
  verified: { glyph: "✓", cls: "verified", label: "verified" },
  "plausible-unverified": { glyph: "?", cls: "unverified", label: "unverified" },
  "likely-hallucination": { glyph: "⚠", cls: "halluc", label: "likely hallucination" }
};

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const topic = $("topic").value.trim();
  if (!topic) return;

  const payload = {
    topic,
    count: $("count").value,
    grounded: $("grounded").checked
  };

  errorEl.hidden = true;
  resultsEl.hidden = true;
  statusEl.hidden = false;
  statusEl.textContent = payload.grounded
    ? "Searching the web, assembling, then attacking the dossier… (this takes a bit)"
    : "Assembling, then attacking the dossier…";
  $("run").disabled = true;

  try {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    lastResult = data;
    render(data);
    statusEl.hidden = true;
    resultsEl.hidden = false;
  } catch (err) {
    statusEl.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = err.message;
  } finally {
    $("run").disabled = false;
  }
});

function render(data) {
  const { dossier, adversarial, meta } = data;

  $("restatement").innerHTML =
    `<strong>Interpreted as:</strong> ${esc(dossier.topic_restatement)} ` +
    `<span style="opacity:.7">— ${meta.grounded ? "web-grounded" : "model-only, unverified"}, ${esc(meta.model)}</span>`;

  renderMatrix(dossier.precedents);
  renderCards(dossier.precedents);
  renderAdversarial(adversarial);
  $("gaps").innerHTML =
    `<h2>What's missing</h2><div class="note">${esc(dossier.gaps)}</div>`;
  renderWorksheet(dossier.precedents);
  renderProvenance(data);
}

function renderMatrix(precedents) {
  const rows = precedents
    .map(
      (p) => `<tr>
        <td>${esc(p.name)}</td>
        <td>${esc(p.architect)}</td>
        <td>${esc(p.year)}</td>
        <td>${esc(p.location)}</td>
        <td>${esc(p.program)}</td>
        <td><span class="exist ${esc(p.existence_confidence)}">${esc(p.existence_confidence)}</span></td>
      </tr>`
    )
    .join("");
  $("matrix-wrap").innerHTML = `<h2>Comparison matrix</h2>
    <table><thead><tr>
      <th>Precedent</th><th>Architect</th><th>Year</th><th>Location</th><th>Program</th><th>Exists?</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

function renderCards(precedents) {
  const html = precedents
    .map((p) => {
      const claims = (p.claims || [])
        .map((c) => {
          const t = TAG[c.status] || TAG["plausible-unverified"];
          const src = c.source
            ? `<div class="src"><a href="${esc(c.source)}" target="_blank" rel="noopener">${esc(c.source)}</a></div>`
            : "";
          return `<div class="claim ${t.cls}">
            <div class="tag" title="${t.label}">${t.glyph}</div>
            <div class="body">
              <div>${esc(c.claim)}</div>
              <div class="reason">${esc(c.reason)}</div>
              ${src}
            </div>
          </div>`;
        })
        .join("");
      return `<div class="card">
        <h3>${esc(p.name)}</h3>
        <p class="byline">${esc(p.architect)} · ${esc(p.year)} · ${esc(p.location)} · ${esc(p.program)}
          &nbsp;<span class="exist ${esc(p.existence_confidence)}">${esc(p.existence_confidence)}</span></p>
        <p class="why">${esc(p.why_relevant)}</p>
        ${claims}
      </div>`;
    })
    .join("");
  $("cards").innerHTML = `<h2>Precedents</h2>${html}`;
}

function renderAdversarial(adv) {
  const crits = (adv.critiques || [])
    .map(
      (c) => `<div class="crit">
        <div class="verdict ${esc(c.relevance_verdict)}">${esc(c.relevance_verdict)}</div>
        <strong>${esc(c.name)}</strong>
        <div>${esc(c.strongest_case_against)}</div>
      </div>`
    )
    .join("");
  $("adversarial").innerHTML = `<h2>Devil's advocate — the case against</h2>
    ${crits}
    <div class="note"><strong>What an expert would notice:</strong> ${esc(adv.what_an_expert_would_notice)}</div>`;
}

// Worksheet = every claim NOT verified by a source. The student's homework.
function renderWorksheet(precedents) {
  const rows = [];
  for (const p of precedents) {
    for (const c of p.claims || []) {
      if (c.status === "verified") continue;
      rows.push(`<tr>
        <td>${esc(p.name)}</td>
        <td>${esc(c.claim)}</td>
        <td>${esc((TAG[c.status] || {}).label || c.status)}</td>
        <td class="check">☐ true</td>
        <td class="check">☐ false</td>
        <td></td>
      </tr>`);
    }
  }
  $("worksheet").innerHTML = `<h2>Verification worksheet</h2>
    <p style="color:var(--muted)">Every claim the tool could not back with a source. Check each one against a real source before you use it.</p>
    <table class="worksheet"><thead><tr>
      <th>Precedent</th><th>Claim to verify</th><th>Tool's flag</th><th>True</th><th>False</th><th>Source you found</th>
    </tr></thead><tbody>${rows.join("") || '<tr><td colspan="6">No unverified claims.</td></tr>'}</tbody></table>`;
}

function renderProvenance(data) {
  $("provenance").innerHTML = `<h2>Provenance log</h2>
    <pre class="provenance">${esc(provenanceText(data))}</pre>`;
}

// The course's four-line log: tool / asked / kept-changed-rejected / verified.
function provenanceText(data) {
  const { meta, dossier } = data;
  const total = dossier.precedents.reduce((n, p) => n + (p.claims || []).length, 0);
  const flagged = dossier.precedents.reduce(
    (n, p) => n + (p.claims || []).filter((c) => c.status === "likely-hallucination").length,
    0
  );
  return [
    `Tool:     Precedent Researcher (${meta.model}, ${meta.grounded ? "web-grounded" : "model-only"})`,
    `Asked:    "${meta.topic}" — ${meta.count} precedents, ${meta.generated_at}`,
    `Kept/changed/rejected:  produced ${dossier.precedents.length} precedents, ${total} atomic claims; ${flagged} self-flagged as likely hallucination. [you fill in what you kept]`,
    `Verified: [you fill in — see the verification worksheet above]`
  ].join("\n");
}

// --- Downloads -------------------------------------------------------------

$("dl-json").addEventListener("click", () => {
  if (!lastResult) return;
  download(`dossier.json`, JSON.stringify(lastResult, null, 2), "application/json");
});

$("dl-md").addEventListener("click", () => {
  if (!lastResult) return;
  download(`dossier.md`, toMarkdown(lastResult), "text/markdown");
});

function toMarkdown(data) {
  const { meta, dossier, adversarial } = data;
  const L = [];
  L.push(`# Precedent dossier — ${meta.topic}`, "");
  L.push(`> Interpreted as: ${dossier.topic_restatement}`);
  L.push(`> ${meta.grounded ? "Web-grounded" : "Model-only (unverified)"} · ${meta.model} · ${meta.generated_at}`, "");

  for (const p of dossier.precedents) {
    L.push(`## ${p.name}`);
    L.push(`*${p.architect} · ${p.year} · ${p.location} · ${p.program}* — exists: **${p.existence_confidence}**`, "");
    L.push(p.why_relevant, "");
    for (const c of p.claims || []) {
      const t = TAG[c.status] || {};
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
  L.push(`**What an expert would notice:** ${adversarial.what_an_expert_would_notice}`, "");

  L.push(`## Verification worksheet`, "");
  L.push(`| Precedent | Claim to verify | Tool's flag | True/False | Source you found |`);
  L.push(`|---|---|---|---|---|`);
  for (const p of dossier.precedents) {
    for (const c of p.claims || []) {
      if (c.status === "verified") continue;
      L.push(`| ${p.name} | ${c.claim.replace(/\|/g, "\\|")} | ${(TAG[c.status] || {}).label || c.status} | ☐ / ☐ |  |`);
    }
  }
  L.push("");

  L.push(`## Provenance log`, "```", provenanceText(data), "```", "");
  return L.join("\n");
}

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
