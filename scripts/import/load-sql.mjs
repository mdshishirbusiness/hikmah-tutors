// Turns analyze()'s result into SQL for one import batch. Pure: reads nothing, writes nothing.
// Rows the database can't hold yet wait in import_rows. Flagged tutors are imported and also listed there, under the
// tab "tutor_flag", for the owner's review list. Nothing becomes public.

const q = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return `'${String(v).replaceAll("'", "''")}'`;
};
const insert = (table, row, verb = "INSERT") => `${verb} INTO ${table} (${Object.keys(row).join(", ")}) VALUES (${Object.values(row).map(q).join(", ")});`;
/** INSERT … SELECT, so a row goes in only when `when` holds. A value wrapped in sqlExpr() is written as SQL. */
const sqlExpr = (text) => ({ sql: text });
const val = (v) => (v && typeof v === "object" && "sql" in v ? v.sql : q(v));
const insertWhen = (table, row, when, verb = "INSERT") =>
  `${verb} INTO ${table} (${Object.keys(row).join(", ")}) SELECT ${Object.values(row).map(val).join(", ")} WHERE ${when};`;

const MEDIUMS = [[/বাংলা/, "bangla"], [/english version/i, "ev"], [/english medium/i, "em"], [/মাদ্রাসা|madrasa/i, "madrasa"]];
export const mediumKeys = (s) => MEDIUMS.filter(([re]) => re.test(s ?? "")).map(([, key]) => key).join(",") || null;

/** Removes an earlier batch from the real tables. The batch row stays as a record. */
export function rollbackSql(batchFilter = "SELECT id FROM import_batches WHERE status = 'committed'") {
  return [
    `DELETE FROM placements WHERE import_batch_id IN (${batchFilter});`,
    `DELETE FROM applications WHERE import_batch_id IN (${batchFilter});`,
    `DELETE FROM tuition_private WHERE tuition_code IN (SELECT code FROM tuitions WHERE import_batch_id IN (${batchFilter}));`,
    `DELETE FROM tuitions WHERE import_batch_id IN (${batchFilter});`,
    `DELETE FROM guardians WHERE import_batch_id IN (${batchFilter}) AND id NOT IN (SELECT guardian_id FROM leads WHERE guardian_id IS NOT NULL);`,
    `DELETE FROM tutor_statements WHERE tutor_id IN (SELECT id FROM tutors WHERE import_batch_id IN (${batchFilter}));`,
    `DELETE FROM tutor_subjects WHERE tutor_id IN (SELECT id FROM tutors WHERE import_batch_id IN (${batchFilter}));`,
    `DELETE FROM tutors WHERE import_batch_id IN (${batchFilter});`,
    `DELETE FROM import_rows WHERE batch_id IN (${batchFilter});`,
    `UPDATE import_batches SET status = 'rolled_back' WHERE id IN (${batchFilter});`,
  ];
}

