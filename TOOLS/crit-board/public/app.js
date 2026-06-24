"use strict";
/* =======================================================================
   Studio Crit Board — front-end (vanilla JS, no build step).
   Talks to the Express API; the grid is a real <table>, the cell view holds
   the gallery/lightbox/uploader/threads, and admin is instructor-only.

   XSS discipline: ALL user-supplied text (names, captions, comments, titles,
   filenames) is rendered through createTextNode via el()/textContent — never
   innerHTML. Comments are shown to everyone, so this is load-bearing.
   ======================================================================= */

// ---- DOM helpers (mirrored from TOOLS/site-analyzer/web/public/app.js) -----
const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;                 // trusted static markup ONLY
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    n.append(kid?.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
};

// ---- theme (data-theme; initial value from OS, toggle persists locally) ----
const K_THEME = "critboard.theme";
(function initTheme() {
  let t = localStorage.getItem(K_THEME);
  if (t !== "light" && t !== "dark") {
    t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", t);
})();
function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(K_THEME, next);
  renderControls();
}

// ---- misc helpers ----------------------------------------------------------
let toastTimer = null;
function toast(msg, isErr) {
  let t = $("toast");
  if (!t) { t = el("div", { id: "toast" }); document.body.append(t); }
  t.className = isErr ? "err" : "";
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3600);
}
const go = async (fn) => { try { await fn(); } catch (e) { toast(e.message || "Something went wrong.", true); } };

