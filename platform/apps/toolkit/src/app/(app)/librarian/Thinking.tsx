"use client";

// A small "the model is thinking" indicator — a few black shapes cycling.
// Shown whenever an LLM call is in flight (analyze, search, conversation).
// Bold + graphic to match the toolkit (black, geometric). React 19 hoists and
// dedupes the <style> by `href`, so rendering many of these adds the CSS once.
export default function Thinking({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-neutral-900" role="status">
      <span className="amw-thinking" aria-hidden="true">
        <span className="sq" />
        <span className="ci" />
        <span className="tr" />
      </span>
      {label ? <span>{label}</span> : null}
      <span className="sr-only">Working…</span>
      <style href="amw-thinking" precedence="default">{`
        .amw-thinking { display:inline-flex; align-items:center; gap:6px; }
        .amw-thinking > span { display:inline-block; animation: amwThk .9s infinite ease-in-out; }
        .amw-thinking .sq { width:10px; height:10px; background:#111; }
        .amw-thinking .ci { width:10px; height:10px; background:#111; border-radius:50%; animation-delay:.15s; }
        .amw-thinking .tr {
          width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent;
          border-bottom:11px solid #111; animation-delay:.3s;
        }
        @keyframes amwThk {
          0%, 100% { transform: scale(.4) rotate(0deg); opacity:.25; }
          45%      { transform: scale(1) rotate(45deg); opacity:1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .amw-thinking > span { animation-duration: 0s; opacity:.7; }
        }
      `}</style>
    </span>
  );
}
