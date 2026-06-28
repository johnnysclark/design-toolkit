"use client";

import { useRef } from "react";
import FullscreenButton from "@/components/FullscreenButton";

// A bordered iframe embed with a built-in "focus mode" button. The wrapper (not the
// iframe) carries the height, and the iframe fills it (h-full) — so when the focus
// button forces the wrapper to fill the screen, the iframe fills the screen too
// (no letterbox). Used by EmbeddedTool and the Eco-Architect page.
export default function FullscreenFrame({
  src,
  title,
  heightClass = "h-[82vh]",
  label = "tool",
  allow = "fullscreen; clipboard-read; clipboard-write"
}: {
  src: string;
  title: string;
  heightClass?: string;
  label?: string;
  allow?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`relative mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white ${heightClass}`}
    >
      <FullscreenButton targetRef={ref} label={label} />
      <iframe src={src} title={title} className="block h-full w-full border-0" allow={allow} />
    </div>
  );
}
