"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "./image";
import ProjectGallery from "./project-gallery";
import {
  type AnalyzeResult,
  type Analysis,
  type Candidate,
  type ChatMessage,
  type Project,
  type RelatedImage,
  kindLabel
} from "./types";

const CONF: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-neutral-200 text-neutral-600"
};

const GROUP_ORDER = [
  "plan",
  "section",
  "elevation",
  "axon",
  "perspective",
  "photo-exterior",
  "photo-interior",
  "model-photo",
  "sketch",
  "diagram",
  "detail",
  "archive",
  "other"
];

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

  const [tab, setTab] = useState<Tab>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [queryInput, setQueryInput] = useState("");

  const [busy, setBusy] = useState<null | "analyze" | "search">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [galleryKey, setGalleryKey] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userFacts, setUserFacts] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatting, setChatting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function seedConversation(json: AnalyzeResult) {
    setUserFacts("");
    setChatInput("");
    setMessages(json.analysis?.reply ? [{ role: "librarian", text: json.analysis.reply }] : []);
  }

  // ── load projects + restore last selection ──────────────────────────────
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("library_projects")
        .select("id, owner, name, brief, created_at")
        .order("created_at", { ascending: false });
      const list = (data || []) as Project[];
      setProjects(list);
      const last =
        typeof window !== "undefined" ? localStorage.getItem("librarian.project") : null;
      if (last && list.some((p) => p.id === last)) setProjectId(last);
    })();
  }, []);

  function selectProject(id: string) {
    setProjectId(id);
    if (typeof window !== "undefined") localStorage.setItem("librarian.project", id);
  }

  async function createProject() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You appear to be signed out — reload the page.");
      return;
    }
    const { data, error } = await supabase
      .from("library_projects")
      .insert({ owner: user.id, name, brief: newBrief.trim() || null })
      .select("id, owner, name, brief, created_at")
      .single();
    if (error || !data) {
      setError(error?.message || "Could not create the project.");
      return;
    }
    setProjects((p) => [data as Project, ...p]);
    selectProject((data as Project).id);
    setNewName("");
    setNewBrief("");
    setShowNew(false);
  }

  // ── analysis + search ───────────────────────────────────────────────────
  async function postAnalyze(extra: Record<string, unknown>): Promise<AnalyzeResult> {
    const res = await fetch("/api/librarian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "analyze", projectId: projectId || null, ...extra })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json as AnalyzeResult;
  }

  async function onFile(file: File) {
    setError(null);
    setNotice(null);
    if (!/^image\//.test(file.type)) {
      setError("That's not an image file.");
      return;
    }
    setBusy("analyze");
    setResult(null);
    setSaved(new Set());
    setMessages([]);
    setUserFacts("");
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You appear to be signed out — reload the page.");

      const { blob, ext } = await prepareImage(file);
      const path = `${user.id}/${projectId || "inbox"}/${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("library")
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: blob.type || file.type
        });
      if (up.error) throw up.error;

      const json = await postAnalyze({ imagePath: path });
      const { data: signed } = await supabase.storage
        .from("library")
        .createSignedUrl(path, 3600);
      setResult({ ...json, _imagePath: path, _previewUrl: signed?.signedUrl || null });
      seedConversation(json);
    } catch (e: any) {
      setError(e?.message || "Analysis failed.");
    } finally {
      setBusy(null);
    }
  }

  async function analyzeUrl() {
    const u = urlInput.trim();
    if (!u) return;
    setError(null);
    setNotice(null);
    setBusy("analyze");
    setResult(null);
    setSaved(new Set());
    setMessages([]);
    setUserFacts("");
    try {
      const json = await postAnalyze({ imageUrl: u });
      setResult({ ...json, _sourceUrl: u, _previewUrl: u });
      seedConversation(json);
    } catch (e: any) {
      setError(e?.message || "Analysis failed.");
    } finally {
      setBusy(null);
    }
  }

  async function keywordSearch() {
    const q = queryInput.trim();
    if (!q) return;
    setError(null);
    setNotice(null);
    setBusy("search");
    setResult(null);
    setSaved(new Set());
    setMessages([]);
    setUserFacts("");
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

  // Conversational refinement: the student tells the Librarian what it is /
  // gives more data; we re-analyze the same image with those facts as ground
  // truth and re-search the archives with the corrected identity.
  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg || !result) return;
    const ref = result._imagePath
      ? { imagePath: result._imagePath }
      : result._sourceUrl
        ? { imageUrl: result._sourceUrl }
        : null;
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
          ...ref,
          userContext: facts,
          searchId: result.searchId
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setResult((prev) => ({
        ...(json as AnalyzeResult),
        _imagePath: prev?._imagePath,
        _previewUrl: prev?._previewUrl,
        _sourceUrl: prev?._sourceUrl
      }));
      if (json.analysis?.reply) {
        setMessages((m) => [...m, { role: "librarian", text: json.analysis.reply }]);
      }
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
      for (const it of Array.from(items)) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) {
            e.preventDefault();
            setTab("upload");
            onFile(f);
            return;
          }
        }
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
      setError("Pick or create a project first — that's where saved images go.");
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

  async function saveSource() {
    if (!requireProject() || !result?.analysis) return;
    setError(null);
    const a = result.analysis;
    const top: Candidate | undefined = a.candidates?.[0];
    const id = result.enrichment?.identified;
    try {
      await insertItem({
        source: result._imagePath ? "upload" : "paste-url",
        kind: a.image_kind || null,
        image_path: result._imagePath || null,
        source_url: result._sourceUrl || null,
        title: id?.label || top?.building || "Found image",
        caption: a.description?.slice(0, 280) || null,
        building: id?.label || top?.building || null,
        architect: id?.architect || top?.architect || null,
        year: id?.year || top?.year || null,
        location: top?.location || null,
        program: top?.program || null,
        tags: (a.suggested_tags || []).slice(0, 12),
        confidence: top?.confidence || null
      });
      setNotice("Saved the source image to the project.");
    } catch (e: any) {
      setError(e?.message || "Could not save.");
    }
  }

  async function addRelated(img: RelatedImage) {
    if (!requireProject()) return;
    setError(null);
    const id = result?.enrichment?.identified;
    try {
      await insertItem({
        source: img.source === "loc" ? "archive" : "llm-found",
        kind: img.kind || null,
        source_url: img.sourceUrl || img.url,
        thumb_url: img.thumbUrl || img.url,
        title: img.title || id?.label || "Related image",
        building: id?.label || null,
        architect: id?.architect || null,
        year: id?.year || null,
        tags: img.kind ? [img.kind] : [],
        license: img.license || null,
        attribution: img.attribution || null,
        confidence: id ? "medium" : "low"
      });
      setSaved((s) => new Set(s).add(img.url));
    } catch (e: any) {
      setError(e?.message || "Could not save.");
    }
  }

  const currentProject = projects.find((p) => p.id === projectId) || null;

  return (
    <div>
      <h1 className="text-3xl">Librarian</h1>
      <p className="mt-2 max-w-2xl text-neutral-600">
        Found a single image and don&rsquo;t know what it is? Drop it here. The Librarian
        reads it, proposes what it might be (as <span className="font-medium">leads to verify</span>,
        not facts), pulls related plans, drawings, and photos from open archives, and teaches
        you the words to describe it — then catalogues anything worth keeping into a project
        library you build over time.
      </p>

      {/* ── project bar ─────────────────────────────────────────────── */}
      <div className={`mt-6 ${card}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="display-font text-sm uppercase tracking-wide text-neutral-500">
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
          <button onClick={() => setShowNew((v) => !v)} className={ghostBtn}>
            {showNew ? "Cancel" : "+ New project"}
          </button>
          {currentProject?.brief && (
            <span className="text-sm text-neutral-500">— {currentProject.brief}</span>
          )}
          {!projectId && (
            <span className="text-xs text-neutral-400">
              Pick a project to save finds into; you can still analyze without one.
            </span>
          )}
        </div>
        {showNew && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name *"
              className={field}
            />
            <input
              value={newBrief}
              onChange={(e) => setNewBrief(e.target.value)}
              placeholder="One-line brief (optional)"
              className={field}
            />
            <button onClick={createProject} className={primaryBtn}>
              Create
            </button>
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
              {t === "upload" ? "Upload / paste image" : t === "url" ? "Image URL" : "Search archives"}
            </button>
          ))}
        </div>

        {tab === "upload" && (
          <div className="mt-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) onFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 px-6 py-10 text-center hover:border-neutral-900"
            >
              <p className="font-medium">Drop an image, click to choose, or paste (⌘/Ctrl-V)</p>
              <p className="mt-1 text-sm text-neutral-500">
                JPEG · PNG · GIF · WebP — large images are downscaled automatically.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        )}

        {tab === "url" && (
          <div className="mt-4 flex flex-wrap gap-2">
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
        )}

        {tab === "search" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && keywordSearch()}
              placeholder="Search open archives by name — e.g. 'Villa Savoye' or 'Lina Bo Bardi SESC'"
              className={`${field} flex-1`}
            />
            <button onClick={keywordSearch} disabled={busy !== null} className={primaryBtn}>
              Search
            </button>
          </div>
        )}
      </div>

      {busy && (
        <p className="mt-4 text-sm text-neutral-500">
          {busy === "analyze"
            ? "Reading the image and searching the archives…"
            : "Searching the archives…"}
        </p>
      )}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>
      )}

      {result && (
        <ResultPanel
          result={result}
          saved={saved}
          onSaveSource={saveSource}
          onAddRelated={addRelated}
          canSave={!!projectId}
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
          <p className="mt-1 text-sm text-neutral-500">
            Everything catalogued in this project. Shared with the studio; you can edit and
            remove your own.
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
            Tell me what you know — author, project, location, year — and I&rsquo;ll catalog it
            and pull related material.
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
                    : "bg-neutral-100 text-neutral-800"
                ].join(" ")}
              >
                {m.text}
              </div>
            </div>
          ))}
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