function timeAgo(iso) {
  const then = new Date((iso || "").replace(" ", "T") + (/[Zz]|[+-]\d\d:?\d\d$/.test(iso) ? "" : "Z")).getTime();
  if (isNaN(then)) return "";
  const s = Math.round((Date.now() - then) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} ${m === 1 ? "min" : "mins"} ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} ${h === 1 ? "hr" : "hrs"} ago`;
  const d = Math.round(h / 24); if (d < 7) return `${d} ${d === 1 ? "day" : "days"} ago`;
  const w = Math.round(d / 7); if (w < 5) return `${w} ${w === 1 ? "wk" : "wks"} ago`;
  const mo = Math.round(d / 30); if (mo < 12) return `${mo} ${mo === 1 ? "mo" : "mos"} ago`;
  return `${Math.round(d / 365)} yr ago`;
}

// ---- API -------------------------------------------------------------------
async function apiSend(method, url, body) {
  const opts = { method };
  if (body !== undefined) { opts.headers = { "Content-Type": "application/json" }; opts.body = JSON.stringify(body); }
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (res.status === 401) { state.board = null; showScreen("screen-passcode"); throw new Error((data && data.error) || "Please sign in."); }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}
const apiGet = (u) => apiSend("GET", u);
const apiPost = (u, b) => apiSend("POST", u, b);
const apiPut = (u, b) => apiSend("PUT", u, b);
const apiPatch = (u, b) => apiSend("PATCH", u, b);
const apiDelete = (u) => apiSend("DELETE", u);

function apiUpload(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/cell/images");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText || "{}"); } catch { /* */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else if (xhr.status === 401) { showScreen("screen-passcode"); reject(new Error(data.error || "Please sign in.")); }
      else reject(new Error(data.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(formData);
  });
}

// ---- state + screen routing ------------------------------------------------
const state = { session: null, board: null, openCellRef: null, openCell: null };
const SCREENS = ["screen-passcode", "screen-name", "screen-board"];
function showScreen(id) { SCREENS.forEach((s) => { $(s).hidden = s !== id; }); }

const ME = () => state.board && state.board.me;
const ROLE = () => state.board && state.board.role;
const isInstructor = () => ROLE() === "instructor";
const isMyRow = (student) => !!student && student.name === ME();
const canUpload = (student) => isInstructor() || isMyRow(student);
const canManageImage = (im) => isInstructor() || im.uploader_name === ME();

// ---- boot ------------------------------------------------------------------
async function boot() {
  wireStatic();
  const s = await apiGet("/api/session");
  state.session = s;
  if (!s.ok) return showScreen("screen-passcode");
  if (s.needsName) { await loadRoster(); return showScreen("screen-name"); }
  await loadBoard();
  showScreen("screen-board");
}

async function loadRoster() {
  const data = await apiGet("/api/roster");
  const grid = $("name-grid");
  grid.replaceChildren();
  if (!data.students.length) {
    grid.append(el("p", { class: "hint" }, "No students on the roster yet. Ask an instructor to set up the board."));
  }
  data.students.forEach((s) =>
    grid.append(el("button", { type: "button", onclick: () => pickName(s.name) }, s.name)));
}

async function pickName(name) {
  await go(async () => {
    await apiPost("/api/pick-name", { name });
    await loadBoard();
    showScreen("screen-board");
  });
}

async function loadBoard() {
  state.board = await apiGet("/api/board");
  renderControls();
  renderGrid();
}

// ---- top bar ---------------------------------------------------------------
function renderControls() {
  $("studio-name").textContent = state.board.studioName || "Studio Crit Board";
  document.title = state.board.studioName || "Studio Crit Board";
  $("studio-sub").textContent = "";
  const c = $("controls");
  c.replaceChildren();
  c.append(
    el("span", { class: "role-chip" + (isInstructor() ? " instructor" : "") }, isInstructor() ? "Instructor" : "Student"),
    el("span", { class: "sub" }, "Signed in as "), el("strong", {}, ME() || "")
  );
  if (isInstructor()) c.append(el("button", { class: "ghost", onclick: openAdmin }, "Admin"));
  c.append(
    el("button", { class: "subtle", onclick: toggleTheme, "aria-label": "Toggle dark mode" },
      document.documentElement.getAttribute("data-theme") === "dark" ? "☀ Light" : "☾ Dark"),
    el("button", { class: "subtle", onclick: signOut }, "Sign out")
  );
}

async function signOut() {
  await go(async () => { await apiPost("/api/logout"); state.board = null; $("passcode").value = ""; showScreen("screen-passcode"); });
}

// ---- grid ------------------------------------------------------------------
function countFor(sid, wid) {
  return (state.board.counts && state.board.counts[`s${sid}_w${wid}`]) || { images: 0, threads: 0, comments: 0, thumbs: [], last: null };
}
function renderGrid() {
  const grid = $("grid");
  grid.replaceChildren();
  const { students, weeks } = state.board;
  const tas = state.board.tas || [];

  const thead = el("thead");
  const hr = el("tr");
  hr.append(el("th", { scope: "col", class: "corner", id: "corner" }, "Student \\ Week"));
  weeks.forEach((w) => hr.append(el("th", { scope: "col", id: "w" + w.id }, w.label)));
  thead.append(hr);
  grid.append(thead);

  if (!students.length || !weeks.length) {
    const tb = el("tbody");
    tb.append(el("tr", {}, el("td", { colspan: String(Math.max(1, weeks.length + 1)) },
      el("div", { class: "cell-empty", style: "padding:1rem" },
        isInstructor() ? "Empty board. Open Admin to add students (rows) and weeks (columns)."
                       : "The board hasn't been set up yet. Ask an instructor to add students and weeks."))));
    grid.append(tb);
    return;
  }

  // Group rows by TA (in TA order); an "Unassigned" group trails only if needed.
  // With no TAs defined, render a flat list (no section headers).
  const groups = [];
  if (tas.length) {
    for (const t of tas) groups.push({ ta: t, students: students.filter((s) => s.ta_id === t.id) });
    const un = students.filter((s) => !s.ta_id || !tas.some((t) => t.id === s.ta_id));
    if (un.length) groups.push({ ta: null, students: un });
  } else {
    groups.push({ ta: null, students, flat: true });
  }

  const totalCols = String(weeks.length + 1);
  const tbody = el("tbody");
  groups.forEach((g) => {
    if (!g.flat) {
      const label = g.ta ? g.ta.name : "Unassigned";
      tbody.append(el("tr", { class: "ta-row" },
        el("th", { class: "ta-head", colspan: totalCols, scope: "colgroup" },
          label, el("span", { class: "ta-count" }, ` · ${g.students.length} student${g.students.length === 1 ? "" : "s"}`))));
    }
    g.students.forEach((s) => tbody.append(studentRow(s, weeks)));
  });
  grid.append(tbody);
}

function studentRow(s, weeks) {
  const tr = el("tr");
  tr.append(el("th", { scope: "row", id: "s" + s.id }, s.name));
  weeks.forEach((w) => tr.append(cellTd(s, w)));
  return tr;
}

// Each cell holds two stacked boxes: work (top) + comments (bottom). Each box is
// a button that opens the cell panel focused on that section.
function cellTd(s, w) {
  const cnt = countFor(s.id, w.id);
  const thumbs = cnt.thumbs || [];

  const work = el("button", {
    class: "cell-box work" + (isMyRow(s) ? " mine" : ""),
    "aria-label": `Work — ${s.name}, ${w.label}: ${cnt.images} image${cnt.images === 1 ? "" : "s"}. Open to view or upload.`,
    onclick: () => go(() => openCell(s.id, w.id, "work")),
  });
  if (cnt.images > 0) {
    const stack = el("div", { class: "thumb-stack" });
    thumbs.forEach((id) => stack.append(el("img", { src: `/img/${id}`, alt: "", loading: "lazy" })));
    if (cnt.images > thumbs.length) stack.append(el("div", { class: "thumb-more" }, "+" + (cnt.images - thumbs.length)));
    work.append(stack, el("div", { class: "box-meta" }, `${cnt.images} image${cnt.images === 1 ? "" : "s"}`));
  } else {
    work.append(el("div", { class: "cell-empty" }, canUpload(s) ? "+ Add work" : "No work yet"));
  }

  const comments = el("button", {
    class: "cell-box comments",
    "aria-label": `Comments — ${s.name}, ${w.label}: ${cnt.threads} threads, ${cnt.comments} comments. Open to read or reply.`,
    onclick: () => go(() => openCell(s.id, w.id, "comments")),
  });
  comments.append(el("div", { class: "badge" },
    el("span", {}, el("span", { class: "n" }, String(cnt.threads)), " threads"),
    el("span", {}, el("span", { class: "n" }, String(cnt.comments)), " comments")));
  if (cnt.last) {
    comments.append(el("div", { class: "last-comment" },
      el("span", { class: "who" }, cnt.last.author_name + ": "), cnt.last.body));
  } else {
    comments.append(el("div", { class: "cell-empty" }, "No comments yet"));
  }

  return el("td", { headers: "w" + w.id + " s" + s.id }, work, comments);
}

// ---- cell view -------------------------------------------------------------
async function openCell(sid, wid, focus) {
  state.openCellRef = { sid, wid };
  state.focus = focus || "work";
  await loadCell();
  if (!$("cell-dialog").open) $("cell-dialog").showModal();
}
async function loadCell() {
  const { sid, wid } = state.openCellRef;
  state.openCell = await apiGet(`/api/cell?student=${sid}&week=${wid}`);
  renderCell();
}
async function refresh() { await loadBoard(); if (state.openCellRef && $("cell-dialog").open) await loadCell(); }

function renderCell() {
  const cell = state.openCell;
  if (!cell) return;
  $("cell-title").textContent = `${cell.student.name} · ${cell.week.label}`;
  const body = $("cell-body");
  body.replaceChildren();

  // gallery
  const imgs = cell.images;
  const gal = el("section", { id: "sec-work" });
  gal.append(el("h3", {}, `Work (${imgs.length})`));
  if (!imgs.length) {
    gal.append(el("p", { class: "hint" }, "No images posted to this cell yet."));
  } else {
    const grid = el("div", { class: "gallery" });
    imgs.forEach((im, idx) => {
      const item = el("div", { class: "gitem" });
      item.append(el("img", {
        src: `/img/${im.id}`, alt: im.alt_text || "", loading: "lazy",
        tabindex: "0", role: "button", "aria-label": "Enlarge image" + (im.alt_text ? ": " + im.alt_text : ""),
        onclick: () => openLightbox(idx),
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(idx); } },
      }));
      item.append(el("div", { class: "cap" }, im.alt_text || el("em", {}, "No caption")));
      if (canManageImage(im)) {
        item.append(el("div", { class: "gtools" },
          el("button", { class: "tiny subtle", "aria-label": "Move image earlier", disabled: idx === 0, onclick: () => moveImage(idx, -1) }, "←"),
          el("button", { class: "tiny subtle", "aria-label": "Move image later", disabled: idx === imgs.length - 1, onclick: () => moveImage(idx, 1) }, "→"),
          el("button", { class: "tiny danger", "aria-label": "Delete image", onclick: () => deleteImage(im.id) }, "Delete")));
      }
      grid.append(item);
    });
    gal.append(grid);
  }
  body.append(gal);

  // uploader
  if (canUpload(cell.student)) body.append(renderUploader(cell.student.id, cell.week.id));
  else body.append(el("section", {}, el("p", { class: "hint" },
    `Students upload to their own row. You're signed in as “${ME()}”.`)));

  // threads
  const tsec = el("section", { id: "sec-comments" });
  tsec.append(el("h3", {}, `Discussion (${cell.threads.length} threads)`));
  cell.threads.forEach((t) => tsec.append(renderThread(t)));
  tsec.append(renderNewThread(cell.student.id, cell.week.id));
  body.append(tsec);

  // Scroll to whichever box the user clicked (work or comments).
  const target = state.focus === "comments" ? tsec : gal;
  requestAnimationFrame(() => { try { target.scrollIntoView({ block: "start" }); } catch { /* */ } });
}

