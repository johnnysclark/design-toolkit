import { createClient } from "@/lib/supabase/server";
import AuthGate from "@/components/AuthGate";
import UploadForm from "./upload-form";
import PinCard from "./pin-card";

export const dynamic = "force-dynamic";

export default async function PinupPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // The wall reads/writes per-user rows under RLS — it needs a signed-in user.
  if (!user) return <AuthGate tool="Archivist" next="/pinup" />;

  const { data: pinups, error } = await supabase
    .from("pinups")
    .select("id, title, project, tags, notes, image_path, created_at, owner")
    .order("created_at", { ascending: false })
    .limit(60);

  // Private bucket → signed URLs for display. 8h TTL so the wall doesn't break
  // on images during a long studio session / crit (low-sensitivity studio work).
  const items = await Promise.all(
    (pinups ?? []).map(async (p) => {
      const { data } = await supabase.storage
        .from("pinups")
        .createSignedUrl(p.image_path, 60 * 60 * 8);
      return { ...p, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div>
      <h1 className="display-font text-3xl uppercase tracking-tight">
        Archivist{" "}
        <span className="font-sans text-lg font-normal normal-case text-neutral-900">— Studio Digital Pinup Wall</span>
      </h1>
      <p className="mt-2 max-w-2xl text-neutral-900">
        Studio memory + metadata. Everyone signed in sees the wall; you can add
        and remove your own pins.
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
          <PinCard key={p.id} pin={p} currentUserId={user.id} />
        ))}
      </div>

      {items.length === 0 && !error && (
        <p className="mt-8 text-sm text-neutral-900">
          No pins yet — add the first one above.
        </p>
      )}
    </div>
  );
}
