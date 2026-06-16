// Site Analyzer frontend. No build step, no framework — fetch + small DOM/SVG helpers.

const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const kid of kids) n.append(kid?.nodeType ? kid : document.createTextNode(kid ?? ""));
  return n;
};
const show = (id) => $(id).removeAttribute("hidden");
const hide = (id) => $(id).setAttribute("hidden", "");
const setStatus = (msg) => {
  if (msg) { $("status").textContent = msg; show("status"); } else hide("status");
};
const setError = (msg) => {
  if (msg) { $("error").textContent = msg; show("error"); } else hide("error");
};

let map, layerGroup;
let current = null; // last analysis result

// --- Search ----------------------------------------------------------------

$("search-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("q").value.trim();
  if (q.length < 2) return;
  setError(null);
  hide("candidates");
  setStatus(`Searching EPA Superfund sites for “${q}”…`);
  try {
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Search failed.");
    setStatus(null);
    renderCandidates(data.results || []);
  } catch (err) {
    setStatus(null);
    setError(err.message);
  }
});

function renderCandidates(results) {
  const box = $("candidates");
  box.replaceChildren();
  if (!results.length) {
    box.append(el("div", { class: "candidate" }, "No NPL sites matched. Try a shorter or different name."));
    show("candidates");
    return;
  }
  for (const s of results) {
    const card = el(
      "div",
      { class: "candidate" },
      el("div", {},
        el("div", { class: "nm" }, s.name),
        el("div", { class: "loc" }, [s.city, s.county, s.state].filter(Boolean).join(", ") + ` · EPA ${s.epaId}`)
      ),
      el("span", { class: "badge" }, s.status || "—")
    );
    card.addEventListener("click", () => analyze(s.epaId));
    box.append(card);
  }
  show("candidates");
}

// --- Analyze ---------------------------------------------------------------

async function analyze(epaId) {
  setError(null);
  hide("candidates");
  hide("results");
  setStatus("Pulling the site together — boundary, climate, terrain, flood, and contamination. This runs several live data sources and two model passes, so give it up to a minute…");
  try {
    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epaId })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Analysis failed.");
    current = data;
    setStatus(null);
    render(data);
  } catch (err) {
    setStatus(null);
    setError(err.message);
  }
}

function render(d) {
  show("results");
  $("site-name").textContent = d.site.name;

  const m = d.site;
  const docs = [];
  if (m.documents?.progressProfile?.url) docs.push(linkEl("EPA site profile", m.documents.progressProfile.url));
  if (m.documents?.listingNarrative?.url) docs.push(linkEl("Listing narrative (PDF)", m.documents.listingNarrative.url));
  const meta = $("site-meta");
  meta.replaceChildren();
  meta.append(
    `${[m.city, m.county, m.state].filter(Boolean).join(", ")} · EPA Region ${m.region ?? "?"} · ${m.status}` +
      `${m.areaAcres ? ` · ${m.areaAcres.toFixed(1)} acres` : ""} · EPA ID ${m.epaId}`
  );
  if (docs.length) { meta.append(" · "); docs.forEach((l, i) => { if (i) meta.append(" · "); meta.append(l); }); }

  renderCoverage(d.coverage);
  renderMap(d);
  renderExportNote(d);
  renderClimate(d.climate);
  renderTopo(d.topo);
  renderFlood(d.flood);
  renderContamination(d.contamination);
  renderSynthesis(d.synthesis);
  $("provenance").textContent = JSON.stringify(
    { meta: d.meta, coverage: d.coverage, climateSource: d.climate?.source, floodSource: "FEMA NFHL", terrainSource: "USGS 3DEP / EPQS" },
    null, 2
  );
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

const linkEl = (t, href) => el("a", { href, target: "_blank", rel: "noopener" }, t);

function renderCoverage(cov) {
  const labels = { boundary: "Boundary", climate: "Climate", terrain: "Terrain", flood: "Flood", contamination: "Contamination", synthesis: "Design read" };
  const box = $("coverage");
  box.replaceChildren();
  for (const [k, label] of Object.entries(labels)) {
    box.append(el("span", { class: `cov ${cov[k] ? "on" : "off"}` }, (cov[k] ? "✓ " : "✕ ") + label));
  }
}

// --- Map -------------------------------------------------------------------

function renderMap(d) {
  const c = d.site.centroid;
  if (!map) {
    map = L.map("map");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }).addTo(map);
    layerGroup = L.layerGroup().addTo(map);
  }
  layerGroup.clearLayers();
  if (c) map.setView([c.lat, c.lon], 15);

  if (d.site.boundary) {
    const gj = L.geoJSON({ type: "Feature", geometry: d.site.boundary }, {
      style: { color: "#8a4b2f", weight: 2, fillColor: "#8a4b2f", fillOpacity: 0.12 }
    }).addTo(layerGroup);
    try { map.fitBounds(gj.getBounds().pad(0.4)); } catch {}
  }
  if (c) {
    const flood = d.flood?.inFloodZone ? ` · FEMA zone ${d.flood.zone} (in SFHA)` : d.flood?.zone ? ` · FEMA zone ${d.flood.zone}` : "";
    L.marker([c.lat, c.lon]).addTo(layerGroup).bindPopup(`<strong>${d.site.name}</strong><br>${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}${flood}`);
  }
  setTimeout(() => map.invalidateSize(), 100);
}

