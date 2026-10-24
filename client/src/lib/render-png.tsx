import type { ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { getFontEmbedCSS, toPng } from "html-to-image";
import { trimFontEmbedCSS } from "@shared/font-css";

/** The faces draw everything in Inter at these weights, so this is what a render needs from the web fonts. */
const FONT_STACK = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_WEIGHTS = [400, 600, 700, 800, 900];

let fontCssPromise: Promise<string> | null = null;

/**
 * The CSS that embeds the fonts the graphics use, worked out once and trimmed to the Latin faces. html-to-image
 * otherwise reads every stylesheet and fetches and encodes the font files again for every single image, and the site's
 * stylesheet carries Inter in every script subset (~1.9 MB), which the browser then has to decode for each image. A
 * caller that makes several images (the Gameweek pack) prepares this once and passes it to each `renderToPng`.
 */
export function prepareFontEmbedCSS(): Promise<string> {
  if (!fontCssPromise) {
    fontCssPromise = (async () => {
      const probe = document.createElement("div");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = `position:fixed;left:-99999px;top:0;font-family:${FONT_STACK}`;
      probe.innerHTML = FONT_WEIGHTS.map((w) => `<span style="font-weight:${w};font-family:${FONT_STACK}">Aa 0123456789 ÅØßÖã João</span>`).join("");
      document.body.appendChild(probe);
      try {
        return trimFontEmbedCSS(await getFontEmbedCSS(probe), "Inter");
      } finally {
        probe.remove();
      }
    })().catch((error) => {
      fontCssPromise = null; // try again next time
      throw error;
    });
  }
  return fontCssPromise;
}

export interface RenderOptions {
  /** From `prepareFontEmbedCSS()`: skips re-embedding the fonts for this image. */
  fontEmbedCSS?: string;
  /** Default true. False lets shirt images be fetched once and reused across images. */
  cacheBust?: boolean;
}

/**
 * Draws a graphic off-screen at its exact size and returns it as a PNG: the same html-to-image renderer the single
 * "Share image" button uses, for callers (like the Gameweek pack) that make several images in a row.
 */
export async function renderToPng(node: ReactElement, width: number, height: number, options: RenderOptions = {}): Promise<Blob> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-99999px;top:0;pointer-events:none";
  const target = document.createElement("div");
  host.appendChild(target);
  document.body.appendChild(host);
  const root = createRoot(target);
  try {
    flushSync(() => root.render(node));
    // let shirt images load, then settle layout. Not requestAnimationFrame: browsers pause it in a hidden or background
    // tab, which stalled the whole pack for as long as the tab was out of view.
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
    void target.offsetHeight; // force layout
    await new Promise<void>((resolve) => setTimeout(resolve, 30));
    const dataUrl = await toPng(target, {
      width,
      height,
      pixelRatio: 1,
      cacheBust: options.cacheBust ?? true,
      ...(options.fontEmbedCSS !== undefined ? { fontEmbedCSS: options.fontEmbedCSS } : {}),
    });
    return await (await fetch(dataUrl)).blob();
  } finally {
    root.unmount();
    host.remove();
  }
}
