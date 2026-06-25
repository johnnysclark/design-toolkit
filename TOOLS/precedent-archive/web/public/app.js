// Frontend for the Precedent Archive. Plain web tech, no build step.
// Truth lives on disk; this UI reads the index and drives the additive actions
// (add, alt text, PIAF prep, edits, relations). Built screen-reader-first.

const $ = (id) => document.getElementById(id);

// Tiny hyperscript: text is always created as text nodes (no innerHTML), so user
// content can never inject markup. Accessibility attributes pass straight through.
function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "for") e.htmlFor = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, "");
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
}

const state = { index: null, current: null, lastFocus: null };

// --- API --------------------------------------------------------------------

const api = {
  async req(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `${method} ${path} failed`);
    return data;
  },
  get: (p) => api.req("GET", p),
  post: (p, b) => api.req("POST", p, b || {}),
  patch: (p, b) => api.req("PATCH", p, b || {})
};

// --- Status -----------------------------------------------------------------

let statusTimer = null;
function status(msg, sticky) {
  const el = $("status");
  el.textContent = msg;
  el.hidden = !msg;
  clearTimeout(statusTimer);
  if (msg && !sticky) statusTimer = setTimeout(() => { el.hidden = true; }, 4000);
}
function showError(msg) {
  const el = $("error");
  el.textContent = msg;
  el.hidden = !msg;
}
function clearError() { $("error").hidden = true; }

async function run(label, fn) {
  clearError();
  try { status(label, true); const r = await fn(); status(""); return r; }
  catch (err) { status(""); showError(err.message || String(err)); throw err; }
}

// --- Load + render ----------------------------------------------------------

async function load() {
  const index = await api.get("/api/index");
  state.index = index;

  $("archive-info").textContent =
    `${index.counts.entries} entries · ${index.counts.orphans} un-cataloged · ` +
    `${index.archiveRoot} · AI alt text ${index.hasApiKey ? "on" : "off (no API key)"}`;
  $("bulk-alt").disabled = !index.hasApiKey;

  fillSelect($("type-filter"), "All types", index.types);
  fillSelect($("tag-filter"), "All tags", index.tags);
  renderOrphans(index.orphans);
  await applyFilters();
}

function fillSelect(sel, allLabel, values) {
  const keep = sel.value;
  sel.replaceChildren(h("option", { value: "" }, allLabel));
  for (const v of values) sel.append(h("option", { value: v }, v));
  if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
}

function currentView() {
  const r = document.querySelector('input[name="view"]:checked');
  return r ? r.value : "gallery";
}

async function applyFilters() {
  const q = $("q").value.trim();
  const type = $("type-filter").value;
  const tag = $("tag-filter").value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (tag) params.set("tag", tag);
  const { entries } = await api.get("/api/search?" + params.toString());
  renderEntries(entries);
}

function renderEntries(entries) {
  const ul = $("entries");
  ul.className = "gallery" + (currentView() === "list" ? " list" : "");
  ul.replaceChildren(...entries.map(entryCard));
  $("entries-count").textContent = `(${entries.length})`;
  $("empty").hidden = entries.length > 0;
}

function thumb(url, alt, extraClass) {
  if (!url) return h("div", { class: "thumb missing " + (extraClass || "") }, "no image");
  return h("img", { class: "thumb " + (extraClass || ""), src: url, alt: alt || "", loading: "lazy" });
}

function entryCard(e) {
  const badges = [h("span", { class: "badge type" }, e.type || "untyped")];
  for (const t of e.tags.slice(0, 4)) badges.push(h("span", { class: "badge tag" }, t));
  if (e.altMissing) badges.push(h("span", { class: "badge flag-alt" }, `${e.altMissing} need alt`));
  if (e.tactileCount) badges.push(h("span", { class: "badge flag-tactile" }, "tactile-prepped"));
  if (e.warnings && e.warnings.length) badges.push(h("span", { class: "badge flag-warn" }, `${e.warnings.length} warning${e.warnings.length > 1 ? "s" : ""}`));

  const open = h(
    "button",
    { class: "card-open", "aria-label": `Open entry: ${e.title || "untitled"}`, onclick: (ev) => openDetail(e.id, ev.currentTarget) },
    thumb(e.primaryImage, e.primaryAlt),
    h("span", { class: "card-body" },
      h("span", { class: "card-title" }, e.title || "(untitled)"),
      h("p", { class: "byline" }, `${e.type || "untyped"} · ${e.imageCount} image${e.imageCount === 1 ? "" : "s"}`)
    )
  );
  return h("li", { class: "card" }, open, h("div", { class: "card-body badges" }, ...badges));
}

