import { describe, it, expect } from "vitest";
import { crc32, createZip, readZipEntries } from "../shared/zip";

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);
const u32 = (b: Uint8Array, at: number) => new DataView(b.buffer, b.byteOffset).getUint32(at, true);
const u16 = (b: Uint8Array, at: number) => new DataView(b.buffer, b.byteOffset).getUint16(at, true);

describe("crc32", () => {
  it("matches the standard check values", () => {
    expect(crc32(enc("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
    expect(crc32(enc("a"))).toBe(0xe8b7be43);
  });
});

describe("createZip (store only)", () => {
  const date = new Date(2026, 9, 23, 12, 34, 56);
  const files = [
    { name: "captions.txt", data: enc("Captain picks: Isak 7.1\n#FPL") },
    { name: "01-captain-picks.png", data: Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3]) },
  ];
  const zip = createZip(files, { date });

  it("round trips names and bytes through the reader, verifying every CRC", () => {
    const entries = readZipEntries(zip);
    expect(entries.map((e) => e.name)).toEqual(["captions.txt", "01-captain-picks.png"]);
    expect(dec(entries[0].data)).toBe("Captain picks: Isak 7.1\n#FPL");
    expect(Array.from(entries[1].data)).toEqual(Array.from(files[1].data));
    expect(entries[0].crc).toBe(crc32(files[0].data));
  });

  it("writes a local header per file, a central directory and an end record", () => {
    expect(u32(zip, 0)).toBe(0x04034b50);
    const eocd = zip.length - 22;
    expect(u32(zip, eocd)).toBe(0x06054b50);
    expect(u16(zip, eocd + 8)).toBe(2); // entries on this disk
    expect(u16(zip, eocd + 10)).toBe(2); // total entries
    const cdOffset = u32(zip, eocd + 16);
    expect(u32(zip, cdOffset)).toBe(0x02014b50);
    expect(u32(zip, eocd + 12)).toBe(zip.length - 22 - cdOffset); // central directory size
  });

  it("stores (method 0) with equal sizes, UTF-8 names flagged, and the DOS date and time of the given date", () => {
    expect(u16(zip, 8)).toBe(0); // method
    expect(u16(zip, 6) & 0x0800).toBe(0x0800); // UTF-8 names
    expect(u32(zip, 18)).toBe(files[0].data.length); // compressed size
    expect(u32(zip, 22)).toBe(files[0].data.length); // uncompressed size
    expect(u16(zip, 10)).toBe((12 << 11) | (34 << 5) | 28);
    expect(u16(zip, 12)).toBe(((2026 - 1980) << 9) | (10 << 5) | 23);
  });

  it("keeps non-ASCII file names", () => {
    const z = createZip([{ name: "joão-pedro.png", data: enc("x") }], { date });
    expect(readZipEntries(z)[0].name).toBe("joão-pedro.png");
  });

  it("handles an empty file and larger data", () => {
    const big = new Uint8Array(1_000_000).map((_, i) => (i * 31) % 251);
    const z = createZip([{ name: "empty.txt", data: new Uint8Array(0) }, { name: "big.bin", data: big }], { date });
    const entries = readZipEntries(z);
    expect(entries[0].data.length).toBe(0);
    expect(entries[1].crc).toBe(crc32(big));
    expect(entries[1].data.length).toBe(1_000_000);
  });

  it("an empty list is a valid, empty zip", () => {
    const z = createZip([], { date });
    expect(z.length).toBe(22);
    expect(readZipEntries(z)).toEqual([]);
  });

  it("refuses unsafe or duplicate names", () => {
    expect(() => createZip([{ name: "", data: enc("x") }])).toThrow();
    expect(() => createZip([{ name: "../x.png", data: enc("x") }])).toThrow();
    expect(() => createZip([{ name: "/x.png", data: enc("x") }])).toThrow();
    expect(() => createZip([{ name: "a\\b.png", data: enc("x") }])).toThrow();
    expect(() => createZip([{ name: "a.png", data: enc("x") }, { name: "a.png", data: enc("y") }])).toThrow(/duplicate/i);
  });

  it("the reader rejects corrupted data", () => {
    const bad = Uint8Array.from(zip);
    bad[30 + "captions.txt".length + 2] ^= 0xff; // flip a byte inside the first file's data
    expect(() => readZipEntries(bad)).toThrow(/crc/i);
    expect(() => readZipEntries(enc("not a zip at all, definitely not"))).toThrow();
  });
});
