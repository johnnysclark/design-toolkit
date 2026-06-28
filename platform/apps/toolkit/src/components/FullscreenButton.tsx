"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A small, reusable "focus mode" toggle for an interactive working surface (a map,
// a 3D/CAD viewport, an embedded iframe, an editor preview). It immerses ONE element
// — passed by ref — so the tool escapes both the page width cap AND its own fixed
// viewport height (h-[480px], h-80, 62vh, …), which is the real constraint for
// map/3D/CAD work.
//
// Strategy: prefer the native Fullscreen API on the target element; when it's
// unavailable (notably iOS Safari, which doesn't implement Element.requestFullscreen)
// or rejects, fall back to a CSS "pseudo-fullscreen" — pinning the element to the
// viewport with position:fixed; inset:0 and an Escape handler. Either way the element
// is forced to fill its box (width/height 100%), so utility-height surfaces stop
// letterboxing. Tools that observe their container (MapLibre trackResize, three.js
// ResizeObserver / r3f <Bounds observe>) re-fit automatically; others can hook the
// optional onToggle callback.
//
// The button must live INSIDE the target element (which should be `relative`) so the
// control travels into fullscreen and stays clickable.
export default function FullscreenButton({
  targetRef,
  label = "focus",
  onToggle,
  className = "absolute right-3 top-3 z-10"
}: {
  /** The element to immerse. Make it `relative` so this button sits over it. */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Accessible noun, e.g. "map", "model", "3D preview". Drives the aria-label. */
  label?: string;
  /** Called with the new state after entering/exiting, for e.g. map.resize(). */
  onToggle?: (active: boolean) => void;
  /** Positioning classes; fully replaces the default top-right placement. */
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const [pseudo, setPseudo] = useState(false); // true while using the CSS fallback
  const savedCss = useRef(""); // original inline style.cssText, restored on exit

  const fill = useCallback((el: HTMLElement) => {
    savedCss.current = el.style.cssText;
    el.style.width = "100%";
    el.style.height = "100%";
    // Native fullscreen paints a black backdrop; give the element a white base so
    // any gaps (e.g. flex gutters) match the app instead of flashing black. The
    // element's own children (map/canvas/iframe) paint over this.
    if (!el.style.background) el.style.background = "white";
    el.style.overflow = "auto";
  }, []);

  // Keep state in sync with NATIVE fullscreen (covers Esc / F11 / browser-driven exits).
  useEffect(() => {
    const onChange = () => {
      const el = targetRef.current;
      const isFs = !!el && document.fullscreenElement === el;
      if (el) {
        if (isFs) fill(el);
        else if (!pseudo) el.style.cssText = savedCss.current;
      }
      if (!pseudo) {
        setActive(isFs);
        onToggle?.(isFs);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [targetRef, pseudo, fill, onToggle]);

  const exitPseudo = useCallback(() => {
    const el = targetRef.current;
    if (el) el.style.cssText = savedCss.current;
    setPseudo(false);
    setActive(false);
    onToggle?.(false);
  }, [targetRef, onToggle]);

  // Escape exits the CSS fallback (native fullscreen handles Esc itself).
  useEffect(() => {
    if (!pseudo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitPseudo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pseudo, exitPseudo]);

  const toggle = useCallback(async () => {
    const el = targetRef.current;
    if (!el) return;

    if (active) {
      if (pseudo) exitPseudo();
      else if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          /* ignore */
        }
      }
      return;
    }

    // Enter — try the real Fullscreen API first.
    if (document.fullscreenEnabled && typeof el.requestFullscreen === "function") {
      try {
        await el.requestFullscreen();
        return; // fullscreenchange handler sets state + fill
      } catch {
        /* fall through to the CSS fallback */
      }
    }

    // Fallback: pin the element to the viewport above the app shell.
    savedCss.current = el.style.cssText;
    Object.assign(el.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "60",
      background: "white",
      borderRadius: "0"
    });
    setPseudo(true);
    setActive(true);
    onToggle?.(true);
  }, [active, pseudo, targetRef, exitPseudo, onToggle]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? `Exit ${label} focus mode` : `Enter ${label} focus mode`}
      title={active ? "Exit focus mode" : "Focus mode"}
      className={`${className} inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 bg-white/90 text-neutral-900 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900`}
    >
      {active ? (
        // exit (shrink) icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 9 4 4M9 9V5M9 9H5" />
          <path d="m15 15 5 5M15 15v4M15 15h4" />
          <path d="M15 9l5-5M15 9V5M15 9h4" />
          <path d="M9 15l-5 5M9 15v4M9 15H5" />
        </svg>
      ) : (
        // enter (expand) icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9V4h5" />
          <path d="M20 9V4h-5" />
          <path d="M4 15v5h5" />
          <path d="M20 15v5h-5" />
        </svg>
      )}
    </button>
  );
}
