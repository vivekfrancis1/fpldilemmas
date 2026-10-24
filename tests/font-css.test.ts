import { describe, it, expect } from "vitest";
import { coversCodePoint, trimFontEmbedCSS } from "../shared/font-css";

const face = (family: string, style: string, range: string, tag: string) =>
  `@font-face {font-family: ${family}; font-style: ${style}; font-weight: 100 900; src: url("data:font/woff2;base64,${tag}") format("woff2"); unicode-range: ${range};}`;

// the unicode-range text as a browser serialises it (no leading zeros) and as Google Fonts writes it
const LATIN = "U+0-FF, U+131, U+152-153, U+2BB-2BC, U+2C6, U+2DA, U+2DC, U+304, U+308, U+329, U+2000-206F";
const LATIN_EXT = "U+100-2BA, U+2BD-2C5, U+2C7-2CC, U+2CE-2D7, U+2DD-2FF, U+304, U+308, U+329, U+1D00-1DBF";
const CYRILLIC = "U+301, U+400-45F, U+490-491, U+4B0-4B1, U+2116";
const GREEK = "U+370-377, U+37A-37F, U+384-38A, U+38C, U+38E-3A1, U+3A3-3FF";
const VIETNAMESE = "U+102-103, U+110-111, U+128-129, U+168-169, U+1A0-1A1, U+1AF-1B0, U+300-301, U+303-304, U+308-309, U+323, U+329, U+1EA0-1EF9, U+20AB";

describe("coversCodePoint", () => {
  it("reads single code points, ranges, and wildcards, with or without leading zeros", () => {
    expect(coversCodePoint("U+0-FF, U+131", 0x41)).toBe(true);
    expect(coversCodePoint("U+0000-00FF", 0x41)).toBe(true);
    expect(coversCodePoint("U+100-2BA", 0x141)).toBe(true);
    expect(coversCodePoint("U+100-2BA", 0x41)).toBe(false);
    expect(coversCodePoint("U+131", 0x131)).toBe(true);
    expect(coversCodePoint("U+4??", 0x410)).toBe(true);
    expect(coversCodePoint("U+4??", 0x500)).toBe(false);
    expect(coversCodePoint("", 0x41)).toBe(false);
  });
});

describe("trimFontEmbedCSS", () => {
  const css = [
    face("Inter", "normal", CYRILLIC, "cyr"),
    face("Inter", "normal", GREEK, "grk"),
    face("Inter", "normal", VIETNAMESE, "vie"),
    face("Inter", "normal", LATIN_EXT, "latext"),
    face("Inter", "normal", LATIN, "lat"),
    face("Inter", "italic", LATIN, "italic-lat"),
    face("Inter", "italic", LATIN_EXT, "italic-latext"),
    face('"Roboto"', "normal", LATIN, "roboto"),
  ].join("\n");

  it("keeps only the family's normal-style Latin and Latin-extended faces", () => {
    const out = trimFontEmbedCSS(css, "Inter");
    expect(out).toContain("base64,lat\"");
    expect(out).toContain("base64,latext\"");
    for (const dropped of ["cyr", "grk", "vie", "italic-lat", "italic-latext", "roboto"]) expect(out).not.toContain(`base64,${dropped}"`);
    expect((out.match(/@font-face/g) ?? []).length).toBe(2);
  });

  it("matches the family with or without quotes", () => {
    const quoted = [face('"Inter"', "normal", LATIN, "q1"), face("'Inter'", "normal", LATIN_EXT, "q2"), face("Inter", "normal", CYRILLIC, "q3")].join("\n");
    const out = trimFontEmbedCSS(quoted, "Inter");
    expect(out).toContain("q1");
    expect(out).toContain("q2");
    expect(out).not.toContain("q3");
  });

  it("is much smaller than the full CSS", () => {
    expect(trimFontEmbedCSS(css, "Inter").length).toBeLessThan(css.length * 0.5);
  });

  it("falls back to the original CSS when nothing matches, so a render never loses its fonts", () => {
    expect(trimFontEmbedCSS(face("Roboto", "normal", LATIN, "r"), "Inter")).toContain("Roboto");
    expect(trimFontEmbedCSS("", "Inter")).toBe("");
    expect(trimFontEmbedCSS("not css at all", "Inter")).toBe("not css at all");
  });
});
