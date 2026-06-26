"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "./image";
import ProjectGallery from "./project-gallery";
import Thinking from "./Thinking";
import {
  type Analysis,
  type AnalyzeResult,
  type Candidate,
  type ChatMessage,
  type DroppedImage,
  type LinkRef,
  type Project,
  kindLabel
} from "./types";

const MAX_IMAGES = 6;

const CONF: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-neutral-200 text-neutral-900"
};

const card = "rounded-xl border border-neutral-200 bg-white p-5";
const primaryBtn =
  "rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50";
const ghostBtn =
  "rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50";
const field =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

type Tab = "upload" | "url" | "search";

export default function LibrarianTool() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBrief, setNewBrief] = useState("");
  const [editingProject, setEditingProject] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBrief, setEditBrief] = useState("");

  const [tab, setTab] = useState<Tab>("upload");
  const [ctxNote, setCtxNote] = useState("");
  const [srcLink, setSrcLink] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [effort, setEffort] = useState(0); // 0 Quick · 1 Balanced · 2 Deep

  const [busy, setBusy] = useState<null | "analyze" | "search">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userFacts, setUserFacts] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatting, setChatting] = useState(false);

  const [savedLinks, setSavedLinks] = useState<Set<string>>(new Set());
  const [imagesSaved, setImagesSaved] = useState(false);
  const [galleryKey, setGalleryKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentProject = projects.find((p) => p.id === projectId) || null;

  const loadProjects = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("library_projects")
      .select("id, owner, name, brief, created_at")
      .order("created_at", { ascending: false });
    setProjects((data || []) as Project[]);
  }, []);

  useEffect(() => {
    (async () => {
      await loadProjects();
      const last =
        typeof window !== "undefined" ? localStorage.getItem("librarian.project") : null;
      if (last) setProjectId(last);
    })();
  }, [loadProjects]);

  function selectProject(id: string) {
    setProjectId(id);
    setEditingProject(false);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem("librarian.project", id);
      else localStorage.removeItem("librarian.project");
    }
  }

  // Create a project by name (used by the top bar and the in-result destination
  // picker). Adds it to the list, selects it, and returns its id.
  async function createProjectNamed(
    name: string,
    brief?: string | null
  ): Promise<string | null> {
    const n = name.trim();
    if (!n) return null;
    setError(null);
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You appear to be signed out — reload the page.");
      return null;
    }
    const { data, error } = await supabase
      .from("library_projects")
      .insert({ owner: user.id, name: n, brief: (brief || "").trim() || null })
      .select("id, owner, name, brief, created_at")
      .single();
    if (error || !data) {
      setError(error?.message || "Could not create the project.");
      return null;
    }
    setProjects((p) => [data as Project, ...p]);
    selectProject((data as Project).id);
    return (data as Project).id;
  }

  async function createProject() {
    const id = await createProjectNamed(newName, newBrief);
    if (id) {
      setNewName("");
      setNewBrief("");
      setShowNew(false);
    }
  }

  async function saveProjectEdits() {
    if (!projectId) return;
    const supabase = createClient();
    await supabase
      .from("library_projects")
      .update({ name: editName.trim() || currentProject?.name, brief: editBrief.trim() || null })
      .eq("id", projectId);
    await loadProjects();
    setEditingProject(false);
  }

  async function deleteProject() {
    if (!projectId) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this project and everything catalogued in it?")
    )
      return;
    const supabase = createClient();
    await supabase.from("library_projects").delete().eq("id", projectId);
    selectProject("");
    await loadProjects();
  }

  // ── analysis helpers ────────────────────────────────────────────────────
  function resetForAnalyze() {
    setError(null);
    setNotice(null);
    setResult(null);
    setMessages([]);
    setUserFacts("");
    setSavedLinks(new Set());
    setImagesSaved(false);
  }

  function buildNote(): string | undefined {
    const parts: string[] = [];
    if (ctxNote.trim()) parts.push(ctxNote.trim());
    if (srcLink.trim()) parts.push(`Source link: ${srcLink.trim()}`);
    return parts.length ? parts.join("\n") : undefined;
  }

  function seedConversation(json: AnalyzeResult) {
    setUserFacts("");
    setChatInput("");
    setMessages(json.analysis?.reply ? [{ role: "librarian", text: json.analysis.reply }] : []);
  }

  function effortValue(): "low" | "medium" | "high" {
    return effort === 0 ? "low" : effort === 2 ? "high" : "medium";
  }

  async function postAnalyze(extra: Record<string, unknown>): Promise<AnalyzeResult> {
    const res = await fetch("/api/librarian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "analyze",
        projectId: projectId || null,
        effort: effortValue(),
        ...extra
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json as AnalyzeResult;
  }

  // Phase 2 — the free-archive lookups. Runs after the AI read is already on
  // screen, then fills in the context + links sections.
  async function runEnrich(searchId: string | null, analysis?: Analysis) {
    if (!analysis) {
      setResult((prev) => (prev ? { ...prev, _enrichLoading: false } : prev));
      return;
    }
    const top = analysis.candidates?.[0];
    try {
      const res = await fetch("/api/librarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "enrich",
          projectId: projectId || null,
          searchId,
          building: top?.building || "",
          architect: top?.architect || "",
          searchTerms: analysis.suggested_search_terms || [],
          vocabularyTerms: (analysis.vocabulary || []).map((v) => v.term)
        })
      });
      const json = await res.json();
      setResult((prev) =>
        prev
          ? { ...prev, enrichment: res.ok ? json.enrichment : prev.enrichment, _enrichLoading: false }
          : prev
      );
    } catch {
      setResult((prev) => (prev ? { ...prev, _enrichLoading: false } : prev));
    }
  }

  async function onFiles(list: FileList | File[]) {
    const files = Array.from(list)
      .filter((f) => /^image\//.test(f.type))
      .slice(0, MAX_IMAGES);
    if (!files.length) {
      setError("Drop image files (JPEG, PNG, GIF, or WebP).");
      return;
    }
    resetForAnalyze();
    setBusy("analyze");
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You appear to be signed out — reload the page.");

      const images: DroppedImage[] = [];
      for (const file of files) {
        const { blob, ext } = await prepareImage(file);
        const path = `${user.id}/${projectId || "inbox"}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}.${ext}`;
        const up = await supabase.storage
          .from("library")
          .upload(path, blob, {
            cacheControl: "3600",
            upsert: false,
            contentType: blob.type || file.type
          });
        if (up.error) throw up.error;
        const { data: signed } = await supabase.storage
          .from("library")
          .createSignedUrl(path, 3600);
        images.push({ path, url: signed?.signedUrl || "" });
      }

      const json = await postAnalyze({ imagePaths: images.map((i) => i.path), note: buildNote() });
      setResult({
        ...json,
        _images: images,
        _sourceLink: srcLink.trim() || null,
        _enrichLoading: true
      });
      seedConversation(json);
      runEnrich(json.searchId, json.analysis);
    } catch (e: any) {
      setError(e?.message || "Analysis failed.");
    } finally {
      setBusy(null);
    }
  }

  async function analyzeUrl() {
    const u = urlInput.trim();
    if (!u) return;
    resetForAnalyze();
    setBusy("analyze");
    try {
      const json = await postAnalyze({ imageUrls: [u], note: buildNote() });
      setResult({
        ...json,
        _images: [{ url: u }],
        _sourceLink: srcLink.trim() || u,
        _enrichLoading: true
      });
      seedConversation(json);
      runEnrich(json.searchId, json.analysis);
    } catch (e: any) {
      setError(e?.message || "Analysis failed.");
    } finally {
      setBusy(null);
    }
  }

  async function keywordSearch() {
    const q = queryInput.trim();
    if (!q) return;
    resetForAnalyze();
    setBusy("search");
    try {
      const res = await fetch("/api/librarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "search", projectId: projectId || null, query: q })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      setResult(json);
    } catch (e: any) {
      setError(e?.message || "Search failed.");
    } finally {
      setBusy(null);
    }
  }

  // Conversational refinement — the student tells the Librarian what it is.
  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg || !result) return;
    const imgs = result._images || [];
    const paths = imgs.filter((i) => i.path).map((i) => i.path!) as string[];
    const urls = imgs.filter((i) => !i.path).map((i) => i.url);
    const ref = paths.length ? { imagePaths: paths } : urls.length ? { imageUrls: urls } : null;
    if (!ref) {
      setError("The conversation is available for image analyses.");
      return;
    }
    setError(null);
    const facts = (userFacts ? userFacts + "\n" : "") + msg;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setUserFacts(facts);
    setChatInput("");
    setChatting(true);
    try {
      const res = await fetch("/api/librarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "analyze",
          projectId: projectId || null,
          effort: effortValue(),
          ...ref,
          userContext: facts,
          searchId: result.searchId
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setResult((prev) => ({
        ...(json as AnalyzeResult),
        _images: prev?._images,
        _sourceLink: prev?._sourceLink,
        _enrichLoading: true
      }));
      if (json.analysis?.reply) {
        setMessages((m) => [...m, { role: "librarian", text: json.analysis.reply }]);
      }
      runEnrich(json.searchId, json.analysis);
    } catch (e: any) {
      setError(e?.message || "Message failed.");
      setMessages((m) => [...m, { role: "librarian", text: "(couldn't respond — try again)" }]);
    } finally {
      setChatting(false);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (items) {
      const files: File[] = [];
      for (const it of Array.from(items)) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        setTab("upload");
        onFiles(files);
        return;
      }
    }
    const text = e.clipboardData?.getData("text") || "";
    if (/^https?:\/\//i.test(text.trim())) {
      setTab("url");
      setUrlInput(text.trim());
    }
  }

  // ── catalogue into the project ──────────────────────────────────────────
  function requireProject(): boolean {
    if (!projectId) {
      setError("Pick or create a project first — that's where saved items go.");
      return false;
    }
    return true;
  }

  async function insertItem(row: Record<string, unknown>) {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("You appear to be signed out — reload the page.");
    const { error } = await supabase.from("library_items").insert({
      owner: user.id,
      project_id: projectId,
      search_id: result?.searchId || null,
      ...row
    });
    if (error) throw error;
    setGalleryKey((k) => k + 1);
  }

  async function addImages() {
    if (!requireProject() || !result) return;
    setError(null);
    const a = result.analysis;
    const top: Candidate | undefined = a?.candidates?.[0];
    const id = result.enrichment?.identified;
    const imgs = result._images || [];
    try {
      for (const im of imgs) {
        await insertItem({
          source: im.path ? "upload" : "paste-url",
          kind: a?.image_kind || null,
          image_path: im.path || null,
          source_url: im.path ? result._sourceLink || null : im.url,
          title: id?.label || top?.building || "Found image",
          caption: a?.description?.slice(0, 280) || null,
          building: id?.label || top?.building || null,
          architect: id?.architect || top?.architect || null,
          year: id?.year || top?.year || null,
          location: top?.location || null,
          program: top?.program || null,
          tags: (a?.suggested_tags || []).slice(0, 12),
          confidence: top?.confidence || null
        });
      }
      setImagesSaved(true);
      setNotice(`Saved ${imgs.length} image${imgs.length > 1 ? "s" : ""} to the project.`);
    } catch (e: any) {
      setError(e?.message || "Could not save.");
    }
  }

  async function addLink(link: LinkRef) {
    if (!requireProject()) return;
    setError(null);
    const id = result?.enrichment?.identified;
    try {
      await insertItem({
        source: "reference",
        kind: "reference",
        source_url: link.url,
        title: link.label,
        notes: link.note || null,
        building: id?.label || null,
        architect: id?.architect || null,
        tags: ["reference"]
      });
      setSavedLinks((s) => new Set(s).add(link.url));
    } catch (e: any) {
      setError(e?.message || "Could not save.");
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        Librarian{" "}
        <span className="font-sans text-lg font-normal normal-case text-neutral-900">— Precedent Analysis</span>
      </h1>
      <p className="mt-2 max-w-2xl text-neutral-900">
        Drop one or more images you&rsquo;ve found. The Librarian reads them, proposes what they
        might be (as <span className="font-medium">leads to verify</span>, never facts), teaches
        you the words to describe them, and points you to where related plans, drawings, and
        photos actually live — then catalogues anything worth keeping into a project library you
        build over time.
      </p>

      {/* ── project bar ─────────────────────────────────────────────── */}
      <div className={`mt-6 ${card}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="display-font text-sm uppercase tracking-wide text-neutral-900">
            Project
          </span>
          <select
            value={projectId}
            onChange={(e) => selectProject(e.target.value)}
            className="min-w-48 rounded-md border border-neutral-300 px-2 py-1 text-sm"
          >
            <option value="">— none selected —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setShowNew((v) => !v);
              setEditingProject(false);
            }}
            className={ghostBtn}
          >
            {showNew ? "Cancel" : "+ New project"}
          </button>
          {projectId && (
            <button
              onClick={() => {
                setEditingProject((v) => !v);
                setShowNew(false);
                setEditName(currentProject?.name || "");
                setEditBrief(currentProject?.brief || "");
              }}
              className={ghostBtn}
            >
              {editingProject ? "Close" : "Edit project"}
            </button>
          )}
          {!projectId && (
            <span className="text-xs text-neutral-900">
              Pick a project to save into; you can still analyze without one.
            </span>
          )}
        </div>

        {showNew && (
          <div className="mt-3 space-y-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name *"
              className={field}
            />
            <textarea
              value={newBrief}
              onChange={(e) => setNewBrief(e.target.value)}
              rows={2}
              placeholder="A few sentences about this project — what it's for, what you're collecting (optional)"
              className={`${field} resize-y`}
            />
            <button onClick={createProject} className={primaryBtn}>
              Create project
            </button>
          </div>
        )}

        {editingProject && projectId && (
          <div className="mt-3 space-y-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Project name"
              className={field}
            />
            <textarea
              value={editBrief}
              onChange={(e) => setEditBrief(e.target.value)}
              rows={3}
              placeholder="A few sentences about this project"
              className={`${field} resize-y`}
            />
            <div className="flex gap-2">
              <button onClick={saveProjectEdits} className={primaryBtn}>
                Save
              </button>
              <button
                onClick={deleteProject}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Delete project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── capture ─────────────────────────────────────────────────── */}
      <div className={`mt-4 ${card}`} onPaste={onPaste}>
        <div className="flex gap-2">
          {(["upload", "url", "search"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "rounded-md px-3 py-1.5 text-sm",
                tab === t
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 hover:bg-neutral-100"
              ].join(" ")}
            >
              {t === "upload"
                ? "Upload / paste images"
                : t === "url"
                  ? "Image URL"
                  : "Search archives"}
            </button>
          ))}
        </div>

        {tab !== "search" && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="display-font text-xs uppercase tracking-wide text-neutral-900">
              Effort
            </span>
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={effort}
              onChange={(e) => setEffort(Number(e.target.value))}
              className="w-40 accent-neutral-900"
              aria-label="Analysis effort"
            />
            <span className="text-xs font-medium text-neutral-900">
              {effort === 0 ? "Quick" : effort === 1 ? "Balanced" : "Deep"}
            </span>
            <span className="text-xs text-neutral-900">
              {effort === 0
                ? "— fastest read"
                : effort === 1
                  ? "— more thorough"
                  : "— hardest IDs, slower"}
            </span>
          </div>
        )}

        {tab === "upload" && (
          <div className="mt-4 space-y-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
              }}
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 px-6 py-10 text-center hover:border-neutral-900"
            >
              <p className="font-medium">
                Drop image(s), click to choose, or paste (⌘/Ctrl-V)
              </p>
              <p className="mt-1 text-sm text-neutral-900">
                Up to {MAX_IMAGES} at once — several views of the same thing are welcome.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            <textarea
              value={ctxNote}
              onChange={(e) => setCtxNote(e.target.value)}
              rows={2}
              placeholder="Context (optional) — anything you already know: architect, project, where you found it…"
              className={`${field} resize-y`}
            />
            <input
              value={srcLink}
              onChange={(e) => setSrcLink(e.target.value)}
              placeholder="Source link (optional) — the page you found it on"
              className={field}
            />
          </div>
        )}

        {tab === "url" && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://…/image.jpg — paste an image link from the web"
                className={`${field} flex-1`}
              />
              <button onClick={analyzeUrl} disabled={busy !== null} className={primaryBtn}>
                Analyze
              </button>
            </div>
            <textarea
              value={ctxNote}
              onChange={(e) => setCtxNote(e.target.value)}
              rows={2}
              placeholder="Context (optional) — architect, project, where you found it…"
              className={`${field} resize-y`}
            />
          </div>
        )}

        {tab === "search" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && keywordSearch()}
              placeholder="Search by name — e.g. 'Villa Savoye' or 'Lina Bo Bardi SESC'"
              className={`${field} flex-1`}
            />
            <button onClick={keywordSearch} disabled={busy !== null} className={primaryBtn}>
              Search
            </button>
          </div>
        )}
      </div>

      {busy && (
        <div className="mt-4">
          <Thinking label={busy === "analyze" ? "Reading the image(s)…" : "Looking it up…"} />
        </div>
      )}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>
      )}

      {result && (
        <ResultPanel
          result={result}
          canSave={!!projectId}
          projects={projects}
          projectId={projectId}
          onSelectProject={selectProject}
          onCreateProject={createProjectNamed}
          onAddImages={addImages}
          imagesSaved={imagesSaved}
          onAddLink={addLink}
          savedLinks={savedLinks}
          messages={messages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSend={sendChat}
          chatting={chatting}
        />
      )}

      {/* ── project library ─────────────────────────────────────────── */}
      {projectId && (
        <section className="mt-10">
          <h2 className="display-font text-xl uppercase tracking-tight">
            {currentProject?.name} — library
          </h2>
          {currentProject?.brief && (
            <p className="mt-1 max-w-2xl text-sm text-neutral-900">{currentProject.brief}</p>
          )}
          <p className="mt-1 text-xs text-neutral-900">
            Shared with the studio; you can edit and remove your own items.
          </p>
          <ProjectGallery projectId={projectId} refreshKey={galleryKey} />
        </section>
      )}
    </div>
  );
}

// ───────────────────────────── conversation ──────────────────────────────

function Conversation({
  analysis,
  messages,
  chatInput,
  setChatInput,
  onSend,
  chatting
}: {
  analysis: Analysis;
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
  chatting: boolean;
}) {
  const lowConf =
    analysis.identification_confidence === "low" ||
    analysis.identification_confidence === "none";

  return (
    <section className={card}>
      <h3 className="display-font text-lg uppercase tracking-tight">Talk to the Librarian</h3>

      {lowConf && (
        <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">
            I couldn&rsquo;t confidently identify this, so I haven&rsquo;t written anything about
            it or guessed.
          </p>
          <p className="mt-1">
            Tell me what you know — author, project, location, year — and I&rsquo;ll catalog it and
            point you to related material.
          </p>
          {analysis.questions?.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {analysis.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mt-3 space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={[
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-900"
                ].join(" ")}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {chatting && (
        <div className="mt-2 flex justify-start">
          <div className="rounded-lg bg-neutral-100 px-3 py-2">
            <Thinking />
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !chatting) onSend();
          }}
          placeholder="Tell the Librarian more — e.g. 'Architect: Tadao Ando · Church of the Light · Ibaraki, 1989'"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <button onClick={onSend} disabled={chatting || !chatInput.trim()} className={primaryBtn}>
          {chatting ? "Thinking…" : "Send"}
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────── destination picker ───────────────────────────
// Choose where finds from this analysis go — an existing project or a brand new
// one made right here. Setting it also makes that project the current one (the
// library shown below), so there's a single, obvious destination.

function DestinationBar({
  projects,
  projectId,
  onSelect,
  onCreate
}: {
  projects: Project[];
  projectId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(projectId || "");
  const [newName, setNewName] = useState("");
  const [working, setWorking] = useState(false);
  const current = projects.find((p) => p.id === projectId) || null;

  async function apply() {
    if (sel === "__new__") {
      setWorking(true);
      const id = await onCreate(newName);
      setWorking(false);
      if (id) {
        setNewName("");
        setOpen(false);
      }
    } else if (sel) {
      onSelect(sel);
      setOpen(false);
    }
  }

  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-900">
        <span className="display-font text-xs uppercase tracking-wide">Save finds to</span>
        {!open ? (
          <>
            <span className="font-medium">
              {current ? current.name : "— no project chosen —"}
            </span>
            <button
              onClick={() => {
                setSel(projectId || "");
                setOpen(true);
              }}
              className={ghostBtn}
            >
              {current ? "Change / new" : "Choose / new"}
            </button>
          </>
        ) : (
          <>
            <select
              value={sel}
              onChange={(ev) => setSel(ev.target.value)}
              className="min-w-44 rounded-md border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value="">— choose a project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="__new__">➕ New project…</option>
            </select>
            {sel === "__new__" && (
              <input
                value={newName}
                onChange={(ev) => setNewName(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") apply();
                }}
                placeholder="New project name"
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            )}
            <button
              onClick={apply}
              disabled={working || !sel || (sel === "__new__" && !newName.trim())}
              className={primaryBtn}
            >
              {working ? "…" : "Set"}
            </button>
            <button onClick={() => setOpen(false)} className={ghostBtn}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── result panel ──────────────────────────────

function ResultPanel({
  result,
  canSave,
  projects,
  projectId,
  onSelectProject,
  onCreateProject,
  onAddImages,
  imagesSaved,
  onAddLink,
  savedLinks,
  messages,
  chatInput,
  setChatInput,
  onSend,
  chatting
}: {
  result: AnalyzeResult;
  canSave: boolean;
  projects: Project[];
  projectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => Promise<string | null>;
  onAddImages: () => void;
  imagesSaved: boolean;
  onAddLink: (l: LinkRef) => void;
  savedLinks: Set<string>;
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
  chatting: boolean;
}) {
  const a = result.analysis;
  const e = result.enrichment;
  const enrichLoading = !!result._enrichLoading;
  const images = result._images || [];

  const vocab = [
    ...(a?.vocabulary || []).map((v) => ({ ...v, source: "model" })),
    ...(e?.vocabulary || [])
  ];

  return (
    <div className="mt-8 space-y-6">
      <DestinationBar
        projects={projects}
        projectId={projectId}
        onSelect={onSelectProject}
        onCreate={onCreateProject}
      />

      {/* the student's image(s) + what they are */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {a && (
              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                {kindLabel(a.image_kind)}
              </span>
            )}
            {images.length > 0 && (
              <span className="text-xs text-neutral-900">
                {images.length} image{images.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {images.length > 0 && (
            <button
              onClick={onAddImages}
              disabled={imagesSaved || !canSave}
              title={!canSave ? "Choose a destination project above first" : undefined}
              className={ghostBtn}
            >
              {imagesSaved
                ? "✓ Added to project"
                : `★ Add image${images.length > 1 ? "s" : ""} to project`}
            </button>
          )}
        </div>

        {images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {images.map((im, i) => (
              <div
                key={i}
                className="aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
              >
                {im.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={im.url} alt={`Dropped reference image ${i + 1}`} className="h-full w-full object-cover" />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {a?.description?.trim() && (
          <p className="mt-3 text-sm text-neutral-900">{a.description}</p>
        )}
        {a?.visible_text?.trim() && (
          <p className="mt-2 text-sm text-neutral-900">
            <span className="font-medium">Text in image:</span> {a.visible_text}
          </p>
        )}
        {result.mode === "search" && (
          <p className="mt-1 text-sm text-neutral-900">
            Results for <span className="font-medium">{result.query}</span>.
          </p>
        )}
      </div>

      {/* conversation */}
      {a && (
        <Conversation
          analysis={a}
          messages={messages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSend={onSend}
          chatting={chatting}
        />
      )}

      {/* candidate identifications (only when there's something confident) */}
      {a && a.candidates && a.candidates.length > 0 && (
        <section className={card}>
          <h3 className="display-font text-lg uppercase tracking-tight">Possible identifications</h3>
          <p className="mt-1 text-sm text-neutral-900">
            Leads to verify — not facts. A confident wrong name is the worst outcome, so the model
            abstains when unsure.
          </p>
          <div className="mt-3 space-y-3">
            {a.candidates.map((c, i) => (
              <div key={i} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-medium">{c.building || "Unidentified"}</h4>
                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
                      CONF[c.confidence] || CONF.low
                    ].join(" ")}
                  >
                    {c.confidence} confidence
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-neutral-900">
                  {[c.architect, c.year, c.location, c.program].filter(Boolean).join(" · ")}
                </p>
                {c.visual_evidence && (
                  <p className="mt-1 text-sm">
                    <span className="text-neutral-900">Seen in image: </span>
                    {c.visual_evidence}
                  </p>
                )}
                {c.verify_hint && (
                  <p className="mt-1 text-sm text-amber-800">
                    <span className="font-medium">Verify:</span> {c.verify_hint}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* text context */}
      {(e?.identified || e?.context) && (
        <section className={card}>
          <h3 className="display-font text-lg uppercase tracking-tight">Context</h3>
          {e.identified && (
            <div className="mt-2 text-sm">
              <p className="font-medium">{e.identified.label}</p>
              <p className="text-neutral-900">
                {[e.identified.architect, e.identified.year, e.identified.style]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {e.identified.description && (
                <p className="mt-1 text-neutral-900">{e.identified.description}</p>
              )}
            </div>
          )}
          {e.context && (
            <div className="mt-3 text-sm">
              <p className="text-neutral-900">{e.context.summary}</p>
              <a
                href={e.context.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-blue-700 underline"
              >
                Read more on Wikipedia →
              </a>
            </div>
          )}
        </section>
      )}

      {/* vocabulary */}
      {vocab.length > 0 && (
        <section className={card}>
          <h3 className="display-font text-lg uppercase tracking-tight">Vocabulary</h3>
          <p className="mt-1 text-sm text-neutral-900">
            Words to describe and search for this kind of work.
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {vocab.map((v, i) => (
              <div key={i} className="rounded-lg border border-neutral-200 p-2">
                <dt className="text-sm font-medium">
                  {v.term}
                  {v.source === "getty-aat" && (
                    <span className="ml-2 rounded bg-neutral-100 px-1 py-0.5 text-[10px] uppercase text-neutral-900">
                      Getty AAT
                    </span>
                  )}
                </dt>
                <dd className="text-sm text-neutral-900">{v.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* where to find related material — links, never speculative images */}
      <section className={card}>
        <h3 className="display-font text-lg uppercase tracking-tight">
          Where to find related material
        </h3>
        <p className="mt-1 text-sm text-neutral-900">
          Curated links — plans, drawings, other views, photos. We don&rsquo;t auto-show archive
          images because automatic matches are unreliable; click through, judge for yourself, and
          drop anything good back in above.
        </p>
        {enrichLoading ? (
          <div className="mt-3">
            <Thinking label="Gathering context and where to look…" />
          </div>
        ) : e?.links?.length ? (
          <ul className="mt-3 space-y-2">
            {e.links.map((l, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-2"
              >
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-blue-700 underline"
                  title={l.label}
                >
                  {l.label}
                  {l.note ? <span className="text-neutral-900"> — {l.note}</span> : null}
                </a>
                {canSave && (
                  <button
                    onClick={() => onAddLink(l)}
                    disabled={savedLinks.has(l.url)}
                    className={ghostBtn}
                  >
                    {savedLinks.has(l.url) ? "✓ Saved" : "+ Save link"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-neutral-900">
            Nothing to point to yet — tell the Librarian what this is and I&rsquo;ll add search
            links.
          </p>
        )}
        {!canSave && e?.links?.length ? (
          <p className="mt-3 text-xs text-neutral-900">
            Select a project above to save any of these as references.
          </p>
        ) : null}
      </section>

      {/* diagnostics */}
      {e?.notes?.length ? <p className="text-xs text-neutral-900">{e.notes.join(" ")}</p> : null}
    </div>
  );
}
