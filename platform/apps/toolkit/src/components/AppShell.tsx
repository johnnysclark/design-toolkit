"use client";

import { useState } from "react";
import Link from "next/link";
import SidebarNav from "@/components/SidebarNav";
import { TOOLKIT_NAV } from "@/lib/toolkit-nav";

// Top bar (single bold title + menu toggle + auth) over a collapsible menu bar.
export default function AppShell({
  email,
  children
}: {
  email: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const signedIn = !!email;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b-2 border-neutral-900 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="display-font px-1 text-2xl leading-none text-neutral-900 transition-colors hover:text-[#ff3b21]"
        >
          ☰
        </button>
        <span className="display-font text-xl uppercase tracking-tight sm:text-2xl">
          Design Toolkit
        </span>
        <span className="flex-1" />
        {signedIn ? (
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="display-font text-xs uppercase tracking-wide text-neutral-900 hover:text-[#ff3b21]"
            >
              Sign out
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="display-font text-xs uppercase tracking-wide text-neutral-900 hover:text-[#ff3b21]"
          >
            Sign in
          </Link>
        )}
      </header>

      <div className="flex flex-1">
        {open && (
          <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white">
            <SidebarNav items={TOOLKIT_NAV} signedIn={signedIn} />
            <div className="mt-auto border-t border-neutral-200 px-4 py-4 text-xs leading-relaxed text-neutral-900">
              <p className="text-neutral-900">Built by John Clark &amp; Claude, 2026</p>
              <p className="mt-1.5">
                Feedback?{" "}
                <a
                  href="mailto:jsclark2@illinois.edu"
                  className="underline underline-offset-2 hover:text-neutral-900"
                >
                  jsclark2@illinois.edu
                </a>
              </p>
            </div>
          </aside>
        )}
        <main className="flex-1 overflow-x-hidden px-6 py-8 sm:px-10 sm:py-12">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
