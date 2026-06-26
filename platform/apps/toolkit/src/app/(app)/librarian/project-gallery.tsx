"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KIND_OPTIONS, kindLabel, type LibraryItem } from "./types";

interface Row extends LibraryItem {
  _display: string | null; // resolved image URL, when this item is an image
  _isImage: boolean; // false → render as a link/reference card
}

const IMG_EXT = /\.(jpe?g|png|gif|webp|svg|avif)(\?|$)/i;
const ghostBtn =
  "rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50";
const field =
  "w-full rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-900";

export default function ProjectGallery({
  projectId,
  refreshKey
}: {
  projectId: string;
  refreshKey: number;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      setMe(user?.id || null);

      const { data } = await supabase
        .from("library_items")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      const items = (data || []) as LibraryItem[];
      const withUrls: Row[] = await Promise.all(
        items.map(async (it) => {
          let display: string | null = null;
          let isImage = false;
          if (it.image_path) {
            const { data: s } = await supabase.storage
              .from("library")
              .createSignedUrl(it.image_path, 3600);
            display = s?.signedUrl || null;
            isImage = !!display;
          } else if (it.thumb_url) {
            display = it.thumb_url;
            isImage = true;
          } else if (it.source_url && it.kind !== "reference" && IMG_EXT.test(it.source_url)) {
            display = it.source_url;
            isImage = true;
          }
          return { ...it, _display: display, _isImage: isImage };
        })
      );
      setRows(withUrls);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const allTags = Array.from(new Set(rows.flatMap((r) => r.tags || []))).sort();
  const filtered = rows.filter(
    (r) =>
      (!kindFilter || r.kind === kindFilter) &&
      (!tagFilter || (r.tags || []).includes(tagFilter))
  );

  async function remove(it: Row) {
    if (typeof window !== "undefined" && !window.confirm("Remove this from the project?")) return;
    const supabase = createClient();
    await supabase.from("library_items").delete().eq("id", it.id);
    if (it.image_path) {
      try {
        await supabase.storage.from("library").remove([it.image_path]);
      } catch {
        /* best-effort storage cleanup */
      }
    }
    load();
  }

  async function saveEdit(it: Row, patch: Partial<LibraryItem>) {
    const supabase = createClient();
    await supabase.from("library_items").update(patch).eq("id", it.id);
    setEditing(null);
    load();
  }

  if (!loading && rows.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-900">
        Nothing catalogued yet. Analyze image(s) above, then use{" "}
        <span className="font-medium">Add to project</span> or{" "}
        <span className="font-medium">Save link</span> to start the library.
      </p>
    );
  }

  return (
    <div className="mt-6">
      {/* filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="">All kinds</option>
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {kindLabel(k)}
            </option>
          ))}
        </select>
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setTagFilter("")}
              className={[
                "rounded-full px-2 py-0.5 text-xs",
                !tagFilter ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-900"
              ].join(" ")}
            >
              all tags
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(t === tagFilter ? "" : t)}
                className={[
                  "rounded-full px-2 py-0.5 text-xs",
                  t === tagFilter ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-900"
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <span className="ml-auto text-xs text-neutral-900">
          {filtered.length} of {rows.length}
        </span>
      </div>

      {/* grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((it) => {
          const mine = me && it.owner === me;
          const meta = [it.building, it.architect, it.year].filter(Boolean).join(" · ");
          return (
            <figure
              key={it.id}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
            >
              {it._isImage && it._display ? (
                <a
                  href={it.source_url || it._display}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="aspect-[4/3] bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it._display}
                      alt={it.title || "Reference image from the project library"}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </a>
              ) : (
                <a
                  href={it.source_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex aspect-[4/3] flex-col items-center justify-center gap-1 bg-neutral-50 px-3 text-center"
                >
                  <span className="text-2xl">🔗</span>
                  <span className="line-clamp-2 break-all text-xs text-blue-700 underline">
                    {it.source_url}
                  </span>
                </a>
              )}

              <figcaption className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-tight">{it.title || "Untitled"}</p>
                  {it.kind && (
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-900">
                      {kindLabel(it.kind)}
                    </span>
                  )}
                </div>
                {meta && <p className="mt-0.5 text-xs text-neutral-900">{meta}</p>}
                {it.tags?.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {it.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-900"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
                {it.notes && <p className="mt-1 text-xs text-neutral-900">{it.notes}</p>}
                {it.attribution && (
                  <p className="mt-1 text-[10px] text-neutral-900">
                    {it.attribution}
                    {it.license ? ` · ${it.license}` : ""}
                  </p>
                )}

                {mine && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setEditing(editing === it.id ? null : it.id)}
                      className={ghostBtn}
                    >
                      {editing === it.id ? "Close" : "Edit"}
                    </button>
                    <button onClick={() => remove(it)} className={ghostBtn}>
                      Remove
                    </button>
                  </div>
                )}

                {editing === it.id && <ItemEditor item={it} onSave={saveEdit} />}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  onSave
}: {
  item: Row;
  onSave: (it: Row, patch: Partial<LibraryItem>) => void;
}) {
  const [title, setTitle] = useState(item.title || "");
  const [kind, setKind] = useState(item.kind || "");
  const [tags, setTags] = useState((item.tags || []).join(", "));
  const [notes, setNotes] = useState(item.notes || "");

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={field} />
      <select value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
        <option value="">— kind —</option>
        {KIND_OPTIONS.map((k) => (
          <option key={k} value={k}>
            {kindLabel(k)}
          </option>
        ))}
      </select>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma-separated)"
        className={field}
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Notes"
        className={`${field} resize-y`}
      />
      <button
        onClick={() =>
          onSave(item, {
            title: title.trim() || null,
            kind: kind || null,
            tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
            notes: notes.trim() || null
          })
        }
        className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800"
      >
        Save
      </button>
    </div>
  );
}
