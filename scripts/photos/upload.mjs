// Shrinks tutor photos and puts them in the private R2 bucket, then records each one on its tutor. Plan:
// docs/DECISIONS.md, 2026-11-03. Before this: run scripts/tutor-files.gs in the Mastersheet, download the
// "Hikmah tutor photos" folder from Drive and unzip it into imports/photos/ (files named T1234.jpg).
//   npm run photos:upload-local     try it on the local database and local bucket
//   npm run photos:upload-real      the real bucket and database (owner's Terminal panel, Hikmah account)
// Safe to run again: photos already uploaded are listed in imports/photos-small/uploaded.txt and skipped.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
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
const wrangler = (args) => execFileSync("npx", ["wrangler", ...args], { stdio: ["ignore", "ignore", "inherit"], shell: true });

const files = readdirSync(IN, { recursive: true }).map(String).filter((f) => /(^|[\\/])T\d+\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f));
const counts = { found: files.length, uploaded: 0, skipped: 0, unreadable: [] };
const updates = [];
for (const file of files) {
  const code = Number(file.match(/T(\d+)\./i)[1]);
  const key = `tutors/T${code}.webp`;
  if (done.has(key)) { counts.skipped++; continue; }
  const small = join(OUT, `T${code}.webp`);
  try {
    // rotate() follows the phone's orientation flag; attention crops around the face rather than the centre.
    await sharp(join(IN, file)).rotate().resize(SIZE, SIZE, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 80 }).toFile(small);
  } catch {
    counts.unreadable.push(file); // e.g. a HEIC this sharp build can't read: convert it by hand and run again
    continue;
  }
  wrangler(["r2", "object", "put", `${BUCKET}/${key}`, `--file=${small}`, "--content-type=image/webp", where]);
  appendFileSync(DONE, key + "\n");
  updates.push(`UPDATE tutors SET photo_key = '${key}' WHERE code = ${code};`);
  counts.uploaded++;
  if (counts.uploaded % 50 === 0) console.log(`${counts.uploaded} uploaded…`);
}

if (updates.length) {
  const sql = join(OUT, "photo-keys.sql");
  writeFileSync(sql, updates.join("\n"));
  try {
    wrangler(["d1", "execute", "hikmah", where, `--file=${sql}`]);
  } finally {
    rmSync(sql);
  }
}
console.log(JSON.stringify({ ...counts, unreadable: counts.unreadable.length }, null, 2));
if (counts.unreadable.length) console.log("Could not read:", counts.unreadable.join(", "));
