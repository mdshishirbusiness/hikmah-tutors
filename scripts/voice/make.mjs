// Makes HTR's voice clips with ElevenLabs (owner, 2026-11-12) in the owner's cloned voice, some with a very low
// background sound, and can put them on the site. Keys are read from .dev.vars (ELEVENLABS_API_KEY, ELEVENLABS_API_KEY2…) and
// never printed. One account (ACCOUNT in lines.mjs) makes every clip, so the voice sounds the same on every page.
//
//   node scripts/voice/make.mjs --dry                  characters per clip and what is left this month
//   node scripts/voice/make.mjs --beds                 make the low background sounds once (ElevenLabs Sound Effects)
//   node scripts/voice/make.mjs [keys…] [--force]      make clips into voice-out/ (all keys when none are named)
//   node scripts/voice/make.mjs [keys…] --upload synthetic   put them into the synthetic site (npm run dev:synthetic)
//   node scripts/voice/make.mjs [keys…] --upload remote      put them on the live site: owner, in the Terminal panel,
//                                                            after `npx wrangler whoami` shows the Hikmah account
// Options: --key-var ELEVENLABS_API_KEY4 (another account) · --model eleven_v3 (default) · --voice <voice id> (default:
// the account's own cloned voice)
// Needs ffmpeg for the background mix. Files in voice-out/ are not committed.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { ACCOUNT, BEDS, LINES, MODEL as DEFAULT_MODEL, SETTINGS } from "./lines.mjs";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const optValues = new Set(["--model", "--voice", "--upload", "--key-var"].map((f) => opt(f)).filter(Boolean));
const keys = args.filter((a) => !a.startsWith("--") && !optValues.has(a));
for (const k of keys) if (!(k in LINES)) { console.error(`Unknown key: ${k}. Known: ${Object.keys(LINES).join(", ")}`); process.exit(1); }
const todo = keys.length ? keys : Object.keys(LINES);

const OUT = "voice-out";
const MODEL = opt("--model", DEFAULT_MODEL);
const textOf = (k) => (typeof LINES[k] === "string" ? LINES[k] : LINES[k].text);
const bedOf = (k) => (typeof LINES[k] === "string" ? null : LINES[k].bed ?? null);
const vars = existsSync(".dev.vars") ? readFileSync(".dev.vars", "utf8") : "";
const fromVars = (name) => vars.match(new RegExp(`^${name}\\s*=\\s*"?([^"\\r\\n]+)"?`, "m"))?.[1]?.trim();
const KEY_VAR = opt("--key-var", ACCOUNT);
const KEY = process.env[KEY_VAR] || fromVars(KEY_VAR);
const chars = (t) => [...t.replace(/\s+/g, " ").trim()].length;

async function api(path, init = {}) {
  if (!KEY) throw new Error(`${KEY_VAR} is not in .dev.vars.`);
  const r = await fetch(`https://api.elevenlabs.io${path}`, { ...init, headers: { "xi-api-key": KEY, "content-type": "application/json", ...init.headers } });
  if (!r.ok) throw new Error(`ElevenLabs ${path.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r;
}
const left = async () => {
  const s = await (await api("/v1/user/subscription")).json();
  return { left: s.character_limit - s.character_count, reset: new Date(s.next_character_count_reset_unix * 1000).toISOString().slice(0, 10) };
};
async function voiceId() {
  const id = opt("--voice");
  if (id) return id;
  const { voices } = await (await api("/v2/voices?page_size=100&voice_type=personal")).json();
  const clone = (voices ?? []).find((v) => v.category === "cloned" || v.category === "professional");
  if (!clone) throw new Error(`No cloned voice in ${KEY_VAR}'s account. Pass --voice <id>.`);
  return clone.voice_id;
}
const ffmpeg = (...a) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a]);

