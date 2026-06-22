// Instructor dashboard. Reads the analytics endpoints (key-gated via the
// X-Instructor-Key header) and renders KPIs, sticking points, a mode×level grid,
// roster, questions, sketches, and a per-student trace. Vanilla JS — tables + CSS
// bars. Images are fetched with the key (the asset endpoint is gated) and shown
// via object URLs, keeping the key out of <img src> / logs.

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const TAG = { stable: "✓", "version-dependent": "?", "likely-wrong": "⚠" };
const MODES = ["rhino", "grasshopper", "ghpython"];
const LEVELS = ["beginner", "moderate", "advanced"];

const ctx = { classCode: "", key: "" };
const assetCache = new Map();

function api(path, params = {}) {
  const qs = new URLSearchParams({ class_code: ctx.classCode, ...params });
  return fetch(`/api/rhino/instructor/${path}?${qs}`, {
    headers: { "X-Instructor-Key": ctx.key }
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Request failed");
    return data;
  });
}

// Authenticated image load → object URL (cached). Used to hydrate <img data-asset>.
async function loadAsset(id) {
  if (assetCache.has(id)) return assetCache.get(id);
  const res = await fetch(`/api/rhino/asset/${id}`, { headers: { "X-Instructor-Key": ctx.key } });
  if (!res.ok) return null;
  const url = URL.createObjectURL(await res.blob());
  assetCache.set(id, url);
  return url;
}

function hydrateImages(root = document) {
  for (const img of root.querySelectorAll("img[data-asset]:not([data-loaded])")) {
    img.dataset.loaded = "1";
    loadAsset(img.dataset.asset).then((url) => {
      if (url) img.src = url;
    });
  }
}

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  ctx.classCode = $("class_code").value.trim();
  ctx.key = $("key").value;
  $("login-error").hidden = true;
  try {
    await api("overview"); // validates key + class
    $("class-label").textContent = ctx.classCode;
    $("login").hidden = true;
    $("dash").hidden = false;
    loadAll();
  } catch (err) {
    $("login-error").textContent = err.message;
    $("login-error").hidden = false;
  }
});

$("refresh").addEventListener("click", loadAll);

async function loadAll() {
  await Promise.all([loadKpis(), loadSticking(), loadMatrix(), loadRoster(), loadQuestions(), loadGallery()]);
}

async function loadKpis() {
  const o = await api("overview");
  $("kpis").innerHTML = [
    ["Students", o.students],
    ["Questions", o.questions],
    ["Today", o.questions_today],
    ["Open report-back gates", o.open_gates]
  ]
    .map(([k, v]) => `<div class="kpi"><div class="n">${esc(v)}</div><div class="k">${esc(k)}</div></div>`)
    .join("");
}

async function loadSticking() {
  const { tags } = await api("sticking-points");
  if (!tags.length) return ($("sticking").innerHTML = `<p class="muted">No tagged questions yet.</p>`);
  const max = Math.max(...tags.map((t) => Number(t.students)));
  $("sticking").innerHTML = tags
    .map(
      (t) => `<div class="bar-row">
        <div class="bar-label">${esc(t.tag)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(Number(t.students) / max) * 100}%"></div></div>
        <div class="bar-n">${esc(t.students)} students · ${esc(t.occurrences)}×</div>
      </div>`
    )
    .join("");
}

async function loadMatrix() {
  const { cells } = await api("matrix");
  const lookup = {};
  for (const c of cells) lookup[`${c.mode}|${c.level}`] = c.n;
  const head = `<tr><th></th>${LEVELS.map((l) => `<th>${l}</th>`).join("")}</tr>`;
  const rows = MODES.map(
    (m) =>
      `<tr><th>${m}</th>${LEVELS.map((l) => {
        const n = Number(lookup[`${m}|${l}`] || 0);
        return `<td class="${n ? "hot" : ""}">${n || ""}</td>`;
      }).join("")}</tr>`
  ).join("");
  $("matrix").innerHTML = `<table class="matrix">${head}${rows}</table>`;
}

