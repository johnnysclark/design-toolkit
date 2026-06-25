import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TOOLKIT_NAV } from "@/lib/toolkit-nav";
import SidebarNav from "@/components/SidebarNav";

// The Toolkit shell is PUBLIC — anyone can browse. Individual tools that spend
// the API key or need a user session gate themselves (see AuthGate + the nav's
// `requiresAuth`). Do not reinstate a blanket redirect here.
export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4">
          <p className="text-sm font-semibold tracking-tight">Design Toolkit</p>
          <p className="text-xs text-neutral-500">All Means Works</p>
        </div>

        <SidebarNav items={TOOLKIT_NAV} signedIn={!!user} />

        <div className="border-t border-neutral-200 p-4">
          {user ? (
            <>
              <p
                className="truncate text-xs text-neutral-500"
                title={user.email ?? ""}
              >
                {user.email}
              </p>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="mt-2 text-xs font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-xs font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
            >
              Sign in
            </Link>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden px-8 py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
