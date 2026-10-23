import type { ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";

/**
 * Draws a graphic off-screen at its exact size and returns it as a PNG: the same html-to-image renderer the single
 * "Share image" button uses, for callers (like the Gameweek pack) that make several images in a row.
 */
export async function renderToPng(node: ReactElement, width: number, height: number): Promise<Blob> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-99999px;top:0;pointer-events:none";
  const target = document.createElement("div");
  host.appendChild(target);
  document.body.appendChild(host);
  const root = createRoot(target);
  try {
    flushSync(() => root.render(node));
    // let shirt images load, then wait for layout, as the single-image path does
    await Promise.all(
      Array.from(host.querySelectorAll("img")).map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = img.onerror = () => resolve();
                setTimeout(resolve, 4000);
              }),
      ),
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const dataUrl = await toPng(target, { width, height, pixelRatio: 1, cacheBust: true });
    return await (await fetch(dataUrl)).blob();
  } finally {
    root.unmount();
    host.remove();
  }
}
