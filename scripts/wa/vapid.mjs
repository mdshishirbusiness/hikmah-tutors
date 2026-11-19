// Makes the key pair for admin phone alerts (Web Push, owner 2026-11-18) and stores it without printing the private key.
//   node scripts/wa/vapid.mjs --remote   → Cloudflare secrets VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (run in the app's
//                                          Terminal panel after `npx wrangler whoami` shows the Hikmah account)
//   node scripts/wa/vapid.mjs --local    → appends both to .dev.vars for `npm run dev`
// Run it once. A new pair means every phone has to press "Turn on alerts" again.
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const where = process.argv[2];
if (where !== "--remote" && where !== "--local") {
  console.log("Use --remote (Cloudflare secrets) or --local (.dev.vars).");
  process.exit(1);
}
const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const jwk = await webcrypto.subtle.exportKey("jwk", pair.privateKey);
const raw = Buffer.from(await webcrypto.subtle.exportKey("raw", pair.publicKey)); // 65 bytes, 0x04 || x || y
const publicKey = raw.toString("base64url");

if (where === "--local") {
  appendFileSync(".dev.vars", `\nVAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${jwk.d}\n`);
  console.log("Saved to .dev.vars. Restart npm run dev.");
} else {
  const put = (name, value) => execFileSync("npx", ["wrangler", "secret", "put", name], { input: value, stdio: ["pipe", "inherit", "inherit"], shell: true });
  put("VAPID_PUBLIC_KEY", publicKey);
  put("VAPID_PRIVATE_KEY", jwk.d);
  console.log("Both secrets are set on Cloudflare.");
}