async function main() {
if (flag("--dry")) {
  let total = 0;
  for (const k of todo) { const n = chars(textOf(k)); total += n; console.log(`${k.padEnd(16)} ${String(n).padStart(4)} chars`); }
  const l = KEY ? await left() : null;
  console.log(`total ${total} chars${l ? ` · ${KEY_VAR} has ${l.left} left (resets ${l.reset})` : ""}`);
  return;
}

if (flag("--beds")) {
  // The background beds, made once (ElevenLabs Sound Effects, 22 s, looped under longer clips).
  for (const [name, text] of Object.entries(BEDS)) {
    const r = await api("/v1/sound-generation?output_format=mp3_44100_128", { method: "POST", body: JSON.stringify({ text, duration_seconds: 22, prompt_influence: 0.5 }) });
    writeFileSync(`scripts/voice/bed-${name}.mp3`, Buffer.from(await r.arrayBuffer()));
    console.log(`bed → scripts/voice/bed-${name}.mp3`);
  }
  return;
}

if (!flag("--upload")) {
  mkdirSync(OUT, { recursive: true });
  const need = todo.filter((k) => flag("--force") || !existsSync(`${OUT}/${k}.mp3`));
  const cost = need.reduce((n, k) => n + chars(textOf(k)), 0);
  const l = await left();
  if (cost > l.left) { console.error(`Needs ${cost} characters, ${l.left} left this month (resets ${l.reset}).`); process.exitCode = 1; return; }
  const voice = await voiceId();
  for (const k of need) {
    const r = await api(`/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      body: JSON.stringify({ text: textOf(k), model_id: MODEL, voice_settings: SETTINGS }),
    });
    const raw = Buffer.from(await r.arrayBuffer());
    const bed = bedOf(k) && `scripts/voice/bed-${bedOf(k)}.mp3`;
    if (bed && existsSync(bed)) {
      // The voice untouched on top; the bed looped, far below it (about -30 dB), faded in and out. High-quality VBR so
      // the mix loses nothing the owner can hear.
      writeFileSync(`${OUT}/${k}.raw.mp3`, raw);
      const len = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${OUT}/${k}.raw.mp3`], { encoding: "utf8" }));
      const end = (len + 0.8).toFixed(2);
      // Beds come out at very different levels, so each is set to sit ~22 dB under the voice's average, by measurement.
      const mean = (f) => Number(/mean_volume: (-?[\d.]+) dB/.exec(spawnSync("ffmpeg", ["-hide_banner", "-i", f, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" }).stderr)?.[1]); // ffmpeg reports on stderr
      const gain = (mean(`${OUT}/${k}.raw.mp3`) - 22 - mean(bed)).toFixed(1);
      ffmpeg("-i", `${OUT}/${k}.raw.mp3`, "-stream_loop", "-1", "-i", bed, "-filter_complex",
        `[0:a]adelay=500|500,apad=pad_dur=0.8[v];[1:a]volume=${gain}dB,atrim=0:${end},afade=t=in:d=1.2,afade=t=out:st=${(len - 0.6).toFixed(2)}:d=1.4[b];[v][b]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[out]`,
        "-map", "[out]", "-ar", "44100", "-c:a", "libmp3lame", "-q:a", "2", `${OUT}/${k}.mp3`);
    } else {
      if (bed) console.log(`(no ${bed} yet: node scripts/voice/make.mjs --beds) `);
      writeFileSync(`${OUT}/${k}.mp3`, raw); // ElevenLabs' own file, not re-encoded
    }
    console.log(`${k} → ${OUT}/${k}.mp3 (${Math.round(statSync(`${OUT}/${k}.mp3`).size / 1024)} KB${bed ? ", with " + bedOf(k) : ""})`);
  }
  if (!need.length) console.log("Nothing to make (use --force to remake).");
  return;
}

// Upload: the file to R2 under voice/, then the row in site_voice (the same as the admin page's Save).
const where = opt("--upload");
if (where !== "synthetic" && where !== "remote") { console.error("--upload synthetic | remote"); process.exitCode = 1; return; }
const scope = where === "remote" ? ["--remote"] : ["--local", "--persist-to", ".wrangler/synthetic"];
// Wrangler's own entry run by this node, no shell in between, so the SQL reaches it exactly as written.
const wrangler = (...a) => execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const sql = (s) => JSON.parse(wrangler("d1", "execute", "hikmah", ...scope, "--json", "--command", s))[0]?.results ?? [];
for (const k of todo) {
  const file = `${OUT}/${k}.mp3`;
  if (!existsSync(file)) { console.log(`${k}: no ${file}, skipped`); continue; }
  if (!/^[a-z0-9-]+$/.test(k)) throw new Error(`bad key ${k}`);
  const t = Math.floor(Date.now() / 1000);
  const key = `voice/${k}-${t}.mp3`;
  const old = sql(`SELECT r2_key FROM site_voice WHERE slot = '${k}'`)[0]?.r2_key;
  wrangler("r2", "object", "put", `hikmah-photos/${key}`, "--file", file, "--content-type", "audio/mpeg", ...scope);
  const bytes = statSync(file).size;
  // Page clips keep their auto switch; a new page clip starts off (the owner turns auto on at /admin/voice).
  sql(`INSERT INTO site_voice (slot, r2_key, mime, bytes, autoplay, updated_by, updated_at) VALUES ('${k}', '${key}', 'audio/mpeg', ${bytes}, 0, NULL, ${t})
       ON CONFLICT (slot) DO UPDATE SET r2_key = excluded.r2_key, mime = excluded.mime, bytes = excluded.bytes, updated_by = NULL, updated_at = excluded.updated_at;
       INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (NULL, 'voice_saved', 'voice', '${k}', '{"bytes":${bytes},"source":"elevenlabs"}', ${t});`);
  if (old && old !== key && old.startsWith("voice/")) wrangler("r2", "object", "delete", `hikmah-photos/${old}`, ...scope);
  console.log(`${k} → ${where} (${Math.round(bytes / 1024)} KB)`);
}
console.log(where === "remote" ? "Done. The site picks them up within a minute." : "Done. Restart npm run dev:synthetic if it was running.");
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
