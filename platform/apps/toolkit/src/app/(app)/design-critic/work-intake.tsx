"use client";

// Shared intake for the Critic: project title, thesis, brief, and an image
// dropzone (max 6). Uploads each image to the private 'critic' bucket via the
// browser client (the route reads them back with signed URLs), exactly like the
// Pinup / Librarian upload flow. Controlled by the parent via `value`/`onChange`.

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "./image";
import { field, ghostBtn, type WorkImage, type WorkInput } from "./types";

const MAX_IMAGES = 6;

export default function WorkIntake({
  value,
  onChange,
  disabled
}: {
  value: WorkInput;
  onChange: (next: WorkInput) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof WorkInput>(key: K, v: WorkInput[K]) {
    onChange({ ...value, [key]: v });
  }

  async function addFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setErr(null);
    const room = MAX_IMAGES - value.images.length;
    if (room <= 0) {
      setErr(`You can attach up to ${MAX_IMAGES} images.`);
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        setErr("You appear to be signed out — reload the page.");
        return;
      }
      const picked = Array.from(files).slice(0, room);
      const added: WorkImage[] = [];
      for (const file of picked) {
        if (!/^image\//.test(file.type)) continue;
        const { blob, ext } = await prepareImage(file);
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from("critic").upload(path, blob, { cacheControl: "3600", upsert: false });
        if (up.error) throw up.error;
        const baseAlt = value.title.trim() || file.name.replace(/\.[a-z0-9]+$/i, "");
        added.push({
          path,
          previewUrl: URL.createObjectURL(blob),
          alt: baseAlt ? `${baseAlt} — uploaded design work` : `Uploaded design work ${value.images.length + added.length + 1}`
        });
      }
      onChange({ ...value, images: [...value.images, ...added] });
    } catch (e: any) {
      setErr(e?.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeImage(path: string) {
    onChange({ ...value, images: value.images.filter((im) => im.path !== path) });
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <input
        className={field}
        placeholder="Project title"
        value={value.title}
        disabled={disabled}
        onChange={(e) => set("title", e.target.value)}
      />
      <input
        className={field}
        placeholder="Your thesis / the one claim this project makes"
        value={value.thesis}
        disabled={disabled}
        onChange={(e) => set("thesis", e.target.value)}
      />
      <textarea
        className={`${field} resize-y`}
        rows={3}
        placeholder="Brief / context — the program, the move you're proudest of, what you're nervous about…"
        value={value.brief}
        disabled={disabled}
        onChange={(e) => set("brief", e.target.value)}
      />

      <div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={ghostBtn}
            disabled={disabled || uploading || value.images.length >= MAX_IMAGES}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Add images of your work"}
          </button>
          <span className="text-xs text-neutral-900">
            {value.images.length}/{MAX_IMAGES} attached
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        {value.images.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {value.images.map((im) => (
              <div key={im.path} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.previewUrl} alt={im.alt} className="h-24 w-full rounded-lg border border-neutral-200 object-cover" />
                <button
                  type="button"
                  aria-label={`Remove ${im.alt}`}
                  onClick={() => removeImage(im.path)}
                  className="absolute right-1 top-1 rounded-full bg-neutral-900 px-1.5 text-xs font-medium text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
