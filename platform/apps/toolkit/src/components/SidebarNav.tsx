"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ToolItem } from "@/lib/toolkit-nav";

export default function SidebarNav({
  items,
  signedIn
}: {
  items: ToolItem[];
  signedIn: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {items.map((it) => {
        const active =
          it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        const gated = it.requiresAuth && !signedIn;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={[
              "flex items-center justify-between rounded-md px-3 py-2 text-sm",
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100"
            ].join(" ")}
          >
            <span>{it.label}</span>
            {it.status === "soon" ? (
              <span
                className={[
                  "ml-2 rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                  active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                ].join(" ")}
              >
                soon
              </span>
            ) : gated ? (
              <span
                className={[
                  "ml-2 rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                  active ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-600"
                ].join(" ")}
              >
                sign in
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