export function buildLoadSql({ tutors, tuitions, applications, placements, report }, batchId, now) {
  const sql = [];
  const counts = { tutors: 0, tutorSubjects: 0, statements: 0, guardians: 0, tuitions: 0, applications: 0, placements: 0, flaggedTutors: 0, held: { tutors: 0, tuitions: 0, applications: 0, placements: 0 }, applicationsMergedSameTutor: 0 };
  const batch = { import_batch_id: batchId };
  const stamps = { created_at: now, updated_at: now };
  sql.push(insert("import_batches", { id: batchId, source: "mastersheet", status: "committed", report_json: JSON.stringify(report), created_at: now, committed_at: now }));

  const hold = (tab, rowNo, legacyRef, record, issues) => sql.push(insert("import_rows", { batch_id: batchId, tab, row_no: rowNo, legacy_ref: String(legacyRef), raw_json: JSON.stringify(record), issues: issues.join(","), status: "needs_review" }));

  // Tutors first: their id is their sheet code, so applications can point at it directly.
  for (const t of tutors) {
    if (t.needsReview) {
      counts.held.tutors++;
      hold("registration", t.rowNo, t.code, { tutor: t.tutor, subjects: t.subjects, statements: t.statements }, t.issues);
      continue;
    }
    sql.push(insert("tutors", { id: t.code, code: t.code, created_via: "import", ...t.tutor, mediums: mediumKeys(t.tutor.mediums), ...batch, ...stamps }));
    counts.tutors++;
    if (t.flagged) {
      hold("tutor_flag", t.rowNo, t.code, { tutor_code: t.code }, t.issues);
      counts.flaggedTutors++;
    }
    for (const s of t.subjects) {
      sql.push(`INSERT OR IGNORE INTO tutor_subjects (tutor_id, band, subject) VALUES (${t.code}, ${q(s.band)}, ${q(s.subject)});`);
      counts.tutorSubjects++;
    }
    for (const s of t.statements) {
      sql.push(insert("tutor_statements", { tutor_id: t.code, kind: s.kind, body: s.body }));
      counts.statements++;
    }
  }

  const ready = new Map();
  const guardianIds = new Map();
  for (const t of tuitions) {
    if (t.needsReview) {
      counts.held.tuitions++;
      hold(t.tab, t.rowNo, t.code, { tuition: t.tuition, private: t.private, guardianPhone: t.guardianPhone, selected: t.selected }, t.issues);
      continue;
    }
    ready.set(t.code, t);
    let guardianId = null;
    if (t.guardianPhone) {
      guardianId = guardianIds.get(t.guardianPhone);
      if (!guardianId) {
        guardianId = guardianIds.size + 1;
        guardianIds.set(t.guardianPhone, guardianId);
        sql.push(insert("guardians", { id: guardianId, phone: t.guardianPhone, created_at: now, ...batch }));
        counts.guardians++;
      }
    }
    const { subjects, ...tu } = t.tuition;
    // The sheet has no medium column; '' means "not known yet" and is set when a tuition is reviewed.
    sql.push(insert("tuitions", { code: t.code, ...tu, medium: "", subjects: subjects.join(","), mode: "home", salary_period: "per_month", ...batch }));
    const { raw, ...priv } = t.private;
    sql.push(insert("tuition_private", { tuition_code: t.code, guardian_id: guardianId, ...priv, raw_json: JSON.stringify(raw), ...stamps }));
    counts.tuitions++;
  }

  const selectedPhone = new Map(placements.map((p) => [p.tuition_code, p.legacy_tutor_phone]));
  const usedPair = new Set();
  const applicationIds = new Set();
  for (const a of applications) {
    const t = ready.get(a.tuition_code);
    if (!t) {
      counts.held.applications++;
      hold("application", a.rowNo, a.tuition_code, a, ["tuition_on_hold"]);
      continue;
    }
    // Two numbers of one tutor can apply to the same tuition; a tutor gets one application per tuition.
    if (a.tutor_code !== null) {
      const pair = `${a.tuition_code}|${a.tutor_code}`;
      if (usedPair.has(pair)) { counts.applicationsMergedSameTutor++; continue; }
      usedPair.add(pair);
    }
    const isSelected = a.applicant_phone && selectedPhone.get(a.tuition_code) === a.applicant_phone;
    const closed = t.tuition.status === "booked" || t.tuition.status === "cancelled" || t.tuition.status === "closed";
    // Shortlisted, not confirmed: the sheet doesn't prove the placement was confirmed.
    const status = isSelected ? "shortlisted" : closed ? "opportunity_closed" : "submitted";
    const { rowNo, tutor_code, created_at, ...fields } = a;
    sql.push(insert("applications", { id: rowNo, tutor_id: tutor_code, ...fields, status, source: "sheet_form", ...batch, created_at, updated_at: created_at }));
    applicationIds.add(rowNo);
    counts.applications++;
  }

  for (const p of placements) {
    if (!ready.has(p.tuition_code)) {
      counts.held.placements++;
      hold("placement", 0, p.tuition_code, p, ["tuition_on_hold"]);
      continue;
    }
    const { tutor_code, application_row, ...fields } = p;
    sql.push(insert("placements", { tutor_id: tutor_code, application_id: applicationIds.has(application_row) ? application_row : null, ...fields, ...batch, ...stamps }));
    counts.placements++;
  }

  sql.push(insert("audit_log", { action: "import_committed", entity_type: "import_batch", entity_id: String(batchId), meta_json: JSON.stringify(counts), created_at: now }));
  return { sql, counts };
}

