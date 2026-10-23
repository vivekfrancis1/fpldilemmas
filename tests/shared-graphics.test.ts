import { describe, it, expect } from "vitest";
import zlib from "node:zlib";
import {
  MAX_PNG_BYTES,
  OG_HEIGHT,
  OG_WIDTH,
  newShareId,
  pngSize,
  renderSharePage,
  shareHash,
  validateShareUpload,
} from "../server/shared-graphics";

// A valid PNG of the given size (flat colour) built from scratch, so the tests need no image library.
function makePng(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((width * 3 + 1) * height); // filter byte 0 + black pixels
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("pngSize", () => {
  it("reads the width and height of a real PNG", () => {
    expect(pngSize(makePng(1200, 630))).toEqual({ width: 1200, height: 630 });
  });

  it("returns null for anything that is not a PNG", () => {
    expect(pngSize(Buffer.from("hello"))).toBeNull();
    expect(pngSize(Buffer.alloc(0))).toBeNull();
    expect(pngSize(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull(); // JPEG
  });
});

describe("validateShareUpload", () => {
  const good = () => ({ png: makePng(OG_WIDTH, OG_HEIGHT), title: "Top Differentials", target: "/graphics?t=top-differentials&size=square" });

  it("accepts a 1200x630 PNG, a short title and a path on this site", () => {
    const r = validateShareUpload(good());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r).toMatchObject({ title: "Top Differentials", target: "/graphics?t=top-differentials&size=square" });
  });

  it("rejects a file that is not a PNG, or a PNG of the wrong size", () => {
    expect(validateShareUpload({ ...good(), png: Buffer.from("not a png") }).ok).toBe(false);
    expect(validateShareUpload({ ...good(), png: makePng(800, 600) }).ok).toBe(false);
  });

  it("rejects an oversized upload", () => {
    const big = Buffer.concat([makePng(OG_WIDTH, OG_HEIGHT), Buffer.alloc(MAX_PNG_BYTES)]);
    expect(validateShareUpload({ ...good(), png: big }).ok).toBe(false);
  });

  it("the link target must be a path on this site: no other host, no protocol, no double slash", () => {
    for (const target of ["https://evil.com/x", "//evil.com", "javascript:alert(1)", "graphics", "", "/\\evil.com", "/ok\nevil", "/" + "a".repeat(2100)]) {
      expect(validateShareUpload({ ...good(), target }).ok, target.slice(0, 30)).toBe(false);
    }
    expect(validateShareUpload({ ...good(), target: "/player-plot?x=price&y=form" }).ok).toBe(true);
  });

  it("the title is trimmed, stripped of control characters and cut to 80 characters; an empty title gets a default", () => {
    const r = validateShareUpload({ ...good(), title: `  Haaland\u0000 vs\nSalah ${"x".repeat(200)}` });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.title.length).toBeLessThanOrEqual(80);
      expect(r.title).not.toMatch(/[\u0000-\u001f]/);
      expect(r.title.startsWith("Haaland vs Salah")).toBe(true);
    }
    const empty = validateShareUpload({ ...good(), title: "   " });
    expect(empty.ok && empty.title).toBe("FPL Dilemmas graphic");
  });
});

describe("ids and hashes", () => {
  it("share ids are short, URL-safe and not repeated", () => {
    const ids = Array.from({ length: 200 }, () => newShareId());
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9]{8}$/);
    expect(new Set(ids).size).toBe(200);
  });

  it("the same image for the same page hashes the same; a different page or image does not", () => {
    const a = makePng(OG_WIDTH, OG_HEIGHT);
    expect(shareHash(a, "/graphics?t=a")).toBe(shareHash(Buffer.from(a), "/graphics?t=a"));
    expect(shareHash(a, "/graphics?t=a")).not.toBe(shareHash(a, "/graphics?t=b"));
    expect(shareHash(a, "/graphics?t=a")).not.toBe(shareHash(Buffer.concat([a, Buffer.from([0])]), "/graphics?t=a"));
  });
});

describe("renderSharePage", () => {
  const page = renderSharePage({
    title: 'Top <b>"Differentials"</b> & more',
    imageUrl: "https://fpldilemmas.com/g/abcd1234.png",
    pageUrl: "https://fpldilemmas.com/g/abcd1234",
    targetPath: "/graphics?t=top-differentials&size=square",
  });

  it("carries the preview tags X, Facebook and WhatsApp read", () => {
    expect(page).toContain('property="og:image" content="https://fpldilemmas.com/g/abcd1234.png"');
    expect(page).toContain('property="og:image:width" content="1200"');
    expect(page).toContain('property="og:image:height" content="630"');
    expect(page).toContain('name="twitter:card" content="summary_large_image"');
    expect(page).toContain('name="twitter:image" content="https://fpldilemmas.com/g/abcd1234.png"');
    expect(page).toContain('property="og:url" content="https://fpldilemmas.com/g/abcd1234"');
    expect(page).toContain("FPL Dilemmas");
  });

  it("escapes the title so it cannot break out of the markup", () => {
    expect(page).not.toContain("<b>");
    expect(page).toContain("&lt;b&gt;");
    expect(page).toContain("&quot;Differentials&quot;");
    expect(page).toContain("&amp; more");
  });

  it("sends people on to the tool at the saved settings, and gives a plain link if scripts are off", () => {
    expect(page).toContain('http-equiv="refresh"');
    expect(page).toContain("/graphics?t=top-differentials&amp;size=square");
    expect(page).toContain("<a href=");
  });
});
