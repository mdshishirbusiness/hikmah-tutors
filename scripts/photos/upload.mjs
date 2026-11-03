// Shrinks tutor photos and puts them in the private R2 bucket, then records each one on its tutor. Plan:
// docs/DECISIONS.md, 2026-11-03. Before this: run scripts/tutor-files.gs in the Mastersheet, download the
// "Hikmah tutor photos" folder from Drive and unzip it into imports/photos/ (files named T1234.jpg).
//   npm run photos:upload-local     try it on the local database and local bucket
//   npm run photos:upload-real      the real bucket and database (owner's Terminal panel, Hikmah account)
// Safe to run again: photos already uploaded are listed in imports/photos-small/uploaded--remote.txt (or --local),
// skipped, and linked to their tutor again.
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import heicConvert from "heic-convert";
import sharp from "sharp";

const where = process.argv.includes("--remote") ? "--remote" : process.argv.includes("--local") ? "--local" : null;
if (!where) {
  console.error("Say which: --local or --remote.");
  process.exit(1);
}
const IN = "imports/photos";
const OUT = "imports/photos-small";
const DONE = join(OUT, `uploaded${where}.txt`);
const BUCKET = "hikmah-photos";
const SIZE = 400; // square, enough for a profile at 2x on a phone

if (!existsSync(IN)) {
  console.error(`Put the unzipped photos in ${IN}/ first (T1234.jpg …).`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
const done = new Set(existsSync(DONE) ? readFileSync(DONE, "utf8").split("\n").filter(Boolean) : []);
const run = promisify(execFile);
const wrangler = (args) => execFileSync("npx", ["wrangler", ...args], { stdio: ["ignore", "inherit", "inherit"], shell: true });

const files = readdirSync(IN, { recursive: true }).map(String).filter((f) => /(^|[\\/])T\d+\.(jpe?g|jfif|png|webp|heic|heif|gif)$/i.test(f));
const counts = { found: files.length, uploaded: 0, skipped: 0, unreadable: [] };
const keys = new Map(); // code → key, for the database step
const todo = [];

// 1. Shrink. Already-uploaded photos are not touched again.
for (const file of files) {
  const code = Number(file.match(/T(\d+)\./i)[1]);
  const key = `tutors/T${code}.webp`;
  if (done.has(key)) { counts.skipped++; keys.set(code, key); continue; }
  const small = join(OUT, `T${code}.webp`);
  try {
    let image = readFileSync(join(IN, file));
    // iPhone HEIC photos (some named .jpg): sharp's build can't read them, so turn them into JPEG first.
    if (/^ftyp(hei|hev|mif)/.test(image.subarray(4, 11).toString("latin1"))) {
      image = Buffer.from(await heicConvert({ buffer: image, format: "JPEG", quality: 0.92 }));
    }
    // failOn "none" keeps a JPEG with a damaged tail. rotate() follows the phone's orientation flag; attention crops
    // around the face rather than the centre.
    await sharp(image, { failOn: "none" }).rotate().resize(SIZE, SIZE, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 80 }).toFile(small);
  } catch {
    counts.unreadable.push(file); // e.g. a PDF uploaded as a photo
    continue;
  }
  todo.push({ code, key, small });
}
console.log(`${todo.length} photos shrunk; uploading…`);

// 2. Upload, a few at a time, each photo saved as done when it lands. wrangler is started with node directly (npx
// adds seconds per photo); its experimental "r2 bulk put" kept failing on the real bucket (2026-11-03).
const WRANGLER = resolve("node_modules/wrangler/bin/wrangler.js");
const PARALLEL = 6;
const failed = [];
async function upload(t) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await run(process.execPath, [WRANGLER, "r2", "object", "put", `${BUCKET}/${t.key}`, `--file=${t.small}`, "--content-type=image/webp", where]);
      appendFileSync(DONE, t.key + "\n");
      keys.set(t.code, t.key);
      if (++counts.uploaded % 50 === 0) console.log(`${counts.uploaded} of ${todo.length} uploaded`);
      return;
    } catch {}
  }
  failed.push(t.key); // network trouble three times: a re-run tries again
}
const queue = [...todo];
await Promise.all(Array.from({ length: PARALLEL }, async () => { while (queue.length) await upload(queue.shift()); }));
if (failed.length) console.log(`Upload failed (run again): ${failed.join(", ")}`);

// 3. Link every uploaded photo to its tutor, including ones from earlier runs.
if (keys.size) {
  const sql = join(OUT, "photo-keys.sql");
  writeFileSync(sql, [...keys].map(([code, key]) => `UPDATE tutors SET photo_key = '${key}' WHERE code = ${code};`).join("\n"));
  try {
    wrangler(["d1", "execute", "hikmah", where, `--file=${sql}`]);
  } finally {
    rmSync(sql);
  }
}
console.log(JSON.stringify({ ...counts, unreadable: counts.unreadable.length }, null, 2));
if (counts.unreadable.length) console.log("Could not read:", counts.unreadable.join(", "));
