// Synthetic data only. Runs the real migrations and import SQL on an in-memory SQLite database.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { buildAddOnlySql, buildLoadSql } from "./load-sql.mjs";

function freshDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const f of readdirSync("migrations").filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(`migrations/${f}`, "utf8"));
  return db;
}
const run = (db, sql) => db.exec(sql.join("\n"));
const one = (db, sql) => db.prepare(sql).get();

const tutor = (code, phone) => ({
  code, rowNo: code, needsReview: false, flagged: false, issues: [],
  tutor: { email: `t${code}@example.com`, full_name: `Test Tutor ${code}`, gender: "male", phone, alt_phone: null, mediums: "বাংলা মাধ্যম", priority: "standard" },
  subjects: [{ band: "ssc", subject: "math" }], statements: [{ kind: "ssc_strategy", body: "patient" }],
});
const tuition = (code, status) => ({
  code, tab: "admin", rowNo: code, needsReview: false, issues: [], guardianPhone: "01711000001", selected: null,
  tuition: { status, is_public: 0, accepting_applications: 0, class_level: "class-9", subjects: ["math"], area: "kazla", days_per_week: 3, salary_kind: "fixed", salary_amount: 4000, student_gender: null, tutor_gender_pref: "any", requirements_public: "", posted_at: 1 },
  private: { guardian_label: "Sir", exact_address: "x", lead_source: "call", private_notes: null, tutor_qualification: null, raw: {} },
});
const app = (rowNo, code, tutorCode, phone, at) => ({ rowNo, tuition_code: code, tutor_code: tutorCode, applicant_name: "A", applicant_phone: phone, applicant_gender: "male", applicant_shortcode: null, applicant_location: null, note: null, fee_plan: "standard", created_at: at });

const first = {
  report: {}, placements: [],
  tutors: [tutor(1001, "01811000001")],
  tuitions: [tuition(945, "available")],
  applications: [app(2, 945, 1001, "01811000001", 10)],
};

test("a top-up adds only what is new and keeps the owner's edits", () => {
  const db = freshDb();
  run(db, buildLoadSql(first, 100, 100).sql);
  // The owner reviews the tuition and edits the tutor.
  db.exec("UPDATE tuitions SET requirements_public = 'reviewed', medium = 'bangla', class_level = 'ssc-27' WHERE code = 945;");
  db.exec("UPDATE tutors SET full_name = 'Fixed Name' WHERE code = 1001;");

  const later = {
    ...first,
    tutors: [...first.tutors, tutor(1002, "01811000002")],
    tuitions: [...first.tuitions, tuition(946, "available")],
    applications: [...first.applications, app(3, 945, 1002, "01811000002", 20), app(4, 946, 1001, "01811000001", 30)],
  };
  run(db, buildAddOnlySql(later, 200, 200).sql);
  run(db, buildAddOnlySql(later, 300, 300).sql); // the same sheet again adds nothing

  assert.equal(one(db, "SELECT count(*) n FROM tutors").n, 2);
  assert.equal(one(db, "SELECT full_name FROM tutors WHERE code = 1001").full_name, "Fixed Name");
  assert.equal(one(db, "SELECT requirements_public r FROM tuitions WHERE code = 945").r, "reviewed");
  assert.equal(one(db, "SELECT count(*) n FROM tuitions WHERE import_batch_id = 200").n, 1);
  assert.equal(one(db, "SELECT count(*) n FROM applications").n, 3);
  assert.equal(one(db, "SELECT count(*) n FROM applications WHERE import_batch_id = 300").n, 0);
  assert.equal(one(db, "SELECT count(*) n FROM tutor_subjects WHERE tutor_id = 1002").n, 1);
  assert.equal(one(db, "SELECT count(*) n FROM tutor_statements WHERE tutor_id = 1001").n, 1);
  assert.equal(one(db, "SELECT count(*) n FROM guardians").n, 1);
  assert.equal(one(db, "SELECT guardian_id g FROM tuition_private WHERE tuition_code = 946").g, 1);
});
