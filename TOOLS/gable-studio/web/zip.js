// zip.js — a tiny, dependency-free ZIP writer (STORE / no compression). Enough
// to bundle a handful of small text files for the export, so the app needs no
// JSZip and no CDN. Files: [{name, data: string|Uint8Array}] -> Blob.
const enc = new TextEncoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

export function makeZip(files) {
  const recs = files.map((f) => ({
    name: enc.encode(f.name),
    data: typeof f.data === "string" ? enc.encode(f.data) : f.data,
  }));
  const chunks = [];
  let offset = 0;
  const central = [];

  for (const r of recs) {
    const crc = crc32(r.data);
    const size = r.data.length;
    const local = new Uint8Array(30 + r.name.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);   // local file header sig
    dv.setUint16(4, 20, true);           // version needed
    dv.setUint16(6, 0x0800, true);       // flags: UTF-8 names
    dv.setUint16(8, 0, true);            // method: store
    dv.setUint16(10, 0, true);           // mod time
    dv.setUint16(12, 0x21, true);        // mod date (1980-01-01)
    dv.setUint32(14, crc, true);
    dv.setUint32(18, size, true);        // compressed size
    dv.setUint32(22, size, true);        // uncompressed size
    dv.setUint16(26, r.name.length, true);
    dv.setUint16(28, 0, true);           // extra len
    local.set(r.name, 30);
    chunks.push(local, r.data);

    const cd = new Uint8Array(46 + r.name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);   // central dir sig
    cv.setUint16(4, 20, true);           // version made by
    cv.setUint16(6, 20, true);           // version needed
    cv.setUint16(8, 0x0800, true);       // flags
    cv.setUint16(10, 0, true);           // method
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, r.name.length, true);
    cv.setUint32(42, offset, true);      // local header offset
    cd.set(r.name, 46);
    central.push(cd);

    offset += local.length + r.data.length;
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const cd of central) { chunks.push(cd); cdSize += cd.length; }

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);     // end of central dir sig
  ev.setUint16(8, recs.length, true);    // entries this disk
  ev.setUint16(10, recs.length, true);   // total entries
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdStart, true);
  chunks.push(end);

  return new Blob(chunks, { type: "application/zip" });
}
