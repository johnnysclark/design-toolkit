"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DISCIPLINES, type Discipline } from "@/lib/skills-coach/concepts";
import { LEVELS, type Level, type CoachMeta } from "@/lib/anthropic/skills-coach-prompts";
import { latestScript, type CodeBlock } from "@/lib/skills-coach/code";
import CoachSidebar from "./CoachSidebar";
import MessageBubble, { type ChatMessage } from "./MessageBubble";

type Upload = { path: string; kind: "image" | "pdf" };
type Pending = { file: File; name: string; kind: "image" | "pdf"; previewUrl: string | null };

// A deep pool of starter questions across every discipline; a fresh handful is
// drawn on each visit (see the shuffle in the component) so the empty state
// never looks the same twice.
const EXAMPLE_POOL = [
  // Rhino
  "How do I loft between two curves in Rhino?",
  "What's the difference between a polysurface and a SubD in Rhino?",
  "How do I fillet the edges of a closed solid in Rhino?",
  "My Make2D output is missing lines — how do I fix it?",
  "How do I split a surface with a curve in Rhino?",
  "How do I array objects along a curve in Rhino?",
  // Grasshopper
  "My Grasshopper definition makes too many results — what's wrong with my data tree?",
  "When do I graft vs flatten a list in Grasshopper?",
  "How do I scatter points evenly across a surface in Grasshopper?",
  "What does the Dispatch component do, and when would I use it?",
  "How do I bake Grasshopper geometry onto a specific layer?",
  // AutoCAD
  "How do I set up a viewport at 1:100 in an AutoCAD layout?",
  "What's the difference between model space and paper space?",
  "How do I make and edit a block in AutoCAD?",
  "My dimensions look tiny in the layout — how does annotation scale work?",
  "How do I attach an xref, and why won't it show up?",
  // Revit
  "What's the difference between a type and an instance in Revit?",
  "How do I create a section view and drop it on a sheet in Revit?",
  "How do I schedule all the doors in my Revit model?",
  "What are phases in Revit, and how do I show existing vs new?",
  // Adobe
  "How do I drop a white-background diagram onto a colored board in Photoshop?",
  "What's the difference between a clipping mask and a layer mask?",
  "Should I use Illustrator or Photoshop for a line diagram?",
  "How do I set bleed and margins for a printed booklet in InDesign?",
  "How do I use paragraph styles to format a long document in InDesign?"
];
const EXAMPLE_COUNT = 4;

// Fisher–Yates pick of N distinct prompts. Runs only on the client (after mount)
// so server and first-paint markup stay identical — no hydration mismatch.
function sampleExamples(pool: string[], n: number): string[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// Downscale a raster image to a bounded JPEG client-side (normalizes format,
// strips EXIF, keeps the upload small). HEIC can't be decoded here — guarded
// before this is called.
function toJpegBlob(file: File, maxDim = 2000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Could not process the image."));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not process the image."))),
        "image/jpeg",
        0.9
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

