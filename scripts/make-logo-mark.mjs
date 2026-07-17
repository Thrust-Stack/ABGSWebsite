// Build public/logo-mark.png (the orbital centre mark on the Team page) from
// the full Thrust Stack logo lockup.
//
// Two things happen here:
//  1. Crop to the rocket + orbital arc, dropping the wordmark (which already
//     appears in the nav) — bounds measured from the source art.
//  2. Cut the black backdrop to real transparency. The backdrop is pure black
//     (luminance <= 5) while the darkest real artwork — the nose cone — is ~35,
//     so a smoothstep ramp across 6..18 separates them cleanly and keeps
//     antialiased edges soft. Real alpha (rather than mix-blend-mode: screen)
//     survives being nested in an isolated stacking context.
//
// Usage: node scripts/make-logo-mark.mjs <path-to-logo.png>
import sharp from "sharp";
import { statSync } from "fs";

const SRC = process.argv[2];
if (!SRC) {
  console.error("Usage: node scripts/make-logo-mark.mjs <path-to-logo.png>");
  process.exit(1);
}

const OUT = "public/logo-mark.png";
// Mark bounds in the source art; the wordmark starts at y=920.
const MARK = { x0: 368, x1: 886, y0: 100, y1: 914 };
const PAD = 44;
const WORDMARK_TOP = 917;
const LO = 6;
const HI = 18;

const left = MARK.x0 - PAD;
const top = MARK.y0 - PAD;
const width = MARK.x1 + PAD - left;
const height = WORDMARK_TOP - top;

const { data, info } = await sharp(SRC)
  .extract({ left, top, width, height })
  .resize({ height: 460, fit: "inside" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: W, height: H } = info;
const out = Buffer.alloc(W * H * 4);

for (let i = 0, p = 0; i < W * H; i++, p += 3) {
  const r = data[p];
  const g = data[p + 1];
  const b = data[p + 2];
  const lum = Math.max(r, g, b);
  const t = Math.max(0, Math.min(1, (lum - LO) / (HI - LO)));
  out[i * 4] = r;
  out[i * 4 + 1] = g;
  out[i * 4 + 2] = b;
  out[i * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255); // smoothstep
}

await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`${OUT}  ${W}x${H}  ${Math.round(statSync(OUT).size / 1024)} KB`);