// ───────────────────────────── result panel ──────────────────────────────

function ResultPanel({
  result,
  saved,
  onSaveSource,
  onAddRelated,
  canSave,
  messages,
  chatInput,
  setChatInput,
  onSend,
  chatting
}: {
  result: AnalyzeResult;
  saved: Set<string>;
  onSaveSource: () => void;
  onAddRelated: (img: RelatedImage) => void;
  canSave: boolean;
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
  chatting: boolean;
}) {
  const a = result.analysis;
  const e = result.enrichment;
  const top = a?.candidates?.[0];

  // merge model + Getty vocabulary
  const vocab = [
    ...(a?.vocabulary || []).map((v) => ({ ...v, source: "model" })),
    ...(e?.vocabulary || [])
  ];

  // group related images by kind
  const groups: Record<string, RelatedImage[]> = {};
  for (const im of e?.relatedImages || []) {
    const k = im.kind || "other";
    (groups[k] ||= []).push(im);
  }
  const groupKeys = Object.keys(groups).sort(
    (x, y) => (GROUP_ORDER.indexOf(x) + 1 || 99) - (GROUP_ORDER.indexOf(y) + 1 || 99)
  );

  return (
    <div className="mt-8 space-y-6">
      {/* the image + what it is */}
      <div className={card}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[200px_1fr]">
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
            {result._previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result._previewUrl} alt="analyzed" className="h-full w-full object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center text-xs text-neutral-400">
                {result.mode === "search" ? "keyword search" : "no preview"}
              </div>
            )}
          </div>
          <div>
            {a && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                    {kindLabel(a.image_kind)}
                  </span>
                  {canSave && (
                    <button onClick={onSaveSource} className={ghostBtn}>
                      ★ Save this image to project
                    </button>
                  )}
                </div>
                {a.description?.trim() && (
                  <p className="mt-2 text-sm text-neutral-800">{a.description}</p>
                )}
                {a.visible_text?.trim() && (
                  <p className="mt-2 text-sm text-neutral-600">
                    <span className="font-medium">Text in image:</span> {a.visible_text}
                  </p>
                )}
              </>
            )}
            {result.mode === "search" && (
              <p className="text-sm text-neutral-700">
                Archive results for <span className="font-medium">{result.query}</span>.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* conversation — tell the Librarian what it is */}
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

      {/* candidate identifications (only when there's something to show) */}
      {a && a.candidates && a.candidates.length > 0 && (
        <section className={card}>
          <h3 className="display-font text-lg uppercase tracking-tight">Possible identifications</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Leads to verify — not facts. A confident wrong name is the worst outcome, so the
            model abstains when unsure.
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
                <p className="mt-0.5 text-sm text-neutral-500">
                  {[c.architect, c.year, c.location, c.program].filter(Boolean).join(" · ")}
                </p>
                {c.visual_evidence && (
                  <p className="mt-1 text-sm">
                    <span className="text-neutral-500">Seen in image: </span>
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

      {/* identified context (Wikidata) + Wikipedia */}
      {(e?.identified || e?.context) && (
        <section className={card}>
          <h3 className="display-font text-lg uppercase tracking-tight">Context</h3>
          {e.identified && (
            <div className="mt-2 text-sm">
              <p className="font-medium">{e.identified.label}</p>
              <p className="text-neutral-500">
                {[e.identified.architect, e.identified.year, e.identified.style]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {e.identified.description && (
                <p className="mt-1 text-neutral-700">{e.identified.description}</p>
              )}
            </div>
          )}
          {e.context && (
            <div className="mt-3 text-sm">
              <p className="text-neutral-700">{e.context.summary}</p>
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
          {e.sources?.length ? (
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {e.sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 underline hover:text-neutral-800"
                >
                  {s.label} ↗
                </a>
              ))}
            </div>
          ) : null}
        </section>
      )}

      {/* vocabulary */}
      {vocab.length > 0 && (
        <section className={card}>
          <h3 className="display-font text-lg uppercase tracking-tight">Vocabulary</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Words to describe and search for this kind of work.
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {vocab.map((v, i) => (
              <div key={i} className="rounded-lg border border-neutral-200 p-2">
                <dt className="text-sm font-medium">
                  {v.term}
                  {v.source === "getty-aat" && (
                    <span className="ml-2 rounded bg-neutral-100 px-1 py-0.5 text-[10px] uppercase text-neutral-500">
                      Getty AAT
                    </span>
                  )}
                </dt>
                <dd className="text-sm text-neutral-600">{v.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* related images */}
      <section className={card}>
        <h3 className="display-font text-lg uppercase tracking-tight">Related material</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Plans, drawings, other views, and photos from open archives. Check the license before
          reuse; click any image to open its source.
        </p>
        {groupKeys.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">
            No archive matches — likely a lesser-known or recent building. Try a manual search,
            or a different view of it.
          </p>
        ) : (
          <div className="mt-3 space-y-5">
            {groupKeys.map((k) => (
              <div key={k}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {kindLabel(k)} · {groups[k].length}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {groups[k].map((img, i) => (
                    <figure
                      key={`${k}-${i}`}
                      className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
                    >
                      <a href={img.sourceUrl || img.url} target="_blank" rel="noopener noreferrer">
                        <div className="aspect-[4/3] bg-neutral-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.thumbUrl || img.url}
                            alt={img.title || "related"}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </a>
                      <figcaption className="p-2">
                        {img.title && (
                          <p className="truncate text-xs text-neutral-700" title={img.title}>
                            {img.title}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] text-neutral-400">
                          {img.source} {img.license ? `· ${img.license}` : ""}
                        </p>
                        <button
                          onClick={() => onAddRelated(img)}
                          disabled={!canSave || saved.has(img.url)}
                          className={`mt-1 w-full ${ghostBtn}`}
                        >
                          {saved.has(img.url) ? "✓ Added" : "+ Add to project"}
                        </button>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {!canSave && (
          <p className="mt-3 text-xs text-neutral-400">
            Select a project above to save any of these.
          </p>
        )}
      </section>

      {/* diagnostics */}
      {e?.notes?.length ? (
        <p className="text-xs text-neutral-400">{e.notes.join(" ")}</p>
      ) : null}
    </div>
  );
}
