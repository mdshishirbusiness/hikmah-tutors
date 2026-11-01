// Synthetic data only. Every name, number and address here is invented (PRD T-DATA-08: seeded problems must be reported).
import assert from "node:assert/strict";
import { test } from "node:test";
import { analyze, normPhone, parseArea, parseClass, parseDate, parseSalary, parseSubjects } from "./sheet.mjs";

const cells = (map, width) => Array.from({ length: width }, (_, i) => map[i] ?? "");
const csv = (rows) => rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");

const PRIVATE_MARKER = "SYNTHETIC-PRIVATE-MARKER-9001";
const admin = (m) => cells(m, 23);
const old = (m) => cells(m, 30);
const reg = (m) => cells(m, 54);

const ADMIN_HEAD = admin({ 0: "Code", 1: "Status", 3: "Number", 5: "Student Details", 13: "Tutor Requirements", 19: "Tutor Number", 21: "Post Date" });
const ADMIN_SUB = admin({ 9: "Salary", 10: "Location", 11: "Full Address", 13: "Tutor Gender" });
const OLD_HEAD = old({ 2: "Tuition Status" });
const OLD_SUB = old({ 4: "Class", 5: "Subject(s)", 8: "Salary", 10: "Tutor Gender", 13: "Lead Source", 15: "Contact", 16: "Location Area", 18: "Full Address", 21: "Selected Tutor", 22: "Tutor Phone" });
const REG_HEAD = reg({ 0: "Tutor", 7: "Email Address", 8: "Gender", 13: "Contact Number (WhatsApp Number)", 37: "Current Location", 42: "Priority", 48: "Timestamp" });
const APP_HEAD = cells({ 0: "Timestamp", 1: "Tutor Code (Optional)", 2: "Gender", 4: "Full Name", 6: "Contact Number (Whatsapp)", 9: "Commission Payment Policy" }, 12);

const tutor = (code, phone, email) => reg({ 0: code, 7: email, 8: "Male", 9: `Test Tutor ${code}`, 10: "University of Rajshahi", 13: phone, 25: "All Subjects", 28: "Math, Physics", 31: "Not Interested", 37: "Kazla", 42: "🟢 Standard", 44: "Yes. (হ্যাঁ, রাজি)", 45: "🚲 Yes, I have a Bicycle", 47: "I Agree to the Terms", 48: "1/15/2026 10:00:00", 40: "B+", 41: "1/1/2000", 43: "private situation" });
const app = (ts, code, phone, policy = "মোট ৬০% পরিশোধ করব") => cells({ 0: ts, 2: "Male", 3: code, 4: "Applicant", 5: "RU-CSE", 6: phone, 7: "note", 8: "Kazla", 9: policy }, 12);

const tabs = {
  admin: csv([
    ADMIN_HEAD, ADMIN_SUB,
    admin({ 0: 501, 1: "Booked", 2: "Sir", 3: "01711-000001", 4: "Whatsapp", 5: "Class 9", 6: "Math, Physics", 7: "3 days", 9: "4,000৳", 10: "Uposhohor (উপশহর)", 11: PRIVATE_MARKER, 12: "Female Student", 13: "Female Tutor", 15: PRIVATE_MARKER, 17: "Test Tutor 1001", 19: "01811-000001" }),
    admin({ 0: 502, 1: "Available", 3: "01711-000001", 5: "hsc 27", 6: "Chemistry", 7: "3/4 days", 9: "4000/4500", 10: "Somewhere Unknown", 13: "Male Tutor" }),
    admin({ 0: 503, 1: "", 3: "" }),
    admin({ 0: 504, 1: "Cancelled", 5: "Class 2", 6: "All", 7: "4 days", 9: "1,500৳", 10: "Kazla (কাজলা)", 13: "Any Tutor" }),
    admin({ 0: 504, 1: "Available", 3: "01711-000002", 5: "Class 2", 6: "All", 7: "4 days", 9: "Negotiable", 10: "Kazla", 13: "Any Tutor" }),
  ]),
  old: csv([
    OLD_HEAD, OLD_SUB,
    old({ 0: 301, 2: "Tutor Selected", 4: "Class 7", 5: "English", 6: "3 Days", 8: "3,000৳", 10: "Male Tutor", 13: "Call", 15: "01711-000003", 16: "Vodra", 18: PRIVATE_MARKER, 21: "Old Name" }),
    old({ 0: 501, 2: "Booked", 4: "Class 9", 5: "Math", 6: "3 Days", 8: "4,000৳", 10: "Any", 15: "01711-000001", 16: "Kazla" }),
  ]),
  registration: csv([
    REG_HEAD,
    tutor(1001, "01811-000001", "Tutor.One@gmail.com"),
    tutor(1002, "01811-000002", "dup@gmail.com"),
    tutor(1003, "01811-000003", "dup@gmail.com"),
    tutor(1004, "01811-000004", "tutor4@example.edu"),
    tutor(1005, "not a phone", "tutor5@gmail.com"),
    reg({ 0: 1006 }),
  ]),
  application: csv([
    APP_HEAD,
    app("1/20/2026 10:00:00", 501, "01811-000001"),
    app("1/20/2026 11:00:00", 501, "01811-000001"),
    app("1/21/2026 09:00:00", 502, "01899-000009", "জয়েন করার ৭ দিনের মধ্যে ৫০% পরিশোধ করব"),
    app("1/22/2026 09:00:00", 999, "01811-000004"),
  ]),
};