function renderThread(t) {
  const det = el("details", { class: "thread" });
  if ((t.comments || []).length <= 4) det.open = true;
  det.append(el("summary", {},
    el("span", { class: "ttitle" }, t.title || "(untitled thread)"),
    el("span", { class: "tmeta" },
      el("span", { class: "spacer" }, "·"), `${t.comments.length} ` + (t.comments.length === 1 ? "comment" : "comments"),
      el("span", { class: "spacer" }, "·"), `started by ${t.created_by} ${timeAgo(t.created_at)}`)));

  const clist = el("div", { class: "comments" });
  t.comments.forEach((c) => {
    const cm = el("div", { class: "comment" });
    cm.append(el("div", {}, el("span", { class: "who" }, c.author_name), el("span", { class: "when" }, timeAgo(c.created_at))));
    cm.append(el("div", { class: "body" }, c.body));
    if (isInstructor()) cm.append(el("button", { class: "tiny danger", style: "margin-top:.3rem", "aria-label": "Delete comment", onclick: () => deleteComment(c.id) }, "Delete"));
    clist.append(cm);
  });
  det.append(clist);

  const input = el("input", { type: "text", placeholder: "Reply…", "aria-label": "Reply to thread" });
  const send = () => { const v = input.value.trim(); if (v) reply(t.id, v); };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); send(); } });
  det.append(el("div", { class: "reply-row" }, input, el("button", { onclick: send }, "Reply")));
  return det;
}