async function loadRoster() {
  const { students } = await api("class");
  $("roster").innerHTML = `<table><thead><tr><th>Student</th><th>Questions</th><th>Conversations</th><th></th></tr></thead><tbody>${students
    .map(
      (s) => `<tr>
        <td>${esc(s.display_name)} <span class="muted">@${esc(s.handle)}</span></td>
        <td>${esc(s.questions || 0)}</td>
        <td>${esc(s.conversations || 0)}</td>
        <td><button class="link" data-student="${s.id}" data-name="${esc(s.display_name)}">view trace →</button></td>
      </tr>`
    )
    .join("")}</tbody></table>`;
  $("roster").querySelectorAll("button[data-student]").forEach((b) =>
    b.addEventListener("click", () => loadStudent(b.dataset.student, b.dataset.name))
  );
}

async function loadQuestions() {
  const { questions } = await api("questions", { limit: 50 });
  if (!questions.length) return ($("questions").innerHTML = `<p class="muted">No questions yet.</p>`);
  $("questions").innerHTML = questions
    .map(
      (q) => `<div class="qrow">
        <div class="qmeta"><span class="chip">${esc(q.mode)}</span><span class="chip">${esc(q.level)}</span>
          <span class="muted">${esc(q.display_name)}</span></div>
        <div class="qtext">${esc(q.question) || "<em>(attachment only)</em>"}</div>
        ${q.asset_id ? `<img class="thumb" data-asset="${q.asset_id}" alt="attachment" />` : ""}
      </div>`
    )
    .join("");
  hydrateImages($("questions"));
}

async function loadGallery() {
  const { assets } = await api("assets");
  if (!assets.length) return ($("gallery").innerHTML = `<p class="muted">No sketches uploaded yet.</p>`);
  $("gallery").innerHTML = assets
    .map(
      (a) => `<figure>
        <img data-asset="${a.id}" alt="sketch" />
        <figcaption>${esc(a.display_name)} · ${esc(a.kind)}</figcaption>
      </figure>`
    )
    .join("");
  hydrateImages($("gallery"));
}

async function loadStudent(id, name) {
  const { messages, traces } = await api(`student/${id}`);
  $("student-name").textContent = name;
  $("student-panel").hidden = false;

  const html = messages
    .map((m) => {
      if (m.role === "user") {
        return `<div class="t-user">${esc(m.question) || "<em>(attachment)</em>"}
          ${m.asset_id ? `<img class="thumb" data-asset="${m.asset_id}" alt="attachment" />` : ""}</div>`;
      }
      const a = m.response_json || {};
      const next = a.next_single_step || a.fill_this_in || a.pitfalls || "";
      const claims = (m.claims || [])
        .map((c) => `<span class="ci ${esc(c.status)}">${TAG[c.status] || "?"} ${esc(c.claim)}</span>`)
        .join("");
      const tags = (m.topic_tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("");
      return `<div class="t-tutor">
        <div class="muted">${esc(m.mode)} · ${esc(m.level)}</div>
        <div><strong>Why:</strong> ${esc(a.why || "")}</div>
        ${next ? `<div><strong>Next:</strong> ${esc(next)}</div>` : ""}
        <div class="claim-line">${claims}</div>
        <div class="chips">${tags}</div>
      </div>`;
    })
    .join("");

  const traceHtml = traces.length
    ? `<div class="traces"><h3>Report-back loop</h3>${traces
        .map(
          (t) => `<div class="trace ${t.resolved ? "done" : "open"}">
            <div class="muted">expected: ${esc(t.expected_symptom)}</div>
            <div>observed: ${esc(t.reported_observation) || "<em>still open</em>"}</div>
          </div>`
        )
        .join("")}</div>`
    : "";

  $("student-trace").innerHTML = html + traceHtml;
  hydrateImages($("student-trace"));
  $("student-panel").scrollIntoView({ behavior: "smooth" });
}