test("small parsers", () => {
  assert.equal(normPhone("+880 1711-000001"), "01711000001");
  assert.equal(normPhone("০১৭১১০০০০০১"), "01711000001");
  assert.equal(normPhone("12345"), "");
  assert.equal(parseDate("1/1/2026 6:00:00"), Date.UTC(2026, 0, 1) / 1000);
  assert.deepEqual(parseSalary("3,500৳"), { kind: "fixed", amount: 3500, issues: [] });
  assert.equal(parseSalary("Negotiable").kind, "negotiable");
  assert.deepEqual(parseSalary("4000/4500").issues, ["salary_unclear"]);
  assert.equal(parseSalary("").kind, "unspecified");
  assert.equal(parseClass("hsc 27").key, "hsc");
  assert.equal(parseClass("Class 9").key, "ssc");
  assert.equal(parseClass("KG").key, "c1-5");
  assert.equal(parseClass("Medical Admission").key, "admission");
  assert.deepEqual(parseSubjects("H. Math, Physics, Not Interested").keys, ["hmath", "physics"]);
  assert.equal(parseArea("Padma Residential Area (পদ্মা আবাসিক এলাকা)").key, "padma-abashik");
  assert.equal(parseArea("Podda Abashik").key, "padma-abashik");
  assert.equal(parseArea("তেরখাদিয়া").key, "terokhadiya");
  assert.equal(parseArea("Nowhere").key, null);
  assert.equal(parseArea("তেরোখাদিয়া").key, "terokhadiya");
  assert.deepEqual(parseSubjects("All Subject (Arts), সাধারণ গণিত, উচ্চতর গণিত").keys, ["all-arts", "math", "hmath"]);
});

test("seeded problems are reported", () => {
  const { report } = analyze(tabs);
  assert.equal(report.tutors.rows, 5);
  assert.equal(report.tutors.blankRowsSkipped, 1);
  assert.equal(report.tutors.ready, 2);
  assert.equal(report.tutors.needsReview, 3);
  assert.equal(report.issues.tutor_email_repeated, 2);
  assert.equal(report.issues.phone_invalid, 1);
  assert.equal(report.issues.tuition_in_both_tabs, 1);
  assert.equal(report.issues.tuition_code_repeated, 2);
  assert.equal(report.issues.area_unknown, 1);
  assert.equal(report.issues.salary_under_2000, 1);
  assert.equal(report.tuitions.unusedCodesSkipped, 1);
  assert.equal(report.applications.repeatsMerged, 1);
  assert.equal(report.issues.application_tuition_unknown, 1);
  assert.equal(report.issues.application_no_tutor_match, 1);
  assert.equal(report.guardians.repeat, 1);
});

test("nothing imported is public, and private text stays out of public fields", () => {
  const { tuitions, report } = analyze(tabs);
  assert.equal(report.tuitions.public, 0);
  for (const t of tuitions) {
    assert.equal(t.tuition.is_public, 0);
    assert.equal(t.tuition.requirements_public, "");
    assert.ok(!JSON.stringify(t.tuition).includes(PRIVATE_MARKER));
  }
  assert.ok(JSON.stringify(tuitions.map((t) => t.private)).includes(PRIVATE_MARKER));
});

test("data we chose not to keep is dropped", () => {
  const { tutors } = analyze(tabs);
  const text = JSON.stringify(tutors);
  assert.ok(!text.includes("B+"));
  assert.ok(!text.includes("1/1/2000"));
  assert.ok(!text.includes("private situation"));
});

test("Booked gives a selected placement, never joined or paid", () => {
  const { placements, applications } = analyze(tabs);
  const p = placements.find((x) => x.tuition_code === 501);
  assert.equal(p.status, "selected");
  assert.equal(p.tutor_code, 1001);
  assert.ok(p.application_row);
  assert.equal(placements.find((x) => x.tuition_code === 301).tutor_code, null);
  assert.equal(applications.find((a) => a.tuition_code === 502).fee_plan, "early");
});

test("posting date falls back to the first application", () => {
  const { tuitions } = analyze(tabs);
  assert.equal(tuitions.find((t) => t.code === 501).tuition.posted_at, parseDate("1/20/2026 10:00:00"));
});

test("a changed sheet layout stops the run", () => {
  assert.throws(() => analyze({ ...tabs, registration: csv([reg({ 0: "Something else" }), tutor(1001, "01811-000001", "a@gmail.com")]) }), /layout changed/);
});
