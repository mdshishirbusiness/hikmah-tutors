// Copies each tutor's photo and verification document out of the Google Form's upload folder into two folders named
// by tutor code, so the site's photo upload (scripts/photos/upload.mjs) can match them. Plan: docs/DECISIONS.md,
// 2026-11-03.
//
// How to run (once, as the owner):
//   1. Open the Mastersheet → Extensions → Apps Script. Paste this file into a new script file and save.
//   2. Choose copyTutorFiles in the toolbar and press Run. Allow Drive and Sheets access when Google asks.
//   3. It stops before Google's 6-minute limit and starts itself again a minute later until every row is done. The
//      log (Executions) shows the counts. Running it again is safe: files already copied are skipped.
//   4. When it says "Done", download the "Hikmah tutor photos" folder from Drive (right click → Download) and unzip it
//      into imports/photos/ on the computer.
//
// Both folders stay private in the owner's Drive. Documents are never downloaded or uploaded anywhere for now.

const PHOTO_FOLDER = "Hikmah tutor photos";
const DOC_FOLDER = "Hikmah tutor documents (private)";
const TAB = "Registration";
const FIRST_DATA_ROW = 3; // row 1 is the group heading, row 2 the column names
const COL = { code: 1, photo: 5, document: 6 }; // A: Tutor, E: Professional Profile Photo, F: Verification Document
const STOP_AFTER_MS = 5 * 60 * 1000;
const BACKUP_AFTER_MS = 8 * 60 * 1000; // longer than one run, so it only fires if a run dies
const SAVE_EVERY = 20; // rows between progress saves
const RESUME_HANDLER = "copyTutorFiles";

function copyTutorFiles() {
  const started = Date.now();
  // One run at a time, and a backup restart booked before any work: if Google stops this run with a server error,
  // the backup picks up where the last saved row was (2026-11-03: a run died that way and the chain stopped).
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  resumeSoon_(BACKUP_AFTER_MS);
  const props = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB);
  if (!sheet) throw new Error(`No tab named "${TAB}".`);
  const photos = folder_(PHOTO_FOLDER);
  const docs = folder_(DOC_FOLDER);
  const have = { photo: names_(photos), doc: names_(docs) };

  const last = sheet.getLastRow();
  const rows = sheet.getRange(FIRST_DATA_ROW, 1, Math.max(last - FIRST_DATA_ROW + 1, 0), COL.document).getValues();
  let row = Number(props.getProperty("nextRow") || 0);
  const counts = JSON.parse(props.getProperty("counts") || '{"photos":0,"documents":0,"skipped":0,"unreadable":0}');

  for (; row < rows.length; row++) {
    if (row % SAVE_EVERY === 0) save_(props, row, counts);
    if (Date.now() - started > STOP_AFTER_MS) {
      save_(props, row, counts);
      resumeSoon_(60 * 1000);
      console.log(`Paused at sheet row ${row + FIRST_DATA_ROW}; continuing in a minute. So far: ${JSON.stringify(counts)}`);
      lock.releaseLock();
      return;
    }
    const code = String(rows[row][COL.code - 1]).trim();
    if (!/^\d+$/.test(code)) continue;
    copyAll_(rows[row][COL.photo - 1], `T${code}`, photos, have.photo, counts, "photos");
    copyAll_(rows[row][COL.document - 1], `T${code}-doc`, docs, have.doc, counts, "documents");
  }

  props.deleteAllProperties();
  stopResuming_();
  console.log(`Done. ${JSON.stringify(counts)}`);
  lock.releaseLock();
}

function save_(props, row, counts) {
  props.setProperty("nextRow", String(row));
  props.setProperty("counts", JSON.stringify(counts));
}

/** A cell can hold several links (some tutors uploaded more than one document): -1, -2 … after the first. */
function copyAll_(cell, base, folder, have, counts, kind) {
  const ids = String(cell || "").match(/[-\w]{25,}/g) || [];
  ids.forEach((id, i) => {
    const stem = i ? `${base}-${i + 1}` : base;
    if (have.has(stem)) { counts.skipped++; return; }
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const file = DriveApp.getFileById(id);
        const ext = (file.getName().match(/\.[A-Za-z0-9]{2,5}$/) || [""])[0].toLowerCase();
        file.makeCopy(stem + ext, folder);
        have.add(stem);
        counts[kind]++;
        return;
      } catch (e) {
        if (attempt === 1) Utilities.sleep(2000); // Google's "server error" usually passes on a retry
      }
    }
    counts.unreadable++; // deleted, not shared with this account, or Google kept failing; a re-run tries again
  });
}

function folder_(name) {
  const found = DriveApp.getFoldersByName(name);
  return found.hasNext() ? found.next() : DriveApp.createFolder(name);
}

/** File names without extension already in a folder, so a re-run skips them. */
function names_(folder) {
  const out = new Set();
  const files = folder.getFiles();
  while (files.hasNext()) out.add(files.next().getName().replace(/\.[^.]+$/, ""));
  return out;
}

function resumeSoon_(ms) {
  stopResuming_();
  ScriptApp.newTrigger(RESUME_HANDLER).timeBased().after(ms).create();
}

function stopResuming_() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === RESUME_HANDLER).forEach((t) => ScriptApp.deleteTrigger(t));
}