/**
 * Top-up import (owner, 2026-11-03): adds only what the database doesn't have yet, so the owner's review and edits are
 * never overwritten. Tutors and tuitions are matched by code, applications by tuition + phone + time. A tuition already
 * in the database keeps its status even if the sheet changed it: once loaded, the app is where status is kept.
 * Children (subjects, statements, private details, placements) go in only for parents this batch created.
 * What a top-up really added is counted afterwards with batchCountsSql, not here.
 */
export function buildAddOnlySql({ tutors, tuitions, applications, placements, report }, batchId, now) {
  const sql = [];
  const batch = { import_batch_id: batchId };
  const stamps = { created_at: now, updated_at: now };
  const newTutor = (code) => `EXISTS (SELECT 1 FROM tutors WHERE id = ${q(code)} AND import_batch_id = ${batchId})`;
  const newTuition = (code) => `EXISTS (SELECT 1 FROM tuitions WHERE code = ${q(code)} AND import_batch_id = ${batchId})`;
  const tutorRef = (code) => (code === null ? null : sqlExpr(`(SELECT id FROM tutors WHERE id = ${q(code)})`)); // a held tutor links nobody
  sql.push(insert("import_batches", { id: batchId, source: "mastersheet_top_up", status: "committed", report_json: JSON.stringify(report), created_at: now, committed_at: now }));

  // A held row is listed once, however many top-ups see it.
  const hold = (tab, rowNo, legacyRef, record, issues, also) => sql.push(insertWhen("import_rows",
    { batch_id: batchId, tab, row_no: rowNo, legacy_ref: String(legacyRef), raw_json: JSON.stringify(record), issues: issues.join(","), status: "needs_review" },
    `NOT EXISTS (SELECT 1 FROM import_rows WHERE tab = ${q(tab)} AND legacy_ref = ${q(String(legacyRef))} AND status = 'needs_review') AND ${also}`));

  for (const t of tutors) {
    if (t.needsReview) {
      hold("registration", t.rowNo, t.code, { tutor: t.tutor, subjects: t.subjects, statements: t.statements }, t.issues, `NOT EXISTS (SELECT 1 FROM tutors WHERE code = ${q(t.code)})`);
      continue;
    }
    // OR IGNORE: a code or email already in use means this tutor is already here.
    sql.push(insert("tutors", { id: t.code, code: t.code, created_via: "import", ...t.tutor, mediums: mediumKeys(t.tutor.mediums), ...batch, ...stamps }, "INSERT OR IGNORE"));
    for (const x of t.subjects) sql.push(insertWhen("tutor_subjects", { tutor_id: t.code, band: x.band, subject: x.subject }, newTutor(t.code), "INSERT OR IGNORE"));
    for (const x of t.statements) sql.push(insertWhen("tutor_statements", { tutor_id: t.code, kind: x.kind, body: x.body }, newTutor(t.code)));
    if (t.flagged) hold("tutor_flag", t.rowNo, t.code, { tutor_code: t.code }, t.issues, newTutor(t.code));
  }

  const held = new Set();
  for (const t of tuitions) {
    if (t.needsReview) {
      held.add(t.code);
      hold(t.tab, t.rowNo, t.code, { tuition: t.tuition, private: t.private, guardianPhone: t.guardianPhone, selected: t.selected }, t.issues, `NOT EXISTS (SELECT 1 FROM tuitions WHERE code = ${q(t.code)})`);
      continue;
    }
    const { subjects, ...tu } = t.tuition;
    sql.push(insert("tuitions", { code: t.code, ...tu, medium: "", subjects: subjects.join(","), mode: "home", salary_period: "per_month", ...batch }, "INSERT OR IGNORE"));
    if (t.guardianPhone) sql.push(insertWhen("guardians", { phone: t.guardianPhone, created_at: now, ...batch }, newTuition(t.code), "INSERT OR IGNORE"));
    const { raw, ...priv } = t.private;
    const guardianId = t.guardianPhone ? sqlExpr(`(SELECT id FROM guardians WHERE phone = ${q(t.guardianPhone)})`) : null;
    sql.push(insertWhen("tuition_private", { tuition_code: t.code, guardian_id: guardianId, ...priv, raw_json: JSON.stringify(raw), ...stamps }, newTuition(t.code)));
  }

  const selectedPhone = new Map(placements.map((p) => [p.tuition_code, p.legacy_tutor_phone]));
  for (const a of applications) {
    if (held.has(a.tuition_code)) {
      hold("application", a.rowNo, a.tuition_code, a, ["tuition_on_hold"], `NOT EXISTS (SELECT 1 FROM tuitions WHERE code = ${q(a.tuition_code)})`);
      continue;
    }
    const isSelected = a.applicant_phone && selectedPhone.get(a.tuition_code) === a.applicant_phone;
    const status = isSelected
      ? "shortlisted"
      : sqlExpr(`CASE WHEN (SELECT status FROM tuitions WHERE code = ${q(a.tuition_code)}) IN ('booked', 'cancelled', 'closed') THEN 'opportunity_closed' ELSE 'submitted' END`);
    const { rowNo: _row, tutor_code, created_at, ...fields } = a;
    // Already here: the same row, or the same tutor on this tuition from another number (as buildLoadSql merges).
    const same = `tuition_code = ${q(a.tuition_code)} AND (applicant_phone IS ${q(a.applicant_phone)} AND created_at = ${q(created_at)}` +
      (tutor_code === null ? ")" : ` OR tutor_id = ${q(tutor_code)})`);
    // OR IGNORE: one live application per tutor per tuition.
    sql.push(insertWhen("applications", { tutor_id: tutorRef(tutor_code), ...fields, status, source: "sheet_form", ...batch, created_at, updated_at: created_at },
      `EXISTS (SELECT 1 FROM tuitions WHERE code = ${q(a.tuition_code)}) AND NOT EXISTS (SELECT 1 FROM applications WHERE ${same})`, "INSERT OR IGNORE"));
  }

  for (const p of placements) {
    if (held.has(p.tuition_code)) continue; // waits with its tuition
    const { tutor_code, application_row: _row, ...fields } = p;
    const appId = p.legacy_tutor_phone
      ? sqlExpr(`(SELECT id FROM applications WHERE tuition_code = ${q(p.tuition_code)} AND applicant_phone = ${q(p.legacy_tutor_phone)} ORDER BY created_at LIMIT 1)`)
      : null;
    sql.push(insertWhen("placements", { tutor_id: tutorRef(tutor_code), application_id: appId, ...fields, ...batch, ...stamps },
      `${newTuition(p.tuition_code)} AND NOT EXISTS (SELECT 1 FROM placements WHERE tuition_code = ${q(p.tuition_code)})`, "INSERT OR IGNORE"));
  }

  sql.push(insert("audit_log", { action: "import_top_up", entity_type: "import_batch", entity_id: String(batchId), meta_json: "{}", created_at: now }));
  return { sql };
}

/** What one batch actually added, read back from the database after it ran. */
export const batchCountsSql = (batchId) => `SELECT
  (SELECT count(*) FROM tutors WHERE import_batch_id = ${batchId}) AS tutors,
  (SELECT count(*) FROM tuitions WHERE import_batch_id = ${batchId}) AS tuitions,
  (SELECT count(*) FROM guardians WHERE import_batch_id = ${batchId}) AS guardians,
  (SELECT count(*) FROM applications WHERE import_batch_id = ${batchId}) AS applications,
  (SELECT count(*) FROM placements WHERE import_batch_id = ${batchId}) AS placements,
  (SELECT count(*) FROM import_rows WHERE batch_id = ${batchId} AND tab = 'tutor_flag') AS flagged_tutors,
  (SELECT count(*) FROM import_rows WHERE batch_id = ${batchId} AND tab <> 'tutor_flag') AS held`;