export default function SkillsCoachChat({
  initialConversationId = null,
  initialDiscipline = "general",
  initialMessages = []
}: {
  initialConversationId?: string | null;
  initialDiscipline?: Discipline;
  initialMessages?: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [discipline, setDiscipline] = useState<Discipline>(initialDiscipline);
  const [level, setLevel] = useState<Level>("intermediate");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [concept, setConcept] = useState<string | null>(() => {
    for (let i = initialMessages.length - 1; i >= 0; i--) {
      const c = initialMessages[i]?.meta?.concept;
      if (c) return c;
    }
    return null;
  });
  const [script, setScript] = useState<CodeBlock | null>(() => {
    for (let i = initialMessages.length - 1; i >= 0; i--) {
      if (initialMessages[i].role === "assistant") {
        const s = latestScript(initialMessages[i].content);
        if (s) return s;
      }
    }
    return null;
  });
  const [ideas, setIdeas] = useState<string[]>(() => {
    for (let i = initialMessages.length - 1; i >= 0; i--) {
      const fi = initialMessages[i]?.meta?.further_ideas;
      if (fi && fi.length) return fi;
    }
    return [];
  });
  // Deterministic on the server (first N of the pool), reshuffled on the client
  // each mount — so every page refresh surfaces a different set of examples.
  const [examples, setExamples] = useState<string[]>(() => EXAMPLE_POOL.slice(0, EXAMPLE_COUNT));

  const userIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const metaRef = useRef<CoachMeta | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        userIdRef.current = data.user?.id ?? null;
      });
  }, []);

  useEffect(() => {
    setExamples(sampleExamples(EXAMPLE_POOL, EXAMPLE_COUNT));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "heic" || ext === "heif" || file.type.includes("heic") || file.type.includes("heif")) {
      setError("HEIC photos aren't supported yet — on your phone, export or share the sketch as JPG or PNG.");
      return;
    }
    const isPdf = file.type === "application/pdf" || ext === "pdf";
    const isImage = file.type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
    if (!isPdf && !isImage) {
      setError("For now I can read images (JPG/PNG/WebP/GIF) and PDFs. For a 3D or Grasshopper file, drop a screenshot of your viewport instead.");
      return;
    }
    setPending({
      file,
      name: file.name,
      kind: isPdf ? "pdf" : "image",
      previewUrl: isImage ? URL.createObjectURL(file) : null
    });
  }

  async function uploadPending(p: Pending): Promise<Upload> {
    const supabase = createClient();
    const userId = userIdRef.current ?? (await supabase.auth.getUser()).data.user?.id ?? null;
    if (!userId) throw new Error("You seem to be signed out — reload the page.");

    let blob: Blob = p.file;
    let ext = p.name.split(".").pop()?.toLowerCase() ?? "bin";
    let contentType = p.file.type || "application/octet-stream";
    if (p.kind === "image") {
      blob = await toJpegBlob(p.file);
      ext = "jpg";
      contentType = "image/jpeg";
    }
    const safe = p.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
    const path = `${userId}/${Date.now()}-${safe}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("coach-uploads")
      .upload(path, blob, { contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);
    return { path, kind: p.kind };
  }

  async function send(text: string) {
    if (streaming) return;
    const trimmed = text.trim();
    const hasPending = !!pending;
    if (!trimmed && !hasPending) return;
    setError(null);

    let upload: Upload | undefined;
    if (pending) {
      try {
        upload = await uploadPending(pending);
      } catch (err: any) {
        setError(err?.message || "Upload failed.");
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      attachment: pending
        ? { name: pending.name, kind: pending.kind, url: pending.previewUrl ?? undefined }
        : null
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setPending(null);
    setStreaming(true);
    setStreamingText("");
    metaRef.current = null;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/skills-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: trimmed,
          level,
          discipline,
          attachment: upload
        }),
        signal: ctrl.signal
      });

      if (!res.ok || !res.body) {
        let msg = "Request failed.";
        try {
          msg = (await res.json()).error || msg;
        } catch {
          /* non-JSON */
        }
        setError(msg);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) handleFrame(frame);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") setError(err?.message || "Connection lost.");
      setStreaming(false);
      setStreamingText("");
    }
  }

  function handleFrame(frame: string) {
    let event = "";
    let dataStr = "";
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataStr = line.slice(5).trim();
    }
    if (!event || !dataStr) return;
    let data: any;
    try {
      data = JSON.parse(dataStr);
    } catch {
      return;
    }

    if (event === "token") {
      setStreamingText((t) => t + (data.text ?? ""));
    } else if (event === "meta") {
      metaRef.current = {
        concept: data.concept ?? null,
        claims: data.claims ?? [],
        report_back: data.report_back ?? null,
        further_ideas: data.further_ideas ?? []
      };
      setConcept(data.concept ?? null);
      setIdeas(data.further_ideas ?? []);
    } else if (event === "done") {
      const assistant: ChatMessage = {
        id: data.messageId || crypto.randomUUID(),
        role: "assistant",
        content: data.prose ?? "",
        meta: metaRef.current ?? undefined
      };
      setMessages((m) => [...m, assistant]);
      const s = latestScript(data.prose ?? "");
      if (s) setScript(s);
      if (data.conversationId) setConversationId(data.conversationId);
      setStreamingText("");
      setStreaming(false);
    } else if (event === "error") {
      setError(data.message || "Something went wrong.");
      setStreaming(false);
      setStreamingText("");
    }
  }

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
    setStreamingText("");
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setConcept(null);
    setScript(null);
    setIdeas([]);
    setStreamingText("");
    setStreaming(false);
    setError(null);
    setPending(null);
    setInput("");
    setExamples(sampleExamples(EXAMPLE_POOL, EXAMPLE_COUNT));
  }

  function onComposerKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const empty = messages.length === 0 && !streaming;

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        Coach{" "}
        <span className="font-sans text-lg font-normal normal-case text-neutral-900">— Skills Tutor</span>
      </h1>
      <p className="mt-2 max-w-2xl text-neutral-900">
        A patient tutor for Rhino, Grasshopper, AutoCAD, Revit, and the Adobe
        suite. Pick a tool and a level, ask your question, upload a sketch or
        screenshot — and report back what happened so we can debug it together.
      </p>

      {/* controls */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-neutral-900">Tool</span>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as Discipline)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
          >
            {DISCIPLINES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-900" id="coach-level-label">Level</span>
          <div
            role="group"
            aria-labelledby="coach-level-label"
            className="inline-flex overflow-hidden rounded-lg border border-neutral-300"
          >
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                title={l.desc}
                aria-pressed={level === l.id}
                onClick={() => setLevel(l.id)}
                className={[
                  "px-3 py-1.5 text-sm transition-colors",
                  level === l.id
                    ? "bg-neutral-900 text-white"
                    : "bg-white text-neutral-900 hover:bg-neutral-100"
                ].join(" ")}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={newChat}
          className="ml-auto rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 hover:bg-neutral-100"
        >
          New chat
        </button>
      </div>

      <p className="mt-2 text-xs text-neutral-900">
        <span className="font-medium text-neutral-900">
          {LEVELS.find((l) => l.id === level)?.label}:
        </span>{" "}
        {LEVELS.find((l) => l.id === level)?.desc}
      </p>

      {/* two-pane */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
        {/* chat column */}
        <div className="flex h-[68vh] min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
          <div
            className="flex-1 space-y-4 overflow-y-auto p-4"
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-busy={streaming}
          >
            {empty && (
              <div className="mx-auto mt-6 max-w-md text-center">
                <p className="text-sm text-neutral-900">
                  Ask anything about your current tool. Try one of these:
                </p>
                <div className="mt-3 space-y-2">
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setInput(ex)}
                      className="block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-sm text-neutral-900 hover:border-neutral-400"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-900">
                  {streamingText ? (
                    <span className="whitespace-pre-wrap">{streamingText}</span>
                  ) : (
                    <span className="text-neutral-900">Thinking…</span>
                  )}
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* composer */}
          <div className="border-t border-neutral-200 bg-white p-3">
            {error && (
              <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            {pending && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs">
                <span aria-hidden="true">{pending.kind === "pdf" ? "📄" : "🖼"}</span>
                <span className="max-w-[16rem] truncate">
                  {pending.kind === "pdf" ? "PDF: " : "Image: "}
                  {pending.name}
                </span>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="text-neutral-900 hover:opacity-60"
                  aria-label="Remove attachment"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={pickFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title="Attach a sketch, screenshot, or PDF"
                aria-label="Attach a sketch, screenshot, or PDF"
                className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100"
              >
                <span aria-hidden="true">📎</span>
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onComposerKey}
                rows={1}
                placeholder={`Ask about ${
                  DISCIPLINES.find((d) => d.id === discipline)?.label ?? "your tool"
                }…  (Enter to send, Shift+Enter for a new line)`}
                className="max-h-40 min-h-[2.5rem] flex-1 resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={stop}
                  className="shrink-0 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={!input.trim() && !pending}
                  className="shrink-0 rounded-lg bg-[#ff3b21] px-4 py-2 text-sm font-medium text-white hover:bg-[#e22d15] disabled:opacity-40"
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>

        {/* concept panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <CoachSidebar concept={concept} script={script} ideas={ideas} />
        </div>
      </div>
    </div>
  );
}
