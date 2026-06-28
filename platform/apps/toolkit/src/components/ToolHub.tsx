import Link from "next/link";

// A hub page = a header + a grid of title cards, one per sub-tool. Used by the
// 2D Tooling and 3D Tooling sections, which each bundle several small tools.
//
// A card is one of:
//   - "live"     a working tool ported/built into the toolkit (links to it)
//   - "rebuilt"  a tool reconstructed here because the original source wasn't
//                found yet (links to it, flagged so John can point us at the original)
//   - "proposed" an idea suggested by the assistant, not built — clearly marked
//                so it never reads as a finished tool.

export type HubCardStatus = "live" | "rebuilt" | "proposed";

export interface HubCard {
  title: string;
  blurb: string;
  href?: string;
  status: HubCardStatus;
  /** small kicker above the title, e.g. "Ported from Drawing-Image-Cleaner" */
  source?: string;
}

const BADGE: Record<HubCardStatus, { label: string; cls: string }> = {
  live: { label: "Ready", cls: "bg-green-100 text-green-900" },
  rebuilt: { label: "Rebuilt", cls: "bg-blue-100 text-blue-900" },
  proposed: { label: "Proposed", cls: "bg-amber-100 text-amber-900" }
};

function Card({ card }: { card: HubCard }) {
  const badge = BADGE[card.status];
  const isProposed = card.status === "proposed";

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="display-font text-lg uppercase leading-tight tracking-tight text-neutral-900">
          {card.title}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
      {card.source && (
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-900">
          {card.source}
        </p>
      )}
      <p className="mt-2 text-sm leading-relaxed text-neutral-900">{card.blurb}</p>
      <div className="mt-4 text-sm font-bold text-neutral-900">
        {isProposed ? (
          <span className="text-neutral-900">Suggested by Claude — not built yet</span>
        ) : (
          <span className="text-neutral-900">
            Open tool <span aria-hidden="true">→</span>
          </span>
        )}
      </div>
    </>
  );

  const base = "block rounded-xl border bg-white p-5 transition";

  if (isProposed || !card.href) {
    return (
      <div className={`${base} border-dashed border-neutral-300`}>{inner}</div>
    );
  }

  return (
    <Link
      href={card.href}
      className={`${base} border-neutral-200 hover:-translate-y-0.5 hover:border-neutral-900 hover:shadow-md`}
    >
      {inner}
    </Link>
  );
}

export default function ToolHub({
  title,
  subtitle,
  intro,
  cards
}: {
  title: string;
  subtitle: string;
  intro: string;
  cards: HubCard[];
}) {
  const built = cards.filter((c) => c.status !== "proposed");
  const proposed = cards.filter((c) => c.status === "proposed");

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        {title}{" "}
        <span className="font-sans text-lg font-normal normal-case text-neutral-900">
          — {subtitle}
        </span>
      </h1>
      <p className="mt-2 max-w-2xl text-neutral-900">{intro}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {built.map((c) => (
          <Card key={c.title} card={c} />
        ))}
      </div>

      {proposed.length > 0 && (
        <>
          <h2 className="mt-12 display-font text-sm uppercase tracking-widest text-neutral-900">
            Proposed additions
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-900">
            Ideas for this bench — suggestions from Claude, not yet built. Say the
            word and any of these can become a real card.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proposed.map((c) => (
              <Card key={c.title} card={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
