// Trims the web-font CSS that html-to-image embeds in an exported PNG. The site loads Inter in every script subset
// (Cyrillic, Greek, Vietnamese, ...) and style, so embedding "all of Inter" is ~1.9 MB of base64 that the browser must
// decode again for each image. The graphics only ever draw Latin text, so two faces are enough.

const RANGE_TOKEN = /U\+([0-9A-Fa-f?]+)(?:-([0-9A-Fa-f]+))?/g;

/** True when a CSS `unicode-range` value covers the code point. Handles ranges, single points and `4??` wildcards. */
export function coversCodePoint(range: string, codePoint: number): boolean {
  for (const m of range.matchAll(RANGE_TOKEN)) {
    const start = m[1];
    if (start.includes("?")) {
      if (codePoint >= parseInt(start.replace(/\?/g, "0"), 16) && codePoint <= parseInt(start.replace(/\?/g, "F"), 16)) return true;
    } else {
      const lo = parseInt(start, 16);
      const hi = m[2] ? parseInt(m[2], 16) : lo;
      if (codePoint >= lo && codePoint <= hi) return true;
    }
  }
  return false;
}

const LATIN_A = 0x41; // "A": the basic Latin face
const LATIN_EXT_L = 0x141; // "Ł": the Latin Extended face (accents in player names)

/**
 * Keeps only `family`'s normal-style faces that cover basic Latin or Latin Extended. Returns the original CSS if no face
 * matches (an unexpected format), so a render can never end up without its fonts.
 */
export function trimFontEmbedCSS(css: string, family: string): string {
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  const keep = blocks.filter((block) => {
    const name = /font-family:\s*([^;]+);/.exec(block)?.[1]?.trim().replace(/^["']|["']$/g, "");
    if (name?.toLowerCase() !== family.toLowerCase()) return false;
    const style = /font-style:\s*([a-z]+)/.exec(block)?.[1] ?? "normal";
    if (style !== "normal") return false;
    const range = /unicode-range:\s*([^;}]+)/.exec(block)?.[1];
    if (!range) return false;
    return coversCodePoint(range, LATIN_A) || coversCodePoint(range, LATIN_EXT_L);
  });
  return keep.length > 0 ? keep.join("\n") : css;
}
