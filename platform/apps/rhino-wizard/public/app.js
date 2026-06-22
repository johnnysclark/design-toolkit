// Rhino Wizard student UI. Join → ask (SSE) → report-back gate. Renders the
// level-specific structured answer with claim-tag glyphs.

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const TAG = {
  stable: { glyph: "✓", cls: "stable", label: "stable" },
  "version-dependent": { glyph: "?", cls: "version", label: "version-dependent" },
  "likely-wrong": { glyph: "⚠", cls: "wrong", label: "likely wrong — check this" }
};

const state = {
  studentId: null,
  className: "",
  conversationId: null,
  mode: "grasshopper",
  level: "beginner",
  pendingAssetId: null,
  lastMessageId: null
};

// --- Join ------------------------------------------------------------------

$("join-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const class_code = $("class_code").value.trim();
  const handle = $("handle").value.trim();
  $("join-error").hidden = true;
  try {
    const res = await fetch("/api/rhino/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_code, handle, display_name: handle })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not join.");
    state.studentId = data.student_id;
    state.className = data.class_name;
    $("who-name").textContent = data.display_name;
    $("who-class").textContent = data.class_name;
    $("join").hidden = true;
    $("tutor").hidden = false;
    $("question").focus();
  } catch (err) {
    $("join-error").textContent = err.message;
    $("join-error").hidden = false;
  }
});

// --- Toggles ---------------------------------------------------------------

for (const segId of ["mode-seg", "level-seg"]) {
  const seg = $(segId);
  seg.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    [...seg.children].forEach((b) => b.classList.remove("on"));
    btn.classList.add("on");
    state[seg.dataset.name] = btn.dataset.v;
  });
}

// --- Attachments -----------------------------------------------------------

$("image").addEventListener("change", () => {
  const f = $("image").files[0];
  $("attach-name").textContent = f ? f.name : "";
});

$("ghx-toggle").addEventListener("click", () => {
  $("ghx").hidden = !$("ghx").hidden;
  if (!$("ghx").hidden) $("ghx").focus();
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function uploadIfNeeded() {
  const f = $("image").files[0];
  if (!f) return null;
  const data = await fileToBase64(f);
  const kind = /screenshot|grasshopper|gh/i.test(f.name) ? "gh_screenshot" : "sketch";
  const res = await fetch("/api/rhino/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: state.studentId, kind, media_type: f.type, data })
  });
  const out = await res.json();
  if (!res.ok) throw new Error(out.error || "Upload failed.");
  return out.asset_id;
}

// --- Ask (SSE) -------------------------------------------------------------

$("ask-form").addEventListener("submit", (e) => {
  e.preventDefault();
  send({});
});

$("gate-send").addEventListener("click", () => {
  const obs = $("gate-input").value.trim();
  if (!obs) return;
  send({ report_back: obs });
});

async function send({ report_back }) {
  const question = $("question").value.trim();
  const ghx = $("ghx").value.trim();
  if (!question && !report_back && !$("image").files[0] && !ghx) return;

  $("ask").disabled = true;
  let assetId = null;
  try {
    assetId = await uploadIfNeeded();
  } catch (err) {
    appendError(err.message);
    $("ask").disabled = false;
    return;
  }

  if (question || assetId || ghx) appendUser(question, $("image").files[0], ghx);
  if (report_back) appendReport(report_back);

  const bubble = appendAssistantPlaceholder();
  const payload = {
    student_id: state.studentId,
    conversation_id: state.conversationId,
    mode: state.mode,
    level: state.level,
    version: $("version").value,
    grounded: $("grounded").checked,
    question,
    asset_id: assetId,
    ghx_text: ghx || undefined,
    report_back
  };

  // Clear inputs.
  $("question").value = "";
  $("ghx").value = "";
  $("image").value = "";
  $("attach-name").textContent = "";
  hideGate();

  try {
    const res = await fetch("/api/rhino/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    // The gate returns a 409 JSON (not a stream).
    if (res.status === 409) {
      const g = await res.json();
      state.conversationId = g.conversation_id;
      bubble.remove();
      showGate(g.prompt);
      $("ask").disabled = false;
      return;
    }
    if (!res.ok && res.headers.get("content-type")?.includes("application/json")) {
      const err = await res.json();
      throw new Error(err.error || "Request failed.");
    }

    await readSse(res, bubble);
  } catch (err) {
    bubble.querySelector(".content").innerHTML = `<div class="error">${esc(err.message)}</div>`;
  } finally {
    $("ask").disabled = false;
  }
}

async function readSse(res, bubble) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const shimmer = bubble.querySelector(".shimmer");
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop();
    for (const frame of frames) {
      const ev = frame.match(/^event: (.+)$/m)?.[1];
      const data = frame.match(/^data: (.+)$/m)?.[1];
      if (!ev || !data) continue;
      const payload = JSON.parse(data);
      if (ev === "meta") {
        state.conversationId = payload.conversation_id;
        if (shimmer) shimmer.textContent = "thinking…";
      } else if (ev === "token") {
        if (shimmer) shimmer.textContent = "writing…";
      } else if (ev === "result") {
        state.lastMessageId = payload.message_id;
        bubble.querySelector(".content").innerHTML = renderAnswer(payload.level, payload.answer);
      } else if (ev === "error") {
        bubble.querySelector(".content").innerHTML = `<div class="error">${esc(payload.message)}</div>`;
      }
    }
  }
}