function renderExportNote(d) {
  const parts = [];
  if (!d.coverage.terrain) parts.push("Terrain/contours unavailable (outside USGS 3DEP coverage).");
  if (!d.coverage.boundary) parts.push("No EPA boundary polygon — boundary exports disabled.");
  parts.push("★ The .3dm bakes terrain, sun-path, wind rose, flood plane & labels onto layers you toggle in Rhino — no plugin needed. All exports share one origin (site SW corner, metres) so they align on import.");
  $("export-note").textContent = parts.join(" ");
  document.querySelectorAll(".export-bar button").forEach((b) => {
    const fmt = b.dataset.fmt;
    const needsTerrain = fmt === "terrain.obj" || fmt === "contours.dxf";
    const needsBoundary = fmt.startsWith("boundary");
    b.disabled = (needsTerrain && !d.coverage.terrain) || (needsBoundary && !d.coverage.boundary) || (fmt === "epw" && !d.coverage.climate);
  });
}

document.querySelectorAll(".export-bar button").forEach((b) => {
  b.addEventListener("click", () => {
    if (!current) return;
    window.location.href = `/api/export/${b.dataset.fmt}?epaId=${encodeURIComponent(current.site.epaId)}`;
  });
});

// --- Climate ---------------------------------------------------------------

function renderClimate(cl) {
  const body = $("climate-body");
  body.replaceChildren();
  if (!cl) { body.append(el("p", { class: "cap" }, "Climate data unavailable for this location.")); return; }

  const a = cl.annual;
  const stats = el("div", { class: "stat-row" });
  const stat = (v, k) => el("div", { class: "stat" }, el("div", { class: "v" }, v), el("div", { class: "k" }, k));
  stats.append(
    stat(a.tempMean != null ? `${a.tempMean.toFixed(1)}°C` : "—", "Mean temp"),
    stat(a.tempMin != null ? `${a.tempMin.toFixed(0)}–${a.tempMax.toFixed(0)}°C` : "—", "Range"),
    stat(a.rhMean != null ? `${a.rhMean.toFixed(0)}%` : "—", "Mean RH"),
    stat(a.windMean != null ? `${a.windMean.toFixed(1)} m/s` : "—", "Mean wind"),
    stat(cl.prevailingWind ? cl.prevailingWind.dir : "—", "Prevailing")
  );
  body.append(stats);

  const charts = el("div", { class: "charts" });
  charts.append(
    chartBlock("Sun path", sunPathSVG(cl.sunPaths), `Peak altitude ${fmtAlt(cl.sunPaths, "summer")}° (summer) → ${fmtAlt(cl.sunPaths, "winter")}° (winter). Azimuth clockwise from north.`),
    chartBlock("Wind rose", windRoseSVG(cl.windRose), `Frequency by direction & speed band (m/s). Calm ${(cl.windRose.calmFraction * 100).toFixed(0)}% of hours.`),
    chartBlock("Temperature by month", monthlyBarsSVG(cl.temp, "#8a4b2f", "°C"), `Monthly mean dry-bulb, ${cl.year}.`),
    chartBlock("Humidity by month", monthlyBarsSVG(cl.rh, "#2f5d62", "%", 100), `Monthly mean relative humidity, ${cl.year}.`)
  );
  body.append(charts);
  body.append(el("p", { class: "cap" }, `Source: ${cl.source}, year ${cl.year}, tz UTC${cl.tzOffsetHours >= 0 ? "+" : ""}${cl.tzOffsetHours}. Reanalysis ≈ 25 km — use for early-stage reasoning; the downloadable .epw drives Ladybug/Rhino.`));
}

