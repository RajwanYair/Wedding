#!/usr/bin/env node
/**
 * generate-icons.mjs — Wedding Manager icon generator
 * Produces brand-colored PNG icons (192 × 192 and 512 × 512) that Chrome
 * and Android require for a fully-installable PWA. Uses only Node.js
 * built-in modules (zlib + fs); no npm dependencies needed.
 *
 * Usage:  node scripts/generate-icons.mjs
 * Output: icon-192.png and icon-512.png in the project root.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/* ── CRC-32 helper ── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const l = Buffer.allocUnsafe(4);
  l.writeUInt32BE(d.length);
  const c = Buffer.allocUnsafe(4);
  c.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([l, t, d, c]);
}

/* ── Icon pixel art (brand colours) ── */
// Brand: background #1a0a2e (dark purple), accent #d4a574 (gold), rose #e8a0b4

function computePixel(x, y, sz) {
  const cx = sz / 2,
    cy = sz / 2;
  const dx = x - cx,
    dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const r = sz / 2;

  /* Outside circular boundary → transparent */
  if (dist > r - 0.5) return [0, 0, 0, 0];

  /* ── Ring 1 (left-offset) ── */
  const r1cx = cx - sz * 0.1,
    r1cy = cy - sz * 0.04;
  const ringR = sz * 0.28;
  const ringWidth = sz * 0.028;
  const d1 = Math.sqrt((x - r1cx) ** 2 + (y - r1cy) ** 2);
  if (d1 >= ringR - ringWidth && d1 <= ringR + ringWidth) {
    const alpha = Math.min(1, 1 - Math.abs(d1 - ringR) / ringWidth) * 230;
    return [212, 165, 116, Math.round(alpha)]; /* gold */
  }

  /* ── Ring 2 (right-offset) ── */
  const r2cx = cx + sz * 0.1,
    r2cy = cy - sz * 0.04;
  const d2 = Math.sqrt((x - r2cx) ** 2 + (y - r2cy) ** 2);
  if (d2 >= ringR - ringWidth && d2 <= ringR + ringWidth) {
    const alpha = Math.min(1, 1 - Math.abs(d2 - ringR) / ringWidth) * 230;
    return [212, 165, 116, Math.round(alpha)]; /* gold */
  }

  /* ── Small heart above rings ── */
  const hx = (x - cx) / (sz * 0.18);
  const hy = (y - (cy - sz * 0.28)) / (sz * 0.15);
  const heart = (hx * hx + hy * hy - 1) ** 3 - hx * hx * hy ** 3;
  if (heart < 0) {
    return [232, 160, 180, 200]; /* rose */
  }

  /* ── Diamond sparkle at top ── */
  const sx = Math.abs(x - cx) / (sz * 0.055);
  const sy = Math.abs(y - (cy - sz * 0.42)) / (sz * 0.055);
  if (sx + sy < 1.0) {
    return [240, 220, 200, 220]; /* cream gold */
  }

  /* ── Background gradient (dark purple radial) ── */
  const t = dist / r;
  const bg = [
    Math.min(255, Math.round(26 + t * 18)) /* R */,
    Math.min(255, Math.round(10 + t * 8)) /* G */,
    Math.min(255, Math.round(46 + t * 24)) /* B */,
  ];

  /* Soft vignette at edge */
  const edgeFade = Math.max(0, 1 - (dist / (r * 0.98)) ** 12);
  return [bg[0], bg[1], bg[2], Math.round(255 * (0.92 + 0.08 * edgeFade))];
}

/* ── Build PNG bytes ── */
function buildPNG(sz) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(sz, 0);
  ihdr.writeUInt32BE(sz, 4);
  ihdr[8] = 8; /* bit depth       */
  ihdr[9] = 6; /* RGBA color type */
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  /* Raw scanlines: 1 filter byte + sz * 4 RGBA bytes per row */
  const rows = [];
  for (let y = 0; y < sz; y++) {
    const row = Buffer.allocUnsafe(1 + sz * 4);
    row[0] = 0; /* filter None */
    for (let x = 0; x < sz; x++) {
      const [r, g, b, a] = computePixel(x, y, sz);
      const o = 1 + x * 4;
      row[o] = r;
      row[o + 1] = g;
      row[o + 2] = b;
      row[o + 3] = a;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── Main ── */
[192, 512].forEach(function (sz) {
  const outPath = resolve(ROOT, `icon-${sz}.png`);
  const buf = buildPNG(sz);
  writeFileSync(outPath, buf);
  process.stdout.write(`✔  Generated icon-${sz}.png  (${(buf.length / 1024).toFixed(1)} KB)\n`);
});

process.stdout.write("Done. Update manifest.json to reference icon-192.png and icon-512.png.\n");
