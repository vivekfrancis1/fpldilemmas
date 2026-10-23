// Link previews for shared graphics: turns the rendered PNG into a 1200x630 "link card" (what X, Facebook and WhatsApp
// show), uploads it, and returns a short link (/g/<id>) whose preview is that card. See server/shared-graphics.ts.

export const LINK_CARD_WIDTH = 1200;
export const LINK_CARD_HEIGHT = 630;

/** Where an image of `w`x`h` goes inside a `boxW`x`boxH` card so that it is centred and fully visible, with `pad` around it. */
export function fitContain(w: number, h: number, boxW: number, boxH: number, pad: number): { x: number; y: number; width: number; height: number } {
  const maxW = boxW - pad * 2;
  const maxH = boxH - pad * 2;
  const scale = Math.min(maxW / w, maxH / h);
  const width = Math.floor(w * scale);
  const height = Math.floor(h * scale);
  return { x: Math.floor((boxW - width) / 2), y: Math.floor((boxH - height) / 2), width, height };
}

/** The page's path and query: opening it re-draws the same graphic (all settings live in the link). */
export function sharePath(location: { pathname: string; search: string; hash?: string }): string {
  return `${location.pathname}${location.search}`;
}

/** The graphic on a branded 1200x630 card (the graphic is never cropped, so a tall one has margins either side). */
export async function composeLinkCard(png: Blob): Promise<Blob> {
  // createImageBitmap decodes without needing the page to be visible (an <img> can stall in a background tab)
  const img = await createImageBitmap(png);
  const canvas = document.createElement("canvas");
  canvas.width = LINK_CARD_WIDTH;
  canvas.height = LINK_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  const bg = ctx.createLinearGradient(0, 0, LINK_CARD_WIDTH, LINK_CARD_HEIGHT);
  bg.addColorStop(0, "#26235f");
  bg.addColorStop(1, "#4338ca");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, LINK_CARD_WIDTH, LINK_CARD_HEIGHT);
  const r = fitContain(img.width, img.height, LINK_CARD_WIDTH, LINK_CARD_HEIGHT, 24);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 28;
  ctx.drawImage(img, r.x, r.y, r.width, r.height);
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}

/** Uploads the link card; resolves to the short link, or null when it could not be saved (callers then use the page link). */
export async function uploadLinkCard(card: Blob, meta: { title: string; target: string }): Promise<string | null> {
  try {
    const res = await fetch(`/api/shared-graphics?${new URLSearchParams({ title: meta.title, target: meta.target })}`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: card,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { url?: string };
    return typeof body.url === "string" ? body.url : null;
  } catch {
    return null;
  }
}
