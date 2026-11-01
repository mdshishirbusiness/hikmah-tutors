// Turns analyze()'s result into SQL for one import batch. Pure: reads nothing, writes nothing.
// Rows that need review don't reach the real tables; they wait in import_rows. Nothing becomes public.

const q = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return `'${String(v).replaceAll("'", "''")}'`;
};
const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(", ")}) VALUES (${Object.values(row).map(q).join(", ")});`;

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
    `UPDATE import_batches SET status = 'rolled_back' WHERE status = 'committed';`,
  ];
}

export function buildLoadSql({ tutors, tuitions, applications, placements, report }, batchId, now) {
  const sql = [];
  const counts = { tutors: 0, tutorSubjects: 0, statements: 0, guardians: 0, tuitions: 0, applications: 0, placements: 0, held: { tutors: 0, tuitions: 0, applications: 0, placements: 0 }, applicationsMergedSameTutor: 0 };
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
    const closed = t.tuition.status === "booked" || t.tuition.status === "cancelled";
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