// --- Rendering -------------------------------------------------------------

function claimsHtml(claims) {
  if (!claims || !claims.length) return "";
  return (
    `<div class="claims">` +
    claims
      .map((c) => {
        const t = TAG[c.status] || TAG["version-dependent"];
        const src = c.source
          ? `<a class="src" href="${esc(c.source)}" target="_blank" rel="noopener">source</a>`
          : "";
        return `<div class="claim ${t.cls}"><span class="tag" title="${t.label}">${t.glyph}</span>
          <span class="ctext">${esc(c.claim)} <span class="reason">— ${esc(c.reason)}</span> ${src}</span></div>`;
      })
      .join("") +
    `</div>`
  );
}

function renderAnswer(level, a) {
  const tags = (a.topic_tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("");
  let body = `<div class="restate">${esc(a.restatement || "")}</div>`;

  if (level === "beginner") {
    body += `<div class="block"><h4>The shape of it</h4><div>${esc(a.skeleton)}</div></div>`;
    body += `<div class="block"><h4>Your next single step</h4><div>${esc(a.next_single_step)}</div></div>`;
    body += `<div class="block"><h4>Why</h4><div>${esc(a.why)}</div></div>`;
    body += claimsHtml(a.claims);
    body += `<div class="block check"><h4>Try it &amp; report back</h4>
      <div>${esc(a.check_yourself?.action)}</div>
      <div class="expect">Look for: <strong>${esc(a.check_yourself?.expected_symptom)}</strong></div></div>`;
  } else if (level === "moderate") {
    body += `<div class="block"><h4>Most of it</h4><pre>${esc(a.partial_snippet)}</pre></div>`;
    body += `<div class="block"><h4>You fill in</h4><div>${esc(a.fill_this_in)}</div></div>`;
    body += `<div class="block"><h4>Why</h4><div>${esc(a.why)}</div></div>`;
    body += claimsHtml(a.claims);
    body += `<div class="block check"><h4>Self-check</h4><div>${esc(a.self_check)}</div></div>`;
  } else {
    body += `<div class="block"><h4>Snippet</h4><pre>${esc(a.snippet)}</pre></div>`;
    if (a.alternatives?.length) {
      body += `<div class="block"><h4>Alternatives</h4>${a.alternatives
        .map((x) => `<div class="alt"><strong>${esc(x.approach)}</strong> — ${esc(x.tradeoff)}</div>`)
        .join("")}</div>`;
    }
    body += `<div class="block"><h4>Why</h4><div>${esc(a.why)}</div></div>`;
    body += claimsHtml(a.claims);
    body += `<div class="block check"><h4>Pitfalls</h4><div>${esc(a.pitfalls)}</div></div>`;
  }
  return `${body}<div class="chips">${tags}</div>`;
}

// --- Thread bubbles --------------------------------------------------------

function appendUser(question, file, ghx) {
  const div = document.createElement("div");
  div.className = "msg user";
  let extra = "";
  if (file) extra += `<div class="attach-note">📷 ${esc(file.name)}</div>`;
  if (ghx) extra += `<div class="attach-note">📄 pasted .ghx (${ghx.length} chars)</div>`;
  div.innerHTML = `<div class="content">${esc(question) || "<em>(attachment)</em>"}${extra}</div>`;
  $("thread").appendChild(div);
  scroll();
}

function appendReport(obs) {
  const div = document.createElement("div");
  div.className = "msg user report";
  div.innerHTML = `<div class="content"><span class="muted">reported:</span> ${esc(obs)}</div>`;
  $("thread").appendChild(div);
  scroll();
}

function appendAssistantPlaceholder() {
  const div = document.createElement("div");
  div.className = "msg tutor";
  div.innerHTML = `<div class="content"><span class="shimmer">thinking…</span></div>`;
  $("thread").appendChild(div);
  scroll();
  return div;
}

function appendError(msg) {
  const div = document.createElement("div");
  div.className = "msg tutor";
  div.innerHTML = `<div class="content"><div class="error">${esc(msg)}</div></div>`;
  $("thread").appendChild(div);
  scroll();
}

function showGate(prompt) {
  $("gate-prompt").textContent = prompt || "";
  $("gate").hidden = false;
  $("gate-input").value = "";
  $("gate-input").focus();
}
function hideGate() {
  $("gate").hidden = true;
}

function scroll() {
  window.scrollTo(0, document.body.scrollHeight);
}
