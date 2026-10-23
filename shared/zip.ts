// A minimal ZIP writer (store only, no compression) so the Gameweek pack can download several PNGs as one file without
// adding a dependency. PNGs are already compressed, so storing them costs almost nothing. Format reference: PKWARE
// APPNOTE (local file header, central directory, end of central directory record). Plus a small reader that checks
// every CRC, used by the tests and to verify downloads.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (the zip / PNG checksum) of the bytes, as an unsigned number. */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipFile {
  name: string;
  data: Uint8Array;
}

const UTF8_FLAG = 0x0800;
const MAX_ENTRIES = 0xffff;
const MAX_SIZE = 0xffffffff;

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.min(2107, Math.max(1980, date.getFullYear()));
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function checkName(name: string, seen: Set<string>) {
  if (!name || name.includes("\0") || name.includes("\\") || name.startsWith("/") || name.split("/").includes("..")) {
    throw new Error(`Unsafe zip entry name: "${name}"`);
  }
  if (seen.has(name)) throw new Error(`Duplicate zip entry name: "${name}"`);
  seen.add(name);
}

export function createZip(files: ZipFile[], options: { date?: Date } = {}): Uint8Array {
  if (files.length > MAX_ENTRIES) throw new Error("Too many files for a zip");
  const { time, date } = dosDateTime(options.date ?? new Date());
  const encoder = new TextEncoder();
  const seen = new Set<string>();
  const prepared = files.map((f) => {
    checkName(f.name, seen);
    if (f.data.length > MAX_SIZE) throw new Error("File too large for a zip");
    return { nameBytes: encoder.encode(f.name), data: f.data, crc: crc32(f.data) };
  });

  let size = 22;
  for (const p of prepared) size += 30 + p.nameBytes.length + p.data.length + 46 + p.nameBytes.length;
  if (size > MAX_SIZE) throw new Error("Zip too large");

  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let pos = 0;
  const offsets: number[] = [];

  for (const p of prepared) {
    offsets.push(pos);
    view.setUint32(pos, 0x04034b50, true);
    view.setUint16(pos + 4, 20, true); // version needed
    view.setUint16(pos + 6, UTF8_FLAG, true);
    view.setUint16(pos + 8, 0, true); // stored
    view.setUint16(pos + 10, time, true);
    view.setUint16(pos + 12, date, true);
    view.setUint32(pos + 14, p.crc, true);
    view.setUint32(pos + 18, p.data.length, true);
    view.setUint32(pos + 22, p.data.length, true);
    view.setUint16(pos + 26, p.nameBytes.length, true);
    view.setUint16(pos + 28, 0, true); // extra length
    out.set(p.nameBytes, pos + 30);
    out.set(p.data, pos + 30 + p.nameBytes.length);
    pos += 30 + p.nameBytes.length + p.data.length;
  }

  const cdStart = pos;
  prepared.forEach((p, i) => {
    view.setUint32(pos, 0x02014b50, true);
    view.setUint16(pos + 4, 20, true); // version made by
    view.setUint16(pos + 6, 20, true); // version needed
    view.setUint16(pos + 8, UTF8_FLAG, true);
    view.setUint16(pos + 10, 0, true);
    view.setUint16(pos + 12, time, true);
    view.setUint16(pos + 14, date, true);
    view.setUint32(pos + 16, p.crc, true);
    view.setUint32(pos + 20, p.data.length, true);
    view.setUint32(pos + 24, p.data.length, true);
    view.setUint16(pos + 28, p.nameBytes.length, true);
    // extra length, comment length, disk number, internal and external attributes stay 0
    view.setUint32(pos + 42, offsets[i], true);
    out.set(p.nameBytes, pos + 46);
    pos += 46 + p.nameBytes.length;
  });

  view.setUint32(pos, 0x06054b50, true);
  view.setUint16(pos + 8, prepared.length, true);
  view.setUint16(pos + 10, prepared.length, true);
  view.setUint32(pos + 12, pos - cdStart, true);
  view.setUint32(pos + 16, cdStart, true);
  return out;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc: number;
}

/** Reads a stored zip (like ours) back, checking each entry's CRC. Throws on anything malformed. */
export function readZipEntries(zip: Uint8Array): ZipEntry[] {
  if (zip.length < 22) throw new Error("Not a zip file");
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip file: no end record");
  const count = view.getUint16(eocd + 10, true);
  let cd = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (view.getUint32(cd, true) !== 0x02014b50) throw new Error("Bad central directory");
    const method = view.getUint16(cd + 10, true);
    if (method !== 0) throw new Error("Only stored entries are supported");
    const crc = view.getUint32(cd + 16, true);
    const size = view.getUint32(cd + 24, true);
    const nameLen = view.getUint16(cd + 28, true);
    const extraLen = view.getUint16(cd + 30, true);
    const commentLen = view.getUint16(cd + 32, true);
    const local = view.getUint32(cd + 42, true);
    const name = decoder.decode(zip.subarray(cd + 46, cd + 46 + nameLen));
    if (view.getUint32(local, true) !== 0x04034b50) throw new Error("Bad local header");
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = zip.slice(start, start + size);
    if (crc32(data) !== crc) throw new Error(`CRC mismatch for ${name}`);
    entries.push({ name, data, crc });
    cd += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}
