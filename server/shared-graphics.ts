// Link previews for shared graphics. The browser already renders every graphic to a PNG, so for a preview it also
// makes a 1200x630 "link card" version and uploads it here; we store it and serve a small page at /g/<id> with the
// tags X, Facebook and WhatsApp read (og:image, twitter:card). People who open that page are sent straight to the
// tool at the saved settings. This file holds the pure parts (validation, ids, the page); the database and routes
// are in shared-graphics-routes.ts.
import { createHash, randomBytes } from "node:crypto";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
/** A flat-colour 1200x630 card is tiny; a busy graphic is well under this. */
export const MAX_PNG_BYTES = 1_500_000;
const MAX_TARGET = 2000;
const MAX_TITLE = 80;
const DEFAULT_TITLE = "FPL Dilemmas graphic";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Width and height from a PNG's header, or null when the bytes are not a PNG. */
export function pngSize(png: Buffer): { width: number; height: number } | null {
  if (png.length < 24 || !png.subarray(0, 8).equals(PNG_SIGNATURE) || png.subarray(12, 16).toString("ascii") !== "IHDR") return null;
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

export type ShareUpload = { ok: true; png: Buffer; title: string; target: string } | { ok: false; error: string };

/**
 * Checks an upload: a real PNG of exactly the link-card size and a sane byte size, a title (cleaned), and a link target
 * that is a path on this site only (never another host, so the page cannot be used as an open redirect).
 */
export function validateShareUpload(input: { png: Buffer; title: string; target: string }): ShareUpload {
  const { png } = input;
  if (png.length === 0 || png.length > MAX_PNG_BYTES) return { ok: false, error: "The image is empty or too large" };
  const size = pngSize(png);
  if (!size) return { ok: false, error: "The image must be a PNG" };
  if (size.width !== OG_WIDTH || size.height !== OG_HEIGHT) return { ok: false, error: `The image must be ${OG_WIDTH}x${OG_HEIGHT}` };

  const target = input.target;
  const safePath = target.length > 0 && target.length <= MAX_TARGET && target.startsWith("/") && !target.startsWith("//") && !/[\\\u0000-\u001f\u007f]/.test(target);
  if (!safePath) return { ok: false, error: "The link must be a path on this site" };

  const cleaned = input.title.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_TITLE).trim();
  return { ok: true, png, title: cleaned || DEFAULT_TITLE, target };
}

const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** An 8-character URL-safe id (62^8 combinations), from random bytes without modulo bias. */
export function newShareId(): string {
  let id = "";
  while (id.length < 8) {
    for (const byte of randomBytes(16)) {
      if (byte < 248 && id.length < 8) id += ID_ALPHABET[byte % 62]; // 248 = 62 * 4: rejects the biased tail
    }
  }
  return id;
}

/** Same image for the same page = same hash, so sharing again reuses the stored copy instead of adding another. */
export function shareHash(png: Buffer, target: string): string {
  return createHash("sha256").update(png).update("\u0000").update(target).digest("hex");
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** The small HTML page crawlers read for the preview; people are redirected to `targetPath`. */
export function renderSharePage(input: { title: string; imageUrl: string; pageUrl: string; targetPath: string }): string {
  const title = escapeHtml(`${input.title} | FPL Dilemmas`);
  const heading = escapeHtml(input.title);
  const image = escapeHtml(input.imageUrl);
  const url = escapeHtml(input.pageUrl);
  const target = escapeHtml(input.targetPath);
  const description = "Made with FPL Dilemmas: free Fantasy Premier League analytics, projections and shareable graphics.";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FPL Dilemmas">
<meta property="og:title" content="${heading}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="${OG_WIDTH}">
<meta property="og:image:height" content="${OG_HEIGHT}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${heading}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image}">
<meta http-equiv="refresh" content="0;url=${target}">
</head>
<body style="font-family:system-ui,sans-serif;background:#1e1b4b;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
<p>Opening <a href="${target}" style="color:#fbbf24">${heading}</a> on FPL Dilemmas…</p>
<script>location.replace(${JSON.stringify(input.targetPath).replace(/</g, "\\u003c")});</script>
</body>
</html>
`;
}
