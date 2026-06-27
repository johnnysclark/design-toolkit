"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps a scroll container pinned to the bottom as content streams in — BUT
 * hands control to the reader: the moment they scroll up, auto-scroll pauses so
 * they can read while the answer keeps writing. A "Jump to latest" affordance
 * (driven by `pinned`) re-pins.
 *
 * It watches the container for content/size changes via Mutation/Resize
 * observers, so there are no React deps to thread — it sticks correctly for
 * streamed tokens, newly-appended messages, and images alike.
 *
 * Usage:
 *   const { ref, onScroll, pinned, scrollToBottom } = useStickToBottom();
 *   <div ref={ref} onScroll={onScroll} className="overflow-y-auto"> … </div>
 *   {!pinned && <button onClick={scrollToBottom}>Jump to latest</button>}
 */
export function useStickToBottom<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const pinnedRef = useRef(true);
  const [pinned, setPinned] = useState(true);

  // Recompute "am I at the bottom?" whenever the user scrolls.
  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (atBottom !== pinnedRef.current) {
      pinnedRef.current = atBottom;
      setPinned(atBottom);
    }
  }, []);

  // Auto-scroll on content growth, but only while pinned.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onGrow = () => {
      if (pinnedRef.current) el.scrollTop = el.scrollHeight;
    };
    const ro = new ResizeObserver(onGrow);
    ro.observe(el);
    const mo = new MutationObserver(onGrow);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = ref.current;
    pinnedRef.current = true;
    setPinned(true);
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  return { ref, onScroll, pinned, scrollToBottom };
}