function renderOrphans(orphans) {
  const wrap = $("orphans-wrap");
  wrap.hidden = orphans.length === 0;
  $("orphans-count").textContent = `(${orphans.length})`;
  $("orphans").replaceChildren(
    ...orphans.map((o) =>
      h("li", { class: "card" },
        thumb(o.url, fileName(o.path)),
        h("div", { class: "card-body" },
          h("p", { class: "byline" }, fileName(o.path)),
          h("button", { class: "small", onclick: () => adoptOrphan(o.path) }, "Create entry")
        )
      )
    )
  );
}

const fileName = (p) => p.split("/").pop();

// --- Detail view ------------------------------------------------------------

async function openDetail(id, trigger) {
  if (trigger) state.lastFocus = trigger;
  state.current = id;
  const d = await run("Loading entry…", () => api.get("/api/entry?id=" + encodeURIComponent(id)));
  renderDetail(d);
  const detail = $("detail");
  detail.hidden = false;
  $("detail").scrollIntoView({ block: "start" });
  detail.focus();
}

function closeDetail() {
  state.current = null;
  $("detail").hidden = true;
  if (state.lastFocus) state.lastFocus.focus();
}

function renderDetail(d) {
  const types = state.index.types;
  const sourcesWrap = h("div", { class: "sources" });
  const addSourceRow = (s = { url: "", label: "" }) =>
    sourcesWrap.append(
      h("div", { class: "row source-row" },
        h("input", { type: "url", value: s.url, placeholder: "https://…", "aria-label": "Source URL" }),
        h("input", { type: "text", value: s.label, placeholder: "Label", "aria-label": "Source label" }),
        h("button", { type: "button", class: "small secondary", onclick: (ev) => ev.currentTarget.closest(".source-row").remove() }, "Remove")
      )
    );
  (d.sources || []).forEach(addSourceRow);

  const titleInput = h("input", { type: "text", id: "d-title", value: d.title || "" });
  const typeSelect = h("select", { id: "d-type" },
    h("option", { value: "" }, "(untyped)"),
    ...types.map((t) => h("option", { value: t, ...(t === d.type ? { selected: true } : {}) }, t))
  );
  const tagsInput = h("input", { type: "text", id: "d-tags", value: (d.tags || []).join(", ") });
  const notesArea = h("textarea", { id: "d-notes", rows: "5" }, d.notes || "");

  const save = h("button", { onclick: () => saveEntry(d.id, sourcesWrap) }, "Save entry");

  const warnings = (d.warnings && d.warnings.length)
    ? h("p", { class: "warnings" }, d.warnings.join(" · "))
    : null;

  const detail = $("detail");
  detail.replaceChildren(
    h("button", { class: "back secondary", onclick: closeDetail }, "← Back to all entries"),
    h("h2", { id: "detail-title" }, d.title || "(untitled)"),
    h("p", { class: "byline" }, `${d.images.length} image${d.images.length === 1 ? "" : "s"} · updated ${shortDate(d.updated)}`),
    warnings,
    h("div", { class: "grid" },
      h("label", { class: "field", for: "d-title" }, h("span", {}, "Title"), titleInput),
      h("label", { class: "field", for: "d-type" }, h("span", {}, "Type"), typeSelect),
      h("label", { class: "field", for: "d-tags" }, h("span", {}, "Tags (comma-separated)"), tagsInput),
      h("div", { class: "field" }, h("span", {}, "Sources"), sourcesWrap,
        h("button", { type: "button", class: "small secondary", onclick: () => addSourceRow() }, "Add source"))
    ),
    h("label", { class: "field", for: "d-notes" }, h("span", {}, "Notes"), notesArea),
    save,
    h("h3", {}, "Images"),
    ...d.images.map((img) => imageBlock(d, img)),
    h("h3", {}, "Related entries"),
    relatedBlock(d)
  );
}