function renderNewThread(sid, wid) {
  const box = el("div", { class: "new-thread" });
  const title = el("input", { type: "text", placeholder: "New thread title (optional)", "aria-label": "New thread title" });
  const body = el("textarea", { rows: "2", placeholder: "Start a new discussion on this cell…", "aria-label": "First comment" });
  const err = el("div", { class: "err", hidden: true });
  const submit = () => {
    const b = body.value.trim();
    if (!b) { err.textContent = "Write something to start the thread."; err.hidden = false; return; }
    newThread(sid, wid, title.value.trim(), b);
  };
  box.append(el("div", { class: "f" }, el("label", {}, "Start a new thread"), title, body), err, el("button", { onclick: submit }, "Post thread"));
  return box;
}

// ---- uploader (drag/drop + picker + per-image caption + progress) ----------
function renderUploader(sid, wid) {
  const sec = el("section");
  sec.append(el("h3", {}, "Add images"));
  const input = el("input", { type: "file", accept: "image/*", multiple: true, capture: "environment", class: "visually-hidden" });
  const zone = el("div", { class: "dropzone", tabindex: "0", role: "button", "aria-label": "Upload images: drop files here or activate to browse" },
    "Drag & drop images here, or ", el("strong", {}, "click to browse"), " — multiple at once. Camera capture supported on phones.");
  const staged = el("div", { class: "staged" });
  const bar = el("div", { class: "progress", hidden: true }, el("div"));
  let queue = []; // { file, url, w, h, capInput }

  const refresh = () => {
    staged.replaceChildren();
    if (!queue.length) return;
    queue.forEach((q, i) => {
      const cap = el("input", { type: "text", placeholder: "Caption / alt-text (optional but encouraged)", "aria-label": "Caption for image " + (i + 1) });
      q.capInput = cap;
      staged.append(el("div", { class: "row" }, el("img", { src: q.url, alt: "" }), cap,
        el("button", { class: "tiny danger", "aria-label": "Remove from queue", onclick: () => { URL.revokeObjectURL(q.url); queue.splice(i, 1); refresh(); } }, "✕")));
    });
    staged.append(el("button", { onclick: commit }, `Upload ${queue.length} image${queue.length === 1 ? "" : "s"}`));
  };

  const commit = () => go(async () => {
    if (!queue.length) return;
    const fd = new FormData();
    fd.append("student_id", String(sid));
    fd.append("week_id", String(wid));
    queue.forEach((q) => {
      fd.append("images", q.file, q.file.name);
      fd.append("alt_text", q.capInput.value.trim());
      fd.append("width", String(q.w || ""));
      fd.append("height", String(q.h || ""));
    });
    bar.hidden = false; bar.firstChild.style.width = "0%";
    await apiUpload(fd, (p) => { bar.firstChild.style.width = Math.round(p * 100) + "%"; });
    queue.forEach((q) => URL.revokeObjectURL(q.url));
    queue = [];
    bar.hidden = true;
    toast("Uploaded.");
    await refreshAll();
  });

  const intake = (files) => {
    [...files].forEach((f) => {
      if (!f.type.startsWith("image/")) return;
      const url = URL.createObjectURL(f);
      const item = { file: f, url, w: null, h: null };
      const probe = new Image();
      probe.onload = () => { item.w = probe.naturalWidth; item.h = probe.naturalHeight; };
      probe.src = url;
      queue.push(item);
    });
    refresh();
  };

  input.addEventListener("change", () => intake(input.files));
  zone.addEventListener("click", () => input.click());
  zone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
  zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("drag"); intake(e.dataTransfer.files); });

  sec.append(input, zone, staged, bar);
  return sec;
}

