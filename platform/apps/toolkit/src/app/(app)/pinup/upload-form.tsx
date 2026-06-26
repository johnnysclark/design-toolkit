"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — studio images, not RAW/PSD dumps

export default function UploadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const file = fd.get("file") as File | null;
    const title = String(fd.get("title") || "").trim();

    if (!file || file.size === 0) {
      setErr("Choose an image to pin.");
      return;
    }
    // `accept="image/*"` is only a picker hint — validate for real before upload.
    if (!file.type.startsWith("image/")) {
      setErr("That file isn't an image — choose a PNG, JPG, WebP, or GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr("That image is over 10 MB — please use a smaller one.");
      return;
    }
    if (!title) {
      setErr("Give it a title.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        setErr("You appear to be signed out — reload the page.");
        return;
      }

      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}-${safe}`;

      const up = await supabase.storage
        .from("pinups")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (up.error) throw up.error;

      const tags = String(fd.get("tags") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const ins = await supabase.from("pinups").insert({
        owner: user.id,
        title,
        project: String(fd.get("project") || "").trim() || null,
        tags,
        notes: String(fd.get("notes") || "").trim() || null,
        image_path: path
      });
      if (ins.error) {
        // The blob uploaded but the row didn't — clean it up so we don't orphan
        // an un-deletable object in the bucket.
        await supabase.storage.from("pinups").remove([path]);
        throw ins.error;
      }

      // Log the run to the trace (best-effort; never block the upload).
      supabase
        .from("tool_runs")
        .insert({ owner: user.id, tool: "archivist", input: { title, tags }, output: { image_path: path } })
        .then(() => {}, () => {});

      formEl.reset();
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-2"
    >
      <input name="title" placeholder="Title *" className={field} />
      <input name="project" placeholder="Project" className={field} />
      <input
        name="tags"
        placeholder="Tags (comma-separated)"
        className={`${field} sm:col-span-2`}
      />
      <textarea
        name="notes"
        rows={2}
        placeholder="Notes — crit feedback, context, studio memory…"
        className={`${field} sm:col-span-2 resize-y`}
      />
      <input
        name="file"
        type="file"
        accept="image/*"
        className="text-sm sm:col-span-2"
      />
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Add to wall"}
        </button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </form>
  );
}