function imageBlock(d, img) {
  const altRegion = h("div", { class: "alt-region", hidden: true, id: `alt-${cssId(img.path)}` },
    h("p", { class: "alt-meta" }, `Stored alt text · source: ${img.altSource}`),
    h("p", {}, img.alt || "(no alt text yet)")
  );
  const toggle = h("button", {
    type: "button", class: "small secondary", "aria-expanded": "false", "aria-controls": altRegion.id,
    onclick: (ev) => {
      const open = altRegion.hidden;
      altRegion.hidden = !open;
      ev.currentTarget.setAttribute("aria-expanded", String(open));
      ev.currentTarget.textContent = open ? "Hide alt text" : "Show alt text";
    }
  }, "Show alt text");

  const altEditor = h("textarea", { rows: "3", "aria-label": `Alt text for ${img.path}` }, img.alt || "");
  const figureKids = [
    img.url
      ? h("img", { src: img.url, alt: img.alt || "", width: "480" })
      : h("p", { class: "warnings" }, `Image file missing on disk: ${img.path}`),
    img.caption ? h("figcaption", {}, img.caption) : null
  ];

  const actions = h("div", { class: "img-actions" },
    toggle,
    h("button", { type: "button", class: "small", onclick: () => saveAlt(d.id, img.path, altEditor.value) }, "Save alt"),
    state.index.hasApiKey
      ? h("button", { type: "button", class: "small secondary", onclick: () => regenAlt(d.id, img.path, img.altSource) }, "Regenerate alt")
      : null,
    !img.primary ? h("button", { type: "button", class: "small secondary", onclick: () => setPrimary(d.id, img.path) }, "Set as primary") : h("span", { class: "badge" }, "primary")
  );

  return h("figure", { class: "image-block" },
    ...figureKids.filter(Boolean),
    altRegion,
    h("label", { class: "field" }, h("span", {}, "Alt text"), altEditor),
    actions,
    h("label", { class: "field" }, h("span", {}, "Caption (visible, optional)"),
      h("input", { type: "text", value: img.caption || "", onchange: (ev) => saveCaption(d.id, img.path, ev.currentTarget.value) })),
    img.tactilePrepped ? h("p", { class: "badge flag-tactile" }, "tactile-prepped") : null,
    piafPanel(d, img),
    editPanel(d, img),
    img.derived && (img.derived.piaf || (img.derived.edits || []).length)
      ? h("p", {}, "Derived: ",
          img.derived.piaf ? h("a", { class: "download-link", href: img.derived.piaf }, "PIAF PNG") : null,
          ...(img.derived.edits || []).map((u, i) => h("a", { class: "download-link", href: u }, ` edit ${i + 1}`)))
      : null
  );
}

function piafPanel(d, img) {
  const thr = h("input", { type: "range", min: "1", max: "99", value: "50", "aria-label": "Black/white threshold percent" });
  const thrOut = h("output", {}, "50%");
  thr.addEventListener("input", () => { thrOut.textContent = thr.value + "%"; });
  const edge = h("input", { type: "checkbox", id: `edge-${cssId(img.path)}` });
  const link = h("span", {});
  return h("details", { class: "action-panel" },
    h("summary", {}, "Prep for PIAF (tactile / swell paper)"),
    h("p", { class: "hint" }, "Black raises on heating: aim for bold black-on-white with few mid-tones."),
    h("div", { class: "row" },
      h("label", { class: "field", style: "flex:1" }, h("span", {}, "Threshold"), thr), thrOut),
    h("label", {}, edge, " Edge-detect (outlines instead of filled darks)"),
    h("div", { class: "row" },
      h("button", { type: "button", class: "small", onclick: async () => {
        const r = await run("Rendering tactile version…", () =>
          api.post("/api/image/piaf", { id: d.id, path: img.path, threshold: Number(thr.value), edge: edge.checked }));
        link.replaceChildren(h("a", { class: "download-link", href: r.url }, "Download 1-bit PNG"));
        await refreshAfterMutation(d.id);
      } }, "Generate"), link)
  );
}

