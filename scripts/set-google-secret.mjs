// Gives the live site its Google client secret, straight from the JSON file Google Cloud downloaded, so the secret is
// never typed, shown or pasted anywhere. Run by the owner in the Terminal panel (Hikmah wrangler login):
//   node scripts/set-google-secret.mjs
// It picks the newest client_secret_*.json in Downloads whose redirect goes to workers.dev, sets GOOGLE_CLIENT_SECRET
// on the hikmah-tutors Worker, and then deletes that file (and its duplicate without .json) from Downloads.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const dir = join(homedir(), "Downloads");
const candidates = readdirSync(dir)
  .filter((f) => /^client_secret_.*\.json$/.test(f))
  .map((f) => ({ f, path: join(dir, f), at: statSync(join(dir, f)).mtimeMs }))
  .map((c) => ({ ...c, web: JSON.parse(readFileSync(c.path, "utf8")).web }))
  .filter((c) => c.web?.redirect_uris?.some((u) => u.includes(".workers.dev/auth/google/callback")))
  .sort((a, b) => b.at - a.at);

if (!candidates.length) {
  console.error("No live Google client file in Downloads (client_secret_….json with a workers.dev redirect).");
  process.exit(1);
}
const { f, path, web } = candidates[0];
console.log(`Using ${f} (client ${web.client_id.slice(0, 12)}…).`);
execFileSync("npx", ["wrangler", "secret", "put", "GOOGLE_CLIENT_SECRET"], { input: web.client_secret, stdio: ["pipe", "inherit", "inherit"], shell: true });
// Every downloaded copy of this client goes: "….json", "… (1).json", and the one Chrome saved without an extension.
const copies = readdirSync(dir).filter((name) => name.startsWith(`client_secret_${web.client_id}`));
for (const name of copies) rmSync(join(dir, name), { force: true });
console.log(`GOOGLE_CLIENT_SECRET is set on Cloudflare, and ${copies.length} downloaded cop${copies.length === 1 ? "y is" : "ies are"} deleted.`);
