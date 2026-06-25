import Link from "next/link";
import { TOOLKIT_NAV } from "@/lib/toolkit-nav";

export default function Dashboard() {
  const tools = TOOLKIT_NAV.filter((t) => t.href !== "/");

  return (
    <div>
      <h1 className="text-4xl sm:text-5xl tracking-tight">Overview</h1>
      <p className="mt-2 max-w-2xl text-neutral-600">
        AI tools for the studio — built to be interrogated, not obeyed. Every
        model claim is tagged and left for you to verify, and every run is kept
        as part of the trace.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{t.label}</h2>
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
                  t.status === "live"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                ].join(" ")}
              >
                {t.status === "live" ? "live" : "soon"}
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-600">{t.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
