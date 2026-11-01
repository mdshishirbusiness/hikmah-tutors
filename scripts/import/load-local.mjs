// Saves the sheet into the LOCAL database, replacing any earlier batch. Run the trial first (npm run import:dry-run).
//   npm run import:load-local            save
//   npm run import:load-local -- --undo  remove the imported records
// Only ever uses --local. Loading the real database is a separate step for after login and the owner's sign-off.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { analyze } from "./sheet.mjs";
import { buildLoadSql, rollbackSql } from "./load-sql.mjs";

const SQL_FILE = "imports/sheet-load.sql";

function runLocal(file) {
  execFileSync("npx", ["wrangler", "d1", "execute", "hikmah", "--local", `--file=${file}`], { stdio: ["ignore", "ignore", "inherit"], shell: true });
}

if (process.argv.includes("--undo")) {
  writeFileSync(SQL_FILE, rollbackSql().join("\n"));
  runLocal(SQL_FILE);
  rmSync(SQL_FILE);
  console.log("Imported records removed from the local database.");
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

const now = Math.floor(Date.now() / 1000);
const { sql, counts } = buildLoadSql(result, now, now); // the time is the batch id: always new, always larger
writeFileSync(SQL_FILE, [...rollbackSql(), ...sql].join("\n"));
try {
  runLocal(SQL_FILE);
} finally {
  rmSync(SQL_FILE); // holds real personal data
}
console.log(JSON.stringify(counts, null, 2));
console.log("\nSaved to the LOCAL database only.");