// ---- mutations -------------------------------------------------------------
const refreshAll = refresh; // alias for readability inside handlers
function newThread(sid, wid, title, body) { go(async () => { await apiPost("/api/cell/threads", { student_id: sid, week_id: wid, title, body }); await refreshAll(); }); }
function reply(tid, body) { go(async () => { await apiPost(`/api/threads/${tid}/comments`, { body }); await refreshAll(); }); }
function deleteComment(id) { if (!confirm("Delete this comment? (moderation)")) return; go(async () => { await apiDelete(`/api/admin/comments/${id}`); await refreshAll(); }); }
function deleteImage(id) { if (!confirm("Delete this image?")) return; go(async () => { await apiDelete(`/api/images/${id}`); await refreshAll(); }); }
function moveImage(idx, dir) {
  go(async () => {
    const imgs = state.openCell.images.slice();
    const j = idx + dir;
    if (j < 0 || j >= imgs.length) return;
    [imgs[idx], imgs[j]] = [imgs[j], imgs[idx]];
    await apiPut("/api/cell/images/order", { student_id: state.openCell.student.id, week_id: state.openCell.week.id, order: imgs.map((i) => i.id) });
    await refreshAll();
  });
}

// ---- lightbox --------------------------------------------------------------
let lb = { idx: 0 };
function openLightbox(idx) { lb.idx = idx; paintLightbox(); if (!$("lightbox").open) $("lightbox").showModal(); }
function paintLightbox() {
  const imgs = state.openCell.images;
  const im = imgs[lb.idx];
  if (!im) { $("lightbox").close(); return; }
  $("lb-img").src = `/img/${im.id}`;
  $("lb-img").alt = im.alt_text || "";
  $("lb-cap").textContent = im.alt_text || "";
  $("lb-count").textContent = `${lb.idx + 1} / ${imgs.length}`;
  $("lb-prev").disabled = imgs.length < 2;
  $("lb-next").disabled = imgs.length < 2;
}
function lbStep(d) { const n = state.openCell.images.length; if (!n) return; lb.idx = (lb.idx + d + n) % n; paintLightbox(); }

