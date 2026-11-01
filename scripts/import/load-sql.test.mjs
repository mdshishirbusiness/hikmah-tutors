// Synthetic data only. Every value is invented.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLoadSql, mediumKeys, rollbackSql } from "./load-sql.mjs";

const MARKER = "SYNTHETIC-PRIVATE-MARKER-9001";
const tutor = (code, needsReview = false) => ({
  code, rowNo: code, needsReview, issues: needsReview ? ["tutor_phone_repeated"] : [],
  tutor: { email: `t${code}@example.com`, full_name: "O'Brien Test", gender: "male", phone: "01811000001", alt_phone: null, mediums: "বাংলা মাধ্যম, English Version", priority: "standard" },
  subjects: [{ band: "ssc", subject: "math" }], statements: [{ kind: "ssc_strategy", body: "It's patient" }],
});
const tuition = (code, status, needsReview = false) => ({
  code, tab: "admin", rowNo: code, needsReview, issues: needsReview ? ["area_unknown"] : [], guardianPhone: "01711000001", selected: null,
  tuition: { status, is_public: 0, accepting_applications: 0, class_level: "ssc", subjects: ["math", "physics"], area: "kazla", days_per_week: 3, salary_kind: "fixed", salary_amount: 4000, student_gender: null, tutor_gender_pref: "any", requirements_public: "", posted_at: 1 },
  private: { guardian_label: "Sir", exact_address: MARKER, lead_source: "call", private_notes: MARKER, tutor_qualification: null, raw: { location: MARKER } },
});
const app = (rowNo, code, tutorCode, phone) => ({ rowNo, tuition_code: code, tutor_code: tutorCode, applicant_name: "A", applicant_phone: phone, applicant_gender: "male", applicant_shortcode: null, applicant_location: null, note: null, fee_plan: "early", created_at: 5 });

const input = {
  report: {},
  tutors: [tutor(1001), tutor(1002, true)],
  tuitions: [tuition(501, "booked"), tuition(502, "available"), tuition(503, "available", true)],
  applications: [app(2, 501, 1001, "01811000001"), app(3, 501, null, "01899000009"), app(4, 502, 1001, "01811000001"), app(5, 502, 1001, "01811000002"), app(6, 503, 1001, "01811000001")],
  placements: [{ tuition_code: 501, tutor_code: 1001, legacy_tutor_name: "O'Brien", legacy_tutor_phone: "01811000001", application_row: 2, status: "selected" }, { tuition_code: 503, tutor_code: null, legacy_tutor_name: "X", legacy_tutor_phone: null, application_row: null, status: "selected" }],
};
const { sql, counts } = buildLoadSql(input, 7, 100);
const of = (table) => sql.filter((s) => s.startsWith(`INSERT INTO ${table} `));

test("rows on hold wait in import_rows, including what depends on them", () => {
  assert.equal(counts.tutors, 1);
  assert.equal(counts.tuitions, 2);
  assert.deepEqual(counts.held, { tutors: 1, tuitions: 1, applications: 1, placements: 1 });
  assert.equal(of("import_rows").length, 4);
  assert.ok(!of("tuitions").some((s) => s.includes("503")));
});

test("imported tuitions stay hidden and private text stays private", () => {
  for (const s of of("tuitions")) {
    assert.ok(!s.includes(MARKER));
    assert.match(s, /VALUES \(\d+, '\w+', 0, 0,/);
  }
  assert.ok(of("tuition_private").every((s) => s.includes(MARKER)));
});

test("one guardian, many tuitions", () => {
  assert.equal(of("guardians").length, 1);
});

test("application status never overstates what the sheet proves", () => {
  const apps = of("applications").join("\n");
  assert.equal(counts.applications, 3);
  assert.match(of("applications")[0], /'shortlisted'/);
  assert.match(of("applications")[1], /'opportunity_closed'/);
  assert.match(of("applications")[2], /'submitted'/);
  assert.ok(!apps.includes("'confirmed'"));
  assert.equal(counts.applicationsMergedSameTutor, 1);
  assert.match(of("placements")[0], /'selected'/);
});

test("quotes are escaped", () => {
  assert.ok(of("tutors")[0].includes("O''Brien Test"));
  assert.ok(of("tutor_statements")[0].includes("It''s patient"));
});

test("mediums become keys", () => {
  assert.equal(mediumKeys("বাংলা মাধ্যম, English Version"), "bangla,ev");
  assert.equal(mediumKeys(""), null);
});

test("undo reaches every table it filled, children first", () => {
  const undo = rollbackSql().join("\n");
  for (const table of ["placements", "applications", "tuition_private", "tuitions", "guardians", "tutor_statements", "tutor_subjects", "tutors", "import_rows"]) assert.ok(undo.includes(`DELETE FROM ${table} `), table);
  assert.ok(undo.indexOf("DELETE FROM applications") < undo.indexOf("DELETE FROM tuitions"));
  assert.ok(undo.indexOf("DELETE FROM tutor_subjects") < undo.indexOf("DELETE FROM tutors"));
});
