import { useEffect, useLayoutEffect, useRef } from "react";

// Makes an element's content area fill the rest of the window: sets the CSS variable `--fit` on the
// returned ref's element to (window height - element top - bottomGap) px. Use it as a minimum height
// (e.g. style={{ minHeight: 'var(--fit)' }}) so content shorter than the window stretches to fill it, while
// content that doesn't fit simply grows and the page scrolls (no inner scroll bars). Recomputed after every
// render, since the element moves when anything above it changes, and on window resize.
export function useFitToViewport<T extends HTMLElement = HTMLDivElement>(bottomGap = 12) {
  const ref = useRef<T>(null);
  const update = () => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    el.style.setProperty("--fit", `${Math.max(0, Math.round(window.innerHeight - top - bottomGap))}px`);
  };
  useLayoutEffect(update);
  useEffect(() => {
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return ref;
}