// ---- admin -----------------------------------------------------------------
function openAdmin() { renderAdmin(); if (!$("admin-dialog").open) $("admin-dialog").showModal(); }
function renderAdmin() {
  const body = $("admin-body");
  body.replaceChildren();

  const nameInput = el("input", { type: "text", value: state.board.studioName || "", "aria-label": "Studio name", style: "width:100%" });
  body.append(el("section", {},
    el("h3", {}, "Studio name"),
    el("div", { class: "admin-row" }, nameInput,
      el("button", { onclick: () => go(async () => { const r = await apiPut("/api/admin/studio-name", { name: nameInput.value.trim() }); state.board.studioName = r.studioName; renderControls(); renderAdmin(); }) }, "Save"))));

  body.append(rosterEditor({
    title: "TAs (sections)", items: state.board.tas || [], labelOf: (t) => t.name,
    base: "/api/admin/tas", field: "name",
  }));
  body.append(rosterEditor({
    title: "Students (rows)", items: state.board.students, labelOf: (s) => s.name,
    base: "/api/admin/students", field: "name",
    bulkPlaceholder: "Paste names — one per line or comma-separated.\nAda Okafor\nBruno Silva, Chen Wei",
    rowExtra: taSelect,
  }));
  body.append(rosterEditor({
    title: "Weeks (columns)", items: state.board.weeks, labelOf: (w) => w.label,
    base: "/api/admin/weeks", field: "label",
    bulkPlaceholder: "Paste week labels — one per line or comma-separated.\nWeek 5 · Final\nWeek 6 · Review",
  }));
}

// A per-student TA assignment dropdown for the students roster editor.
function taSelect(student) {
  const tas = state.board.tas || [];
  const sel = el("select", { "aria-label": `TA for ${student.name}`, title: "Assign TA" });
  sel.append(el("option", { value: "", selected: !student.ta_id }, "— No TA —"));
  tas.forEach((t) => sel.append(el("option", { value: String(t.id), selected: student.ta_id === t.id }, t.name)));
  sel.addEventListener("change", () => go(async () => {
    await apiPatch(`/api/admin/students/${student.id}`, { ta_id: sel.value || null });
    await reloadAdmin();
  }));
  return sel;
}

