// Trial import: changes no database. Put the CSV downloads of the sheet's tabs in imports/sheet/, then:
//   npm run import:dry-run
// Prints counts only. The clean records go to imports/sheet-normalized.json (gitignored); don't share that file.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { analyze } from "./sheet.mjs";

const DIR = "imports/sheet";
const TABS = { admin: "Admin Pannel 1", old: "Tuition Admin Panel", registration: "Registration", application: "Application" };

if (!existsSync(DIR)) {
  console.error(`Folder ${DIR} not found. Download these tabs as CSV into it: ${Object.values(TABS).join(", ")}.`);
  process.exit(1);
}

const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".csv"));
const tabs = {};
for (const [key, tab] of Object.entries(TABS)) {
  // Google names a download "<sheet name> - <tab>.csv". "Form Application" must not count as "Application".
  const file = files.find((f) => f.toLowerCase().endsWith(`- ${tab.toLowerCase()}.csv`) || f.toLowerCase() === `${tab.toLowerCase()}.csv`);
  if (!file) {
    console.error(`Missing the CSV for the "${tab}" tab in ${DIR}.`);
    process.exit(1);
  }
  tabs[key] = readFileSync(join(DIR, file), "utf8");
}

const { report, ...records } = analyze(tabs);
writeFileSync("imports/sheet-normalized.json", JSON.stringify(records));
writeFileSync("imports/sheet-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log("\nNothing was changed in any database.");