const fmtAlt = (paths, key) => (paths.find((p) => p.key === key)?.peakAltitude ?? 0).toFixed(0);
const chartBlock = (title, svg, cap) => el("div", { class: "chart" }, el("h4", {}, title), svg, el("div", { class: "cap" }, cap));

// SVG namespace helpers
const SVGNS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  kids.forEach((k) => n.append(k));
  return n;
};

// Stereographic-ish sun-path: azimuth → angle, altitude → radius (90° center, 0° rim).
function sunPathSVG(paths) {
  const S = 220, c = S / 2, R = c - 18;
  const svg = svgEl("svg", { class: "viz", viewBox: `0 0 ${S} ${S}` });
  // rings + cardinal labels
  [30, 60].forEach((alt) => svg.append(svgEl("circle", { cx: c, cy: c, r: R * (1 - alt / 90), fill: "none", stroke: "#e3e0d8" })));
  svg.append(svgEl("circle", { cx: c, cy: c, r: R, fill: "none", stroke: "#d9d6cd" }));
  const dirAngle = { N: -90, E: 0, S: 90, W: 180 };
  for (const [d, ang] of Object.entries(dirAngle)) {
    const rad = (ang * Math.PI) / 180;
    const t = svgEl("text", { x: c + (R + 10) * Math.cos(rad), y: c + (R + 10) * Math.sin(rad) + 3, "text-anchor": "middle" });
    t.textContent = d;
    svg.append(t);
  }
  const colors = { summer: "#c0392b", equinox: "#b88300", winter: "#2f5d62" };
  for (const path of paths) {
    if (!path.points.length) continue;
    const pts = path.points.map((p) => {
      const r = R * (1 - p.altitude / 90);
      const ang = ((p.azimuth - 90) * Math.PI) / 180; // 0=N at top
      return `${c + r * Math.cos(ang)},${c + r * Math.sin(ang)}`;
    });
    svg.append(svgEl("polyline", { points: pts.join(" "), fill: "none", stroke: colors[path.key], "stroke-width": 2 }));
  }
  return svg;
}

function windRoseSVG(wr) {
  const S = 220, c = S / 2, R = c - 18;
  const svg = svgEl("svg", { class: "viz", viewBox: `0 0 ${S} ${S}` });
  const bandColors = ["#cfe0e0", "#8fbcbf", "#4f8e92", "#2f5d62", "#1d3a3d"];
  const maxFrac = Math.max(0.0001, ...wr.matrix.map((row) => row.reduce((a, b) => a + b, 0)));
  const sector = (2 * Math.PI) / wr.dirs.length;
  wr.matrix.forEach((row, d) => {
    const ang0 = d * sector - Math.PI / 2 - sector / 2;
    let r0 = 0;
    row.forEach((frac, b) => {
      if (frac <= 0) return;
      const r1 = r0 + (frac / maxFrac) * R;
      svg.append(svgEl("path", { d: wedge(c, c, r0, r1, ang0, ang0 + sector), fill: bandColors[b % bandColors.length], stroke: "#fff", "stroke-width": 0.5 }));
      r0 = r1;
    });
  });
  ["N", "E", "S", "W"].forEach((d, i) => {
    const ang = (i * 90 - 90) * Math.PI / 180;
    const t = svgEl("text", { x: c + (R + 9) * Math.cos(ang), y: c + (R + 9) * Math.sin(ang) + 3, "text-anchor": "middle" });
    t.textContent = d;
    svg.append(t);
  });
  return svg;
}

