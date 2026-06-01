// Erzeugt die PWA-Icons als PNG ohne externe Abhängigkeiten.
// Design: grüner, abgerundeter Hintergrund mit weißem Apfel.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// --- CRC32 für PNG-Chunks ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // gefilterte Scanlines (Filter 0 pro Zeile)
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Zeichnen (mit 3x Supersampling für glatte Kanten) ---
function lerp(a, b, t) {
  return a + (b - a) * t;
}
// Deckung eines abgerundeten Rechtecks in Normalkoordinaten 0..1
function roundedRectCover(x, y, radius) {
  const rx = Math.max(radius, Math.abs(x - 0.5) - (0.5 - radius));
  const ry = Math.max(radius, Math.abs(y - 0.5) - (0.5 - radius));
  const dx = Math.max(Math.abs(x - 0.5) - (0.5 - radius), 0);
  const dy = Math.max(Math.abs(y - 0.5) - (0.5 - radius), 0);
  void rx;
  void ry;
  return Math.hypot(dx, dy) <= radius;
}
function inCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) <= r;
}

function render(size) {
  const ss = 3;
  const W = size * ss;
  const rgba = Buffer.alloc(W * W * 4);
  for (let py = 0; py < W; py++) {
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / W;
      const y = (py + 0.5) / W;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      if (roundedRectCover(x, y, 0.23)) {
        // grüner Verlauf
        r = Math.round(lerp(34, 21, y));
        g = Math.round(lerp(197, 128, y));
        b = Math.round(lerp(94, 61, y));
        a = 255;
        // Apfelkörper (zwei überlappende Kreise), weiß
        const body =
          inCircle(x, y, 0.40, 0.60, 0.205) || inCircle(x, y, 0.60, 0.60, 0.205);
        // Einkerbung oben
        const notch = inCircle(x, y, 0.5, 0.40, 0.085);
        if (body && !notch) {
          r = 255;
          g = 255;
          b = 255;
        }
        // Stiel
        if (Math.abs(x - 0.5) < 0.018 && y > 0.34 && y < 0.46) {
          r = 120;
          g = 72;
          b = 40;
        }
        // Blatt
        const lx = x - 0.585;
        const ly = y - 0.40;
        const ang = -0.6;
        const rxp = lx * Math.cos(ang) - ly * Math.sin(ang);
        const ryp = lx * Math.sin(ang) + ly * Math.cos(ang);
        if ((rxp / 0.10) ** 2 + (ryp / 0.045) ** 2 <= 1) {
          r = 187;
          g = 247;
          b = 208;
        }
      }
      const i = (py * W + px) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
  // Downsample ss×ss -> size×size
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const i = ((y * ss + sy) * W + (x * ss + sx)) * 4;
          r += rgba[i];
          g += rgba[i + 1];
          b += rgba[i + 2];
          a += rgba[i + 3];
        }
      }
      const n = ss * ss;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return encodePNG(size, size, out);
}

for (const [name, size] of [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(join(outDir, name), render(size));
  console.log('geschrieben:', name, `(${size}px)`);
}