function editPanel(d, img) {
  const rotate = h("select", {}, ...["0", "90", "180", "270"].map((v) => h("option", { value: v }, v + "°")));
  const width = h("input", { type: "number", min: "1", placeholder: "px", "aria-label": "Resize width in pixels" });
  const contrast = h("input", { type: "range", min: "0.5", max: "2", step: "0.1", value: "1", "aria-label": "Contrast" });
  const cOut = h("output", {}, "1.0");
  contrast.addEventListener("input", () => { cOut.textContent = Number(contrast.value).toFixed(1); });
  const crop = {
    left: h("input", { type: "number", min: "0", placeholder: "left", "aria-label": "Crop left" }),
    top: h("input", { type: "number", min: "0", placeholder: "top", "aria-label": "Crop top" }),
    width: h("input", { type: "number", min: "0", placeholder: "width", "aria-label": "Crop width" }),
    height: h("input", { type: "number", min: "0", placeholder: "height", "aria-label": "Crop height" })
  };
  const link = h("span", {});
  return h("details", { class: "action-panel" },
    h("summary", {}, "Edit image (crop · rotate · resize · contrast)"),
    h("div", { class: "row" },
      h("label", { class: "field" }, h("span", {}, "Rotate"), rotate),
      h("label", { class: "field" }, h("span", {}, "Resize width"), width),
      h("label", { class: "field", style: "flex:1" }, h("span", {}, "Contrast"), contrast), cOut),
    h("fieldset", {}, h("legend", {}, "Crop (optional, pixels)"),
      h("div", { class: "row" }, crop.left, crop.top, crop.width, crop.height)),
    h("div", { class: "row" },
      h("button", { type: "button", class: "small", onclick: async () => {
        const body = { id: d.id, path: img.path, rotate: Number(rotate.value), contrast: Number(contrast.value) };
        if (width.value) body.resize = { width: Number(width.value) };
        if (crop.width.value && crop.height.value)
          body.crop = { left: Number(crop.left.value || 0), top: Number(crop.top.value || 0), width: Number(crop.width.value), height: Number(crop.height.value) };
        const r = await run("Editing image…", () => api.post("/api/image/edit", body));
        link.replaceChildren(h("a", { class: "download-link", href: r.url }, "Download edited PNG"));
        await refreshAfterMutation(d.id);
      } }, "Generate"), link)
  );
}

function relatedBlock(d) {
  const list = h("ul", { class: "rel-list" },
    ...(d.related || []).map((r) =>
      h("li", {},
        r.title != null
          ? h("button", { class: "small secondary", onclick: () => openDetail(r.id) }, r.title)
          : h("span", { class: "warnings" }, `missing: ${r.id}`),
        h("button", { class: "small secondary", "aria-label": `Remove relation ${r.title || r.id}`, onclick: () => relate(d.id, r.id, "remove") }, "✕")
      )
    )
  );
  if (!d.related || !d.related.length) list.append(h("li", { class: "hint" }, "None yet."));

  const others = state.index.entries.filter((e) => e.id !== d.id && !(d.related || []).some((r) => r.id === e.id));
  const select = h("select", { "aria-label": "Choose an entry to relate" },
    h("option", { value: "" }, "Choose an entry…"),
    ...others.map((e) => h("option", { value: e.id }, e.title || "(untitled)"))
  );
  const add = h("div", { class: "rel-add" }, select,
    h("button", { class: "small", onclick: () => { if (select.value) relate(d.id, select.value, "add"); } }, "Add relation"));

  return h("div", {}, list, add);
}

// --- Mutations --------------------------------------------------------------

async function refreshAfterMutation(id) {
  await load();
  if (id) await openDetail(id);
}

async function saveEntry(id, sourcesWrap) {
  const sources = [...sourcesWrap.querySelectorAll(".source-row")].map((row) => {
    const [u, l] = row.querySelectorAll("input");
    return { url: u.value.trim(), label: l.value.trim() };
  }).filter((s) => s.url);
  const patch = {
    title: $("d-title").value.trim(),
    type: $("d-type").value,
    tags: $("d-tags").value.split(",").map((t) => t.trim()).filter(Boolean),
    notes: $("d-notes").value,
    sources
  };
  await run("Saving…", () => api.patch("/api/entry?id=" + encodeURIComponent(id), patch));
  await refreshAfterMutation(id);
  status("Saved.");
}

async function saveAlt(id, path, alt) {
  await run("Saving alt text…", () => api.patch("/api/entry?id=" + encodeURIComponent(id), { images: [{ path, alt }] }));
  await refreshAfterMutation(id);
  status("Alt text saved (marked as human-edited).");
}

async function regenAlt(id, path, altSource) {
  const force = (altSource === "human" || altSource === "edited")
    ? confirm("This alt text was edited by a human. Replace it with a freshly generated one?")
    : false;
  if ((altSource === "human" || altSource === "edited") && !force) return;
  const r = await run("Generating alt text…", () => api.post("/api/alt", { id, path, force }));
  if (r.skipped) { status("Kept your edited alt text."); return; }
  await refreshAfterMutation(id);
  status("Alt text regenerated.");
}

async function saveCaption(id, path, caption) {
  await run("Saving caption…", () => api.patch("/api/entry?id=" + encodeURIComponent(id), { images: [{ path, caption }] }));
  await refreshAfterMutation(id);
}