function wedge(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(r0, a0), [x1, y1] = p(r1, a0), [x2, y2] = p(r1, a1), [x3, y3] = p(r0, a1);
  return `M${x0},${y0} L${x1},${y1} A${r1},${r1} 0 0 1 ${x2},${y2} L${x3},${y3} A${r0},${r0} 0 0 0 ${x0},${y0} Z`;
}

function monthlyBarsSVG(months, color, unit, fixedMax) {
  const W = 280, H = 150, pad = 22;
  const svg = svgEl("svg", { class: "viz", viewBox: `0 0 ${W} ${H}` });
  const vals = months.map((m) => m.mean);
  const present = vals.filter((v) => v != null);
  const max = fixedMax || (present.length ? Math.max(...present) : 1);
  const min = fixedMax ? 0 : Math.min(0, ...present);
  const bw = (W - pad * 2) / 12;
  const labels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  vals.forEach((v, i) => {
    if (v == null) return;
    const h = ((v - min) / (max - min)) * (H - pad * 2);
    const x = pad + i * bw;
    svg.append(svgEl("rect", { x: x + 1, y: H - pad - h, width: bw - 2, height: Math.max(0, h), fill: color, opacity: 0.85 }));
    const t = svgEl("text", { x: x + bw / 2, y: H - pad + 11, "text-anchor": "middle" });
    t.textContent = labels[i];
    svg.append(t);
  });
  const tMax = svgEl("text", { x: 2, y: pad - 6 }); tMax.textContent = `${max.toFixed(0)}${unit}`; svg.append(tMax);
  return svg;
}

// --- Topo / Flood ----------------------------------------------------------

function renderTopo(t) {
  const body = $("topo-body");
  body.replaceChildren();
  if (!t.sampled) {
    body.append(el("p", { class: "cap" }, "Terrain not sampled — the site is outside USGS 3DEP coverage or has no boundary box. Climate and contamination still apply."));
    return;
  }
  const s = t.stats;
  const stats = el("div", { class: "stat-row" });
  const stat = (v, k) => el("div", { class: "stat" }, el("div", { class: "v" }, v), el("div", { class: "k" }, k));
  stats.append(
    stat(s.min != null ? `${s.min.toFixed(1)} m` : "—", "Min elevation"),
    stat(s.max != null ? `${s.max.toFixed(1)} m` : "—", "Max elevation"),
    stat(s.max != null ? `${(s.max - s.min).toFixed(1)} m` : "—", "Relief"),
    stat(`${t.n}×${t.n}`, "Sample grid")
  );
  body.append(stats);
  body.append(el("p", { class: "cap" }, `USGS 3DEP via EPQS. ${s.missing ? `${s.missing}/${s.total} samples were out of coverage and filled with the mean. ` : ""}Download the terrain .obj / contour .dxf above for Rhino. Increase resolution with ?n= on the export URL (up to 64).`));
}

function renderFlood(f) {
  const body = $("flood-body");
  body.replaceChildren();
  if (!f || f.mapped === false) {
    body.append(el("p", { class: "cap" }, "FEMA NFHL returned no data at the site centroid (may be unmapped). Check FEMA's Flood Map Service Center directly."));
    return;
  }
  const stats = el("div", { class: "stat-row" });
  const stat = (v, k) => el("div", { class: "stat" }, el("div", { class: "v" }, v), el("div", { class: "k" }, k));
  stats.append(
    stat(f.zone || "—", "Flood zone"),
    stat(f.inFloodZone ? "Yes" : "No", "In SFHA"),
    stat(f.baseFloodElevation != null ? `${f.baseFloodElevation} ft` : "—", "Base flood elev.")
  );
  body.append(stats);
  body.append(el("p", { class: "cap" }, (f.subtype ? `Subtype: ${f.subtype}. ` : "") + "Single-point query at the site centroid. SFHA = Special Flood Hazard Area (1% annual chance). Verify the full boundary on FEMA's map."));
}

