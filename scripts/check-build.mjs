// Stops a deploy whose page files are missing. On 2026-11-05 a deploy went out with an empty build/client/assets, so
// the live site served HTML with every /assets/ file a 404 (no styles, no scripts). This checks that every /assets/
// file the server build links to is in build/client/assets. Run: node scripts/check-build.mjs (npm run deploy does).
import { existsSync, readdirSync, readFileSync } from "node:fs";

const SERVER = "build/server/assets";
const CLIENT = "build/client";

const fail = (msg) => {
  console.error(`check-build: ${msg}\nNot deploying. Run npm run build again, then npm run deploy.`);
  process.exit(1);
};

if (!existsSync(SERVER)) fail(`${SERVER} is missing.`);
const linked = new Set();
for (const f of readdirSync(SERVER).filter((f) => f.endsWith(".js"))) {
  for (const m of readFileSync(`${SERVER}/${f}`, "utf8").matchAll(/"(\/assets\/[^"?#]+)"/g)) linked.add(m[1]);
}
if (linked.size === 0) fail("the server build links to no /assets/ files.");

const missing = [...linked].filter((p) => !existsSync(CLIENT + p));
if (missing.length) fail(`${missing.length} of ${linked.size} page files are missing, e.g. ${missing.slice(0, 3).join(", ")}.`);
console.log(`check-build: all ${linked.size} page files are in ${CLIENT}/assets.`);
