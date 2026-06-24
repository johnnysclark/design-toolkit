import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TOOLKIT_NAV } from "@/lib/toolkit-nav";
import SidebarNav from "@/components/SidebarNav";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4">
          <p className="text-sm font-semibold tracking-tight">Design Toolkit</p>
          <p className="text-xs text-neutral-500">Summer AI Workshop</p>
        </div>

        <SidebarNav items={TOOLKIT_NAV} />

        <div className="border-t border-neutral-200 p-4">
          <p className="truncate text-xs text-neutral-500" title={user.email ?? ""}>
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
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden px-8 py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
