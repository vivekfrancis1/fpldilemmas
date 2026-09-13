import { useCallback, useEffect, useState } from "react";

interface UseFitColumnsOptions {
  /** Number of equal-width flexible columns to fit (e.g. gameweek columns + Total + Avg). */
  count: number;
  /** Narrowest a column is allowed to be. */
  minWidth: number;
  /** Width already reserved by sticky-left column(s), e.g. the Team/Player name column. */
  fixedLeftWidth?: number;
  /** Only auto-fit below this viewport width — desktop keeps the caller's own fixed widths. */
  breakpoint?: number;
}

/**
 * Sizes a row of scrollable table columns so a whole number of them always fits the visible
 * width at rest — never a sliver of the next column. Below `breakpoint` it returns a computed
 * `columnWidth`; at or above it, `columnWidth` is null so callers fall back to their own
 * (typically fixed-width Tailwind) classes, since desktop viewports rarely need this.
 * `isScrollable` reports whether there are more columns than fit at once, for a "swipe for more"
 * affordance.
 *
 * `containerRef` is a callback ref rather than a plain `useRef` — these tables are usually
 * behind a loading state, so the scrollable div doesn't exist on first mount. A callback ref
 * lets us notice exactly when it actually attaches (and recompute then) instead of only ever
 * measuring on a mount that ran before the element existed.
 */
export function useFitColumns({ count, minWidth, fixedLeftWidth = 0, breakpoint = 768 }: UseFitColumnsOptions) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);
  const [columnWidth, setColumnWidth] = useState<number | null>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    if (!container || count <= 0) {
      setColumnWidth(null);
      setIsScrollable(false);
      return;
    }

    const recompute = () => {
      if (window.innerWidth >= breakpoint) {
        setColumnWidth(null);
        setIsScrollable(false);
        return;
      }
      const available = container.clientWidth - fixedLeftWidth;
      if (available <= 0) {
        setColumnWidth(null);
        setIsScrollable(false);
        return;
      }
      const fitCount = Math.max(1, Math.floor(available / minWidth));
      const width = count <= fitCount ? available / count : available / fitCount;
      setColumnWidth(width);
      setIsScrollable(count > fitCount);
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    window.addEventListener("resize", recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [container, count, minWidth, fixedLeftWidth, breakpoint]);

  return { containerRef, columnWidth, isScrollable };
}
