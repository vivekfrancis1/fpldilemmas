import { describe, it, expect } from "vitest";
import zlib from "node:zlib";
import { randomBytes } from "node:crypto";

// Plain HTTP client against the running dev server (see CLAUDE.md): needs `npm run dev` on port 5050.
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:5050";

function makePng(width: number, height: number, seed = 0): Buffer {
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
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  raw[1] = seed & 255; // a different first pixel makes a different image
  raw[2] = (seed >> 8) & 255;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const upload = (png: Buffer, params: { title?: string; target?: string }) =>
  fetch(`${BASE_URL}/api/shared-graphics?${new URLSearchParams({ title: params.title ?? "Test graphic", target: params.target ?? "/graphics" })}`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: png,
  });

describe("shared graphic link previews", () => {
  // unique per run so repeated runs do not just hit the stored duplicate
  const png = makePng(1200, 630, randomBytes(2).readUInt16BE());
  let id = "";

  it("stores a valid link card and returns a short link", async () => {
    const res = await upload(png, { title: "Top Differentials", target: "/graphics?t=top-differentials" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toMatch(/^[A-Za-z0-9]{8}$/);
    expect(body.url).toMatch(new RegExp(`/g/${body.id}$`));
    id = body.id;
  });

  it("uploading the same image for the same page again returns the same link", async () => {
    const again = await (await upload(png, { title: "Top Differentials", target: "/graphics?t=top-differentials" })).json();
    expect(again.id).toBe(id);
  });

  it("the short link is a page with the preview tags that sends people on to the tool", async () => {
    const res = await fetch(`${BASE_URL}/g/${id}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain(`property="og:image" content="`);
    expect(html).toContain(`/g/${id}.png"`);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain("Top Differentials");
    expect(html).toContain("/graphics?t=top-differentials");
  });

  it("serves the stored image as a PNG, byte for byte", async () => {
    const res = await fetch(`${BASE_URL}/g/${id}.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await res.arrayBuffer()).equals(png)).toBe(true);
  });

  it("answers 404 for an id that does not exist", async () => {
    expect((await fetch(`${BASE_URL}/g/ZZZZZZZZ`)).status).toBe(404);
    expect((await fetch(`${BASE_URL}/g/ZZZZZZZZ.png`)).status).toBe(404);
  });

  it("rejects bad uploads with 400", async () => {
    expect((await upload(Buffer.from("not an image"), {})).status).toBe(400);
    expect((await upload(makePng(800, 600), {})).status).toBe(400);
    expect((await upload(makePng(1200, 630, 1), { target: "https://evil.example/x" })).status).toBe(400);
    expect((await upload(makePng(1200, 630, 2), { target: "//evil.example" })).status).toBe(400);
  });
});