function rosterEditor(cfg) {
  const sec = el("section");
  sec.append(el("h3", {}, cfg.title));
  const list = el("div", { class: "admin-list" });
  const ids = cfg.items.map((it) => it.id);

  const saveOrder = (arr) => go(async () => { await apiPut(`${cfg.base}/order`, { order: arr }); await reloadAdmin(); });

  cfg.items.forEach((it, i) => {
    const input = el("input", { type: "text", value: cfg.labelOf(it), "aria-label": "Rename" });
    list.append(el("div", { class: "admin-row" },
      el("div", { class: "ord" },
        el("button", { class: "tiny subtle", "aria-label": "Move up", disabled: i === 0, onclick: () => { const a = ids.slice(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; saveOrder(a); } }, "↑"),
        el("button", { class: "tiny subtle", "aria-label": "Move down", disabled: i === cfg.items.length - 1, onclick: () => { const a = ids.slice(); [a[i + 1], a[i]] = [a[i], a[i + 1]]; saveOrder(a); } }, "↓")),
      input,
      cfg.rowExtra ? cfg.rowExtra(it) : null,
      el("button", { class: "tiny subtle", onclick: () => { const v = input.value.trim(); if (v) go(async () => { await apiPatch(`${cfg.base}/${it.id}`, { [cfg.field]: v }); await reloadAdmin(); }); } }, "Save"),
      el("button", { class: "tiny danger", "aria-label": "Remove", onclick: () => { if (confirm(`Remove “${cfg.labelOf(it)}” and all its work/comments?`)) go(async () => { await apiDelete(`${cfg.base}/${it.id}`); await reloadAdmin(); }); } }, "Remove")));
  });
  sec.append(list);

  if (cfg.bulkPlaceholder) {
    const bulkBox = el("textarea", { rows: "3", placeholder: cfg.bulkPlaceholder, "aria-label": "Bulk add", style: "width:100%;margin-top:.6rem" });
    sec.append(bulkBox, el("div", {}, el("button", {
      onclick: () => { const text = bulkBox.value.trim(); if (text) go(async () => { await apiPost(`${cfg.base}/bulk`, { text }); bulkBox.value = ""; await reloadAdmin(); }); },
    }, "Bulk add")));
  }
  return sec;
}

async function reloadAdmin() { await loadBoard(); if (state.openCellRef && $("cell-dialog").open) await loadCell(); renderAdmin(); }

// ---- static wiring ---------------------------------------------------------
function wireStatic() {
  $("passcode-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("passcode-err").hidden = true;
    try {
      const r = await apiPost("/api/login", { passcode: $("passcode").value });
      if (r.needsName) { await loadRoster(); showScreen("screen-name"); }
      else { await loadBoard(); showScreen("screen-board"); }
    } catch (err) {
      $("passcode-err").textContent = err.message || "Sign-in failed.";
      $("passcode-err").hidden = false;
    }
  });
  $("name-signout").addEventListener("click", signOut);

  $("cell-close").addEventListener("click", () => $("cell-dialog").close());
  $("admin-close").addEventListener("click", () => $("admin-dialog").close());
  $("lb-close").addEventListener("click", () => $("lightbox").close());
  $("lb-prev").addEventListener("click", () => lbStep(-1));
  $("lb-next").addEventListener("click", () => lbStep(1));
  for (const id of ["cell-dialog", "admin-dialog", "lightbox"]) {
    $(id).addEventListener("click", (e) => { if (e.target === $(id)) $(id).close(); });
  }
  $("lightbox").addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); lbStep(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); lbStep(1); }
  });
  let sx = null;
  const stage = document.querySelector(".lb-stage");
  stage.addEventListener("touchstart", (e) => { sx = e.changedTouches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) lbStep(dx < 0 ? 1 : -1); sx = null; }, { passive: true });
}

boot().catch((e) => { console.error(e); showScreen("screen-passcode"); });