// --- Contamination + Synthesis (claim-tagged) ------------------------------

function claimEl(c) {
  const labels = { verified: "VERIFIED", "plausible-unverified": "UNVERIFIED", "likely-hallucination": "⚠ HALLUCINATION?" };
  const node = el("div", { class: `claim ${c.status}` },
    el("div", { class: "tag" }, labels[c.status] || c.status),
    el("div", { class: "body" },
      el("div", {}, c.claim),
      el("div", { class: "reason" }, c.reason || "")
    )
  );
  if (c.source) node.querySelector(".body").append(el("div", { class: "src" }, linkEl(c.source, c.source)));
  return node;
}

function renderContamination(con) {
  const body = $("contamination-body");
  body.replaceChildren();
  if (!con) { body.append(el("p", { class: "cap" }, "Contamination brief skipped — set ANTHROPIC_API_KEY to enable it.")); return; }
  if (con.error) { body.append(el("p", { class: "cap" }, `Contamination brief failed: ${con.error}`)); return; }

  body.append(el("div", { class: "prose" }, el("p", {}, con.summary)));

  if (con.contaminants_of_concern?.length) {
    body.append(el("div", { class: "subhead" }, "Contaminants of concern"));
    for (const c of con.contaminants_of_concern) {
      const block = el("div", { class: "coc" },
        el("div", { class: "nm" }, `${c.name} `, el("span", { class: "media" }, `— ${c.media}`)),
        el("div", {}, c.health_or_design_note)
      );
      if (c.claim) block.append(claimEl(c.claim));
      body.append(block);
    }
  }

  body.append(el("div", { class: "subhead" }, "Plume & extent"));
  body.append(el("div", { class: "prose" }, el("p", {}, con.plume_and_extent)));

  body.append(el("div", { class: "subhead" }, "Institutional controls"));
  if (con.institutional_controls?.length) con.institutional_controls.forEach((c) => body.append(claimEl(c)));
  else body.append(el("p", { class: "cap" }, "None stated."));

  body.append(el("div", { class: "subhead" }, "Remediation status"));
  body.append(el("div", { class: "prose" }, el("p", {}, con.remediation_status)));

  if (con.sources?.length) {
    body.append(el("div", { class: "subhead" }, "Sources cited"));
    const ul = el("ul", { class: "checklist" });
    con.sources.forEach((s) => ul.append(el("li", {}, linkEl(s, s))));
    body.append(ul);
  }
}

function renderSynthesis(syn) {
  const body = $("synthesis-body");
  body.replaceChildren();
  if (!syn) { body.append(el("p", { class: "cap" }, "Design read skipped — set ANTHROPIC_API_KEY to enable it.")); return; }
  if (syn.error) { body.append(el("p", { class: "cap" }, `Design read failed: ${syn.error}`)); return; }

  body.append(el("div", { class: "prose" }, el("p", { html: `<strong>${escapeHtml(syn.site_in_a_sentence)}</strong>` })));

  const section = (title, text) => {
    body.append(el("div", { class: "subhead" }, title));
    body.append(el("div", { class: "prose" }, el("p", {}, text)));
  };
  section("Climate", syn.climate_read);
  section("Topography", syn.topography_read);
  section("Water & flood", syn.water_and_flood_read);
  section("Contamination implications", syn.contamination_implications);

  if (syn.design_opportunities?.length) {
    body.append(el("div", { class: "subhead" }, "Design opportunities"));
    syn.design_opportunities.forEach((c) => body.append(claimEl(c)));
  }

  body.append(el("div", { class: "subhead" }, "Key tensions"));
  body.append(el("div", { class: "tension" }, syn.key_tensions));

  body.append(el("div", { class: "cannot" },
    el("strong", {}, "What this analysis cannot tell you: "),
    document.createTextNode(syn.what_this_analysis_cannot_tell_you)
  ));

  if (syn.field_checklist?.length) {
    body.append(el("div", { class: "subhead" }, "Confirm in the field / with a survey"));
    const ul = el("ul", { class: "checklist" });
    syn.field_checklist.forEach((s) => ul.append(el("li", {}, s)));
    body.append(ul);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
