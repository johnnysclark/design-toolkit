import { createClient } from "@/lib/supabase/server";
import AuthGate from "@/components/AuthGate";
import UploadForm from "./upload-form";

export const dynamic = "force-dynamic";

export default async function PinupPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // The wall reads/writes per-user rows under RLS — it needs a signed-in user.
  if (!user) return <AuthGate tool="Archivist" />;

  const { data: pinups, error } = await supabase
    .from("pinups")
    .select("id, title, project, tags, notes, image_path, created_at, owner")
    .order("created_at", { ascending: false })
    .limit(60);

  // Private bucket → make short-lived signed URLs for display.
  const items = await Promise.all(
    (pinups ?? []).map(async (p) => {
      const { data } = await supabase.storage
        .from("pinups")
        .createSignedUrl(p.image_path, 3600);
      return { ...p, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        Archivist{" "}
        <span className="font-sans text-lg font-normal normal-case text-neutral-900">— Studio Digital Pinup Wall</span>
      </h1>
      <p className="mt-2 max-w-2xl text-neutral-600">
        Studio memory + metadata. Everyone signed in sees the wall; you can add,
        edit, and remove your own pins.
      </p>

      <UploadForm />

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Couldn&rsquo;t load the wall: {error.message}. Have you run the
          Supabase migration (<code>supabase/migrations/0001_init.sql</code>)?
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <figure
            key={p.id}
            className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
          >
            <div className="aspect-[4/3] bg-neutral-100">
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.url}
                  alt={p.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                  image unavailable
                </div>
              )}
            </div>
            <figcaption className="p-3">
              <p className="font-medium">{p.title}</p>
              {p.project && (
                <p className="text-sm text-neutral-500">{p.project}</p>
              )}
              {p.tags?.length ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.tags.map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              {p.notes && (
                <p className="mt-1 text-sm text-neutral-600">{p.notes}</p>
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      {items.length === 0 && !error && (
        <p className="mt-8 text-sm text-neutral-500">
          No pins yet — add the first one above.
        </p>
      )}
    </div>
  );
}