async function setPrimary(id, path) {
  await run("Setting primary image…", () => api.patch("/api/entry?id=" + encodeURIComponent(id), { images: [{ path, primary: true }] }));
  await refreshAfterMutation(id);
}

async function relate(id, otherId, op) {
  await run(op === "remove" ? "Removing relation…" : "Adding relation…",
    () => api.post("/api/relate", { id, otherId, op }));
  await refreshAfterMutation(id);
}

// --- Add flows --------------------------------------------------------------

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function addFiles(files) {
  const imgs = [...files].filter((f) => f.type.startsWith("image/"));
  if (!imgs.length) { showError("No images in that drop/paste."); return; }
  const ids = [];
  await run(`Adding ${imgs.length} image${imgs.length === 1 ? "" : "s"}…`, async () => {
    for (const f of imgs) {
      const dataBase64 = await fileToBase64(f);
      const { id } = await api.post("/api/entry", { kind: "upload", filename: f.name, dataBase64 });
      ids.push(id);
    }
  });
  await load();
  if (state.index.hasApiKey) {
    await run("Generating alt text…", async () => { for (const id of ids) await autoAlt(id); });
    await load();
  }
  status(`Added ${ids.length}. ${state.index.hasApiKey ? "Alt text generated." : "Set an API key to auto-generate alt text."}`);
  if (ids.length === 1) await openDetail(ids[0]);
}

async function autoAlt(id) {
  const d = await api.get("/api/entry?id=" + encodeURIComponent(id));
  for (const img of d.images) {
    if (!img.alt && !img.missing) {
      try { await api.post("/api/alt", { id, path: img.path }); } catch { /* keep going */ }
    }
  }
}

async function adoptOrphan(path) {
  const { id } = await run("Creating entry…", () => api.post("/api/entry", { kind: "existing", path }));
  await load();
  if (state.index.hasApiKey) { await run("Generating alt text…", () => autoAlt(id)); await load(); }
  await openDetail(id);
}

async function addUrl(url) {
  const r = await run("Fetching page…", () => api.post("/api/url", { url }));
  await load();
  if (r.fetched && state.index.hasApiKey) { await run("Generating alt text…", () => autoAlt(r.id)); await load(); }
  status(r.fetched ? "Added from URL." : "No image found — created a manual stub. Add a screenshot.");
  await openDetail(r.id);
}

// --- Wiring -----------------------------------------------------------------

function wire() {
  $("filters").addEventListener("submit", (e) => e.preventDefault());
  $("q").addEventListener("input", debounce(() => applyFilters().catch((e) => showError(e.message)), 250));
  $("type-filter").addEventListener("change", () => applyFilters());
  $("tag-filter").addEventListener("change", () => applyFilters());
  for (const r of document.querySelectorAll('input[name="view"]')) r.addEventListener("change", () => applyFilters());

  $("rescan").addEventListener("click", () => run("Rescanning archive…", () => api.post("/api/rescan")).then(load).then(() => status("Index rebuilt from disk.")));
  $("bulk-alt").addEventListener("click", async () => {
    const r = await run("Generating all missing alt text…", () => api.post("/api/alt/bulk"));
    await load();
    status(`Generated ${r.generated}, skipped ${r.skipped}${r.failed ? `, failed ${r.failed}` : ""}.`);
  });

  $("url-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const url = $("url-input").value.trim();
    if (url) addUrl(url).catch((err) => showError(err.message));
  });

  const dz = $("dropzone");
  $("file-input").addEventListener("change", (e) => addFiles(e.target.files).catch((err) => showError(err.message)));
  dz.addEventListener("click", (e) => { if (e.target === dz) $("file-input").click(); });
  dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file-input").click(); } });
  ["dragover", "dragenter"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove("drag")));
  dz.addEventListener("drop", (e) => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files).catch((err) => showError(err.message)); });

  document.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.items || [])].filter((i) => i.kind === "file").map((i) => i.getAsFile()).filter(Boolean);
    if (files.length) { e.preventDefault(); addFiles(files).catch((err) => showError(err.message)); }
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.current) closeDetail(); });
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

const cssId = (s) => s.replace(/[^a-z0-9]/gi, "-");
const shortDate = (iso) => (iso ? iso.replace("T", " ").replace(/:\d\dZ?$/, "") : "—");

wire();
load().catch((err) => showError("Could not load the archive: " + err.message));
