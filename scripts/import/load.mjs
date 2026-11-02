// Saves the sheet into a database. Run the trial first (npm run import:dry-run). Plan: docs/DECISIONS.md, 2026-11-03.
//   npm run import:load-local                 local: replace any earlier import with a fresh full load
//   npm run import:top-up-local               local: add only what is new in the sheet
//   npm run import:load-real                  real database: the first full load (refused once anything is loaded)
//   npm run import:top-up-real                real database: add only what is new
//   node scripts/import/load.mjs --local|--remote --undo-batch <id>   remove one batch
// The real database is only ever touched from the owner's Terminal panel, logged in to the Hikmah account
// (CLAUDE.md). Before every real import the whole database is exported to imports/backups/ (gitignored).
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { batchCountsSql, buildAddOnlySql, buildLoadSql, rollbackSql } from "./load-sql.mjs";
import { analyze } from "./sheet.mjs";

const args = process.argv.slice(2);
const where = args.includes("--remote") ? "--remote" : args.includes("--local") ? "--local" : null;
if (!where) {
  console.error("Say which database: --local or --remote.");
  process.exit(1);
}
const real = where === "--remote";
const SQL_FILE = "imports/sheet-load.sql";

function wrangler(extra, { json = false } = {}) {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "hikmah", where, ...extra, ...(json ? ["--json"] : [])], {
    stdio: ["ignore", json ? "pipe" : "ignore", "inherit"], shell: true, encoding: "utf8",
  });
  return json ? JSON.parse(out)[0].results : null;
}
const query = (sql) => wrangler([`--command="${sql.replace(/\s+/g, " ")}"`], { json: true });
function runFile(lines) {
  writeFileSync(SQL_FILE, lines.join("\n"));
  try {
    wrangler([`--file=${SQL_FILE}`]);
  } finally {
    rmSync(SQL_FILE); // holds real personal data
  }
}
function backup() {
  if (!real) return;
  mkdirSync("imports/backups", { recursive: true });
  const file = `imports/backups/hikmah-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
  execFileSync("npx", ["wrangler", "d1", "export", "hikmah", "--remote", `--output=${file}`], { stdio: ["ignore", "ignore", "inherit"], shell: true });
  console.log(`Backup saved: ${file}`);
}

const undoAt = args.indexOf("--undo-batch");
if (undoAt >= 0) {
  const id = Number(args[undoAt + 1]);
  if (!Number.isInteger(id) || id <= 0) {
    console.error("Give the batch id: --undo-batch 1762128000");
    process.exit(1);
  }
  backup();
  runFile(rollbackSql(String(id)));
  console.log(`Batch ${id} removed from the ${real ? "REAL" : "local"} database.`);
  process.exit(0);
}

const DIR = "imports/sheet";
const files = readdirSync(DIR);
const read = (tab) => {
  const file = files.find((f) => f.toLowerCase().endsWith(`- ${tab.toLowerCase()}.csv`) || f.toLowerCase() === `${tab.toLowerCase()}.csv`);
  if (!file) throw new Error(`Missing the CSV for the "${tab}" tab in ${DIR}.`);
  return readFileSync(join(DIR, file), "utf8");
};
const result = analyze({ admin: read("Admin Pannel 1"), old: read("Tuition Admin Panel"), registration: read("Registration"), application: read("Application") });
const now = Math.floor(Date.now() / 1000); // the time is the batch id: always new, always larger

if (args.includes("--add-only")) {
  backup();
  runFile(buildAddOnlySql(result, now, now).sql);
} else {
  // A full load replaces earlier imports. On the real database that would wipe the owner's review, so it runs once.
  if (real) {
    const [{ n }] = query("SELECT count(*) AS n FROM import_batches WHERE status = 'committed'");
    if (n > 0) {
      console.error("The real database already has an import. Use the top-up (npm run import:top-up-real) instead.");
      process.exit(1);
    }
  }
  backup();
  runFile([...(real ? [] : rollbackSql()), ...buildLoadSql(result, now, now).sql]);
}
console.log(JSON.stringify({ batch: now, ...query(batchCountsSql(now))[0] }, null, 2));
console.log(`\nSaved to the ${real ? "REAL" : "LOCAL"} database. Undo with --undo-batch ${now}.`);
