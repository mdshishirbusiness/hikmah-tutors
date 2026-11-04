// Cuts the logo mark (figure, cap, star) out of design/brand/logo-square.png, without any piece of the letters, on a
// transparent background. Writes public/brand/mark.webp (header, footer, loader) and the app icons on a cream tile
// (icon-192, icon-512, apple-touch-icon). Run: node scripts/make-logo-mark.mjs
import sharp from "sharp";

const SRC = "design/brand/logo-square.png";
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const bg = [data[0], data[1], data[2]];
const diff = (p) => Math.abs(data[p * 4] - bg[0]) + Math.abs(data[p * 4 + 1] - bg[1]) + Math.abs(data[p * 4 + 2] - bg[2]);

// Label every connected shape of clear ink.
const label = new Int32Array(W * H).fill(-1);
const shapes = [];
for (let p = 0; p < W * H; p++) {
  if (label[p] !== -1 || diff(p) <= 60) continue;
  const s = { n: 0, x0: W, y0: H, x1: 0, y1: 0 }, id = shapes.length, stack = [p];
  label[p] = id;
  while (stack.length) {
    const q = stack.pop(), x = q % W, y = (q / W) | 0;
    s.n++; s.x0 = Math.min(s.x0, x); s.x1 = Math.max(s.x1, x); s.y0 = Math.min(s.y0, y); s.y1 = Math.max(s.y1, y);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const nq = ny * W + nx;
      if (label[nq] === -1 && diff(nq) > 60) { label[nq] = id; stack.push(nq); }
    }
  }
  shapes.push(s);
}

// The mark is every shape that starts left of the letters' column (x < 440) or is the star above the H.
// The letters (H at x 446+, T at x 440+, the rest further right) and the RAJSHAHI pill all start at x >= 440 and y >= 530.
// The mark itself spans about x 115-578, y 291-971; specks at the picture's edges are ignored.
const inMarkArea = (s) => s.x0 >= 100 && s.y0 >= 280 && s.y1 <= 990;
const isMark = shapes.map((s) => inMarkArea(s) && (s.x0 < 440 || (s.y1 < 520 && s.x0 < 600)));
const markBox = shapes.reduce((b, s, i) => (isMark[i] && s.n > 50 ? { x0: Math.min(b.x0, s.x0), y0: Math.min(b.y0, s.y0), x1: Math.max(b.x1, s.x1), y1: Math.max(b.y1, s.y1) } : b), { x0: W, y0: H, x1: 0, y1: 0 });

// Soft edge pixels belong to whichever labelled shape is nearest (within 3 px); keep them only if that shape is the mark.
const R = 3;
const out = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x, d = diff(p);
    if (d < 6) continue;
    let owner = label[p];
    if (owner === -1) {
      let best = R * R + 1;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const l = label[ny * W + nx], dd = dx * dx + dy * dy;
        if (l !== -1 && dd < best) { best = dd; owner = l; }
      }
    }
    if (owner === -1 || !isMark[owner]) continue;
    const a = Math.min(1, d / 90);
    for (let c = 0; c < 3; c++) out[p * 4 + c] = Math.max(0, Math.min(255, Math.round((data[p * 4 + c] - (1 - a) * bg[c]) / a)));
    out[p * 4 + 3] = Math.round(a * 255);
  }
}

// Square crop around the mark with a little air, then the sizes the site uses.
const pad = 24, w = markBox.x1 - markBox.x0 + 1 + pad * 2, h = markBox.y1 - markBox.y0 + 1 + pad * 2, side = Math.max(w, h);
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
const cut = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: markBox.x0 - pad, top: markBox.y0 - pad, width: w, height: h }).png().toBuffer();
const square = await sharp(cut)
  .extend({ left: Math.floor((side - w) / 2), right: Math.ceil((side - w) / 2), top: Math.floor((side - h) / 2), bottom: Math.ceil((side - h) / 2), background: CLEAR })
  .png().toBuffer();

await sharp(square).resize(256, 256).webp({ quality: 92, alphaQuality: 100 }).toFile("public/brand/mark.webp");
const CREAM = { r: 253, g: 253, b: 248, alpha: 1 };
const onCream = async (size, inner) => {
  const m = await sharp(square).resize(inner, inner).png().toBuffer();
  const off = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: CREAM } }).composite([{ input: m, top: off, left: off }]).png();
};
await (await onCream(192, 168)).toFile("public/brand/icon-192.png");
await (await onCream(512, 448)).toFile("public/brand/icon-512.png");
await (await onCream(180, 156)).toFile("public/brand/apple-touch-icon.png");
console.log("mark box", markBox, "side", side);

// The full logo (mark, "Hikmah Tutors" and the RAJSHAHI pill) on a transparent background, tightly cropped, for the
// site header (owner, 2026-11-05: the logo itself reads better than the mark with the name typed beside it).
const all = shapes.map((s) => inMarkArea(s) || (s.x0 >= 440 && s.y0 >= 280 && s.y1 <= 990 && s.n > 50));
const full = Buffer.alloc(W * H * 4);
let box = { x0: W, y0: H, x1: 0, y1: 0 };
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x, d = diff(p);
    if (d < 6) continue;
    let owner = label[p];
    if (owner === -1) {
      let best = R * R + 1;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const l = label[ny * W + nx], dd = dx * dx + dy * dy;
        if (l !== -1 && dd < best) { best = dd; owner = l; }
      }
    }
    if (owner === -1 || !all[owner]) continue;
    const a = Math.min(1, d / 90);
    for (let c = 0; c < 3; c++) full[p * 4 + c] = Math.max(0, Math.min(255, Math.round((data[p * 4 + c] - (1 - a) * bg[c]) / a)));
    full[p * 4 + 3] = Math.round(a * 255);
    if (a > 0.5) box = { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x), y1: Math.max(box.y1, y) };
  }
}
const fp = 6;
await sharp(full, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: box.x0 - fp, top: box.y0 - fp, width: box.x1 - box.x0 + 1 + fp * 2, height: box.y1 - box.y0 + 1 + fp * 2 })
  .resize({ height: 192 }).webp({ quality: 92, alphaQuality: 100 }).toFile("public/brand/logo.webp");
console.log("full logo box", box);
