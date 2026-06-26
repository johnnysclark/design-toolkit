import Link from "next/link";

// Wrapper for a self-contained, client-only tool served from public/tools/<tool>/
// and embedded in the app shell via an iframe — the same pattern as Eco-Architect
// (Gable Studio). No API key, no sign-in: everything runs in the browser.
export default function EmbeddedTool({
  title,
  subtitle,
  blurb,
  src,
  backHref,
  backLabel,
  note
}: {
  title: string;
  subtitle: string;
  blurb: string;
  src: string;
  backHref: string;
  backLabel: string;
  note?: string;
}) {
  return (
    <div>
      <Link
        href={backHref}
        className="text-sm font-semibold text-neutral-900 hover:underline"
      >
        ← {backLabel}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {title}{" "}
              <span className="font-sans text-lg font-normal normal-case text-neutral-900">
                — {subtitle}
              </span>
            </h1>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-800">
              live
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-neutral-900">{blurb}</p>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-900 transition hover:border-neutral-400 hover:bg-neutral-50"
        >
          Open full screen ↗
        </a>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <iframe
          src={src}
          title={title}
          className="block h-[82vh] w-full border-0"
          allow="fullscreen; clipboard-read; clipboard-write"
        />
      </div>

      {note && <p className="mt-3 max-w-2xl text-sm text-neutral-900">{note}</p>}
    </div>
  );
}
