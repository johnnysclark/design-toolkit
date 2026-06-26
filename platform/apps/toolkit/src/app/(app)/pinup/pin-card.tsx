"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Pin = {
  id: string;
  title: string | null;
  project: string | null;
  tags: string[] | null;
  notes: string | null;
  image_path: string;
  owner: string;
  url: string | null;
};

// One pin on the wall. Owners get a Remove button that deletes both the row and
// the stored image (RLS/storage policies already restrict this to your own pins).
export default function PinCard({ pin, currentUserId }: { pin: Pin; currentUserId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwner = pin.owner === currentUserId;

  async function remove() {
    if (!confirm("Remove this pin? This can't be undone.")) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    // Delete the row first; if that succeeds, clean up the stored object so we
    // don't orphan it. (If the storage remove fails the row is already gone, so
    // the wall is consistent — the blob just lingers until a later sweep.)
    const { error: rowErr } = await supabase.from("pinups").delete().eq("id", pin.id);
    if (rowErr) {
      setError(rowErr.message);
      setBusy(false);
      return;
    }
    await supabase.storage.from("pinups").remove([pin.image_path]);
    router.refresh();
  }

  return (
    <figure className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {isOwner && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          aria-label={`Remove pin${pin.title ? `: ${pin.title}` : ""}`}
          className="absolute right-2 top-2 z-10 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-200 hover:bg-[#ff3b21] hover:text-white disabled:opacity-50"
        >
          {busy ? "Removing…" : "Remove"}
        </button>
      )}
      <div className="aspect-[4/3] bg-neutral-100">
        {pin.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pin.url}
            alt={pin.title || "Pinned reference image"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-900">
            image unavailable
          </div>
        )}
      </div>
      <figcaption className="p-3">
        <p className="font-medium text-neutral-900">{pin.title}</p>
        {pin.project && <p className="text-sm text-neutral-900">{pin.project}</p>}
        {pin.tags?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {pin.tags.map((t: string) => (
              <span
                key={t}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-900"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
        {pin.notes && <p className="mt-1 text-sm text-neutral-900">{pin.notes}</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </figcaption>
    </figure>
  );
}
