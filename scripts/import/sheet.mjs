// Turns the Mastersheet's CSV exports into clean records and a report of problems. Pure: reads nothing, writes nothing.
// Column positions come from the sheet as of 2026-11-01; checkHeaders stops the run if the layout has changed.
// Rules from PRD §14: hide every imported tuition, never publish raw notes, never treat Booked or Verified as proof.
import { AREAS, CLASS_CHOICES } from "../../app/lib/options.ts";

const CLASS_KEYS = new Set(CLASS_CHOICES.map((c) => c.key));

export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();
const latinDigits = (s) => (s ?? "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

export function normPhone(s) {
  let d = latinDigits(s).replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(2);
  if (d.length === 10 && d[0] === "1") d = `0${d}`;
  return /^01[3-9]\d{8}$/.test(d) ? d : "";
}

/** Sheet times are Dhaka local, M/D/YYYY H:mm:ss. */
export function parseDate(s) {
  const m = clean(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return Date.UTC(+m[3], +m[1] - 1, +m[2], +(m[4] ?? 0) - 6, +(m[5] ?? 0), +(m[6] ?? 0)) / 1000;
}

export function parseSalary(s) {
  const raw = latinDigits(clean(s)).replace(/,/g, "");
  if (!raw) return { kind: "unspecified", amount: null, issues: ["salary_missing"] };
  if (/negotiable|আলোচনা/i.test(raw)) return { kind: "negotiable", amount: null, issues: [] };
  const nums = raw.match(/\d{3,6}/g);
  if (!nums) return { kind: "unspecified", amount: null, issues: ["salary_unreadable"] };
  const amount = +nums[0], issues = [];
  if (nums.length > 1 || /per|class/i.test(raw)) issues.push("salary_unclear");
  if (amount < 2000) issues.push("salary_under_2000");
  return { kind: "fixed", amount, issues };
}

export function parseClass(s) {
  const c = latinDigits(clean(s)).toLowerCase();
  if (!c) return { key: null, issues: ["class_missing"] };
  const hit = (key) => ({ key, issues: [] });
  if (/admission|ভর্তি/.test(c)) return hit("admission");
  if (/o ?level/.test(c)) return hit("olevel");
  if (/a ?level/.test(c)) return hit("alevel");
  // One class or one exam batch (owner, 2026-11-02). A batch with no year, or a year the app does not list yet, goes
  // to review as "other" rather than being guessed.
  const batch = c.match(/\b(ssc|hsc)\s*'?(\d{2})\b/);
  if (batch) {
    const key = `${batch[1]}-${batch[2]}`;
    return CLASS_KEYS.has(key) ? hit(key) : { key: "other", issues: ["class_batch_unknown"] };
  }
  if (/hsc|ssc|college/.test(c)) return { key: "other", issues: ["class_batch_missing"] };
  const n = c.match(/\bclass\s*(\d{1,2})\b/)?.[1] ?? c.match(/^(\d{1,2})$/)?.[1];
  if (n && CLASS_KEYS.has(`class-${+n}`)) return hit(`class-${+n}`);
  if (/\bkg\b|play|nursery/.test(c)) return hit("pre");
  return { key: "other", issues: ["class_unknown"] };
}

const SUBJECT_ALIASES = [
  [/^all subjects? \(arts\)/, "all-arts"], [/^all subjects? \(commerce\)|^commerce subject/, "all-commerce"],
  [/^all( subjects?)?$|^ev ?\(all|^all \(ev\)/, "all"], [/^h(igher)?\.? ?math|উচ্চতর গণিত/, "hmath"], [/math|গণিত/, "math"],
  [/science|বিজ্ঞান/, "science"], [/eng(l)?ish|ielts|ইংরেজি/, "english"], [/bangla|bengali|বাংলা/, "bangla"],
  [/physics|পদার্থ/, "physics"], [/chemistry|রসায়ন/, "chemistry"], [/biology|জীব/, "biology"], [/\bict\b|আইসিটি/, "ict"],
  [/accounting|হিসাব/, "accounting"], [/quran|arabic|arbi|কুরআন/, "quran"], [/\bbgs\b/, "bgs"], [/islam|religion|ধর্ম/, "islam"],
  [/economics|অর্থনীতি/, "economics"], [/finance/, "finance"],
];

export function parseSubjects(s) {
  const out = new Set(), issues = [];
  for (const part of clean(s).split(/[,+/&]/)) {
    const p = part.trim().toLowerCase();
    if (!p || p === "not interested") continue;
    const hit = SUBJECT_ALIASES.find(([re]) => re.test(p));
    if (hit) out.add(hit[1]);
    else if (!issues.length) issues.push("subject_unknown");
  }
  return { keys: [...out], issues };
}

const foldArea = (s) => s.normalize("NFC").toLowerCase().replace(/sh/g, "s").replace(/bh/g, "b").replace(/kh/g, "k").replace(/aa/g, "a").replace(/[^\p{L}\p{M}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
const GENERIC_WORDS = new Set(["road", "more", "mor", "school", "market", "college", "residential", "station", "service", "bazar", "camp", "para", "court", "new", "city", "fire", "police", "line"]);
const AREA_TERMS = AREAS.flatMap((a) => {
  const alts = (a.alt ?? "").split(" ").filter((w) => w.length >= 5 && !GENERIC_WORDS.has(w.toLowerCase()));
  return [a.label, a.alt ?? "", ...alts].filter(Boolean).map((term) => ({ key: a.key, term: foldArea(term) }));
}).sort((x, y) => y.term.length - x.term.length);

// Spellings seen in the sheet, beyond the labels and English names in options.ts.
const AREA_SPELLINGS = {
  terokhadiya: ["তেরোখাদিয়া"], "hetem-kha": ["হেতেম খা", "হেতেমখা"], "rani-bazar": ["রানীবাজার", "রানিবাজার", "ranibazar"],
  veripara: ["ভেরিপাড়া", "ভেরি পাড়া", "police line", "পুলিশ লাইন"], dorikhorbona: ["দড়িখরবনা", "দরীক্ষরবনা", "নগর ভবন", "নগরভবন"],
  amchattar: ["আমচত্তর"], dinggadoba: ["ডিঙ্গা ডোবা"], "fire-service": ["fireservice", "fire service"], "bgb-camp": ["bgb"],
  "court-station": ["court", "কোর্ট"], kadirganj: ["kadirgnj"], "choto-bongram": ["ছোটবনগ্রাম"], talaimari: ["তালাইমাড়ি", "অক্ট্রয়"],
  horogram: ["হরোগ্রাম"], vatapara: ["ভাটপাড়া"], "new-market": ["নিউমার্কেট"], baliapukur: ["বলিয়া পুকুর"],
  sonadighi: ["সোনা দিঘির", "সোনাদীঘির", "সোনাদিঘীর"], alokar: ["অলোকার"], ruet: ["রুয়েট"], shipaipara: ["shipai para"],
};
const SPELLING_TERMS = Object.entries(AREA_SPELLINGS).flatMap(([key, terms]) => terms.map((term) => ({ key, term: foldArea(term) })));
const ALL_AREA_TERMS = [...AREA_TERMS, ...SPELLING_TERMS].sort((x, y) => y.term.length - x.term.length);

/** Returns only a neighbourhood key. The raw text can hold landmarks, so it never leaves the private tables. */
export function parseArea(s) {
  const text = foldArea(clean(s));
  if (!text) return { key: null, issues: ["area_missing"] };
  const hit = ALL_AREA_TERMS.find((a) => text.includes(a.term));
  return hit ? { key: hit.key, issues: [] } : { key: null, issues: ["area_unknown"] };
}

export function parseDays(s) {
  const nums = latinDigits(clean(s)).match(/[1-7]/g);
  if (!nums) return { days: null, issues: ["days_missing"] };
  return { days: +nums[0], issues: nums.length > 1 ? ["days_unclear"] : [] };
}

const parseTutorGender = (s) => {
  const t = clean(s).toLowerCase();
  if (/male\s*\/\s*female|any|not specified/.test(t) || !t) return "any";
  return t.includes("female") ? "female" : t.includes("male") ? "male" : "any";
};
const parseStudentGender = (s) => {
  const t = clean(s).toLowerCase();
  return t.includes("female") ? "girl" : t.includes("male") ? "boy" : null;
};

// Imported tuitions are never public, so `status` is only history. The sheet's own word stays in raw.
export function mapTuitionStatus(s) {
  const t = clean(s).toLowerCase();
  if (/booked|tutor selected|confirmed|done|commission/.test(t)) return "booked";
  if (/cancel/.test(t)) return "cancelled";
  if (t === "available" || t === "urgent" || t === "searching" || t === "new lead") return "available";
  return "processing"; // Processing, Follow Up Need, Trial Scheduled
}

const LAYOUT = {
  admin: { 0: "Code", 1: "Status", 3: "Number", 9: "Salary", 10: "Location", 11: "Full Address", 13: "Tutor Gender", 19: "Tutor Number", 21: "Post Date" },
  old: { 4: "Class", 5: "Subject(s)", 8: "Salary", 10: "Tutor Gender", 13: "Lead Source", 15: "Contact", 16: "Location Area", 18: "Full Address", 21: "Selected Tutor", 22: "Tutor Phone" },
  registration: { 0: "Tutor", 7: "Email Address", 8: "Gender", 13: "Contact Number", 37: "Current Location", 42: "Priority", 48: "Timestamp" },
  application: { 0: "Timestamp", 1: "Tutor Code", 2: "Gender", 4: "Full Name", 6: "Contact Number", 9: "Commission Payment Policy" },
};

export function checkHeaders(name, rows) {
  const head = rows.slice(0, 4);
  for (const [col, label] of Object.entries(LAYOUT[name])) {
    if (!head.some((r) => clean(r[col]).includes(label))) throw new Error(`${name}: column ${col} should be "${label}". The sheet layout changed, so nothing was imported.`);
  }
}

const dataRows = (rows) => {
  const start = rows.findIndex((r) => /^\d+$/.test(clean(r[0])));
  return start < 0 ? [] : rows.slice(start).map((r, i) => ({ r, rowNo: start + i + 1 }));
};

/** Tuitions from this code on keep the sheet's status; older open ones are closed. */
export const OPEN_FROM_CODE = 945;

function bump(map, key, by = 1) { map[key] = (map[key] ?? 0) + by; }

function parseTuitionRow(tab, r, rowNo) {
  const c = tab === "admin"
    ? { status: r[1], label: r[2], phone: r[3], source: r[4], cls: r[5], subj: r[6], days: r[7], sal: r[9], loc: r[10], addr: r[11], sg: r[12], tg: r[13], qual: r[14], notes: r[15], selName: r[17], selPhone: r[19], posted: r[21] }
    : { status: clean(r[1]) || r[2], label: r[14], phone: r[15], source: r[13], cls: r[4], subj: r[5], days: r[6], sal: r[8], loc: r[16], addr: r[18], sg: r[9], tg: r[10], qual: r[11], notes: r[12], selName: r[21], selPhone: r[22], posted: r[3] };
  const cls = parseClass(c.cls), subj = parseSubjects(c.subj), days = parseDays(c.days), sal = parseSalary(c.sal), area = parseArea(c.loc);
  const guardianPhone = normPhone(c.phone);
  const issues = [...cls.issues, ...subj.issues, ...days.issues, ...sal.issues, ...area.issues];
  if (!guardianPhone) issues.push("guardian_phone_missing");
  if (!clean(c.status)) issues.push("tuition_status_blank");
  return {
    code: +clean(r[0]), tab, rowNo, issues, guardianPhone,
    tuition: {
      status: mapTuitionStatus(c.status), is_public: 0, accepting_applications: 0, class_level: cls.key, subjects: subj.keys, area: area.key,
      days_per_week: days.days, salary_kind: sal.kind, salary_amount: sal.amount, student_gender: parseStudentGender(c.sg),
      tutor_gender_pref: parseTutorGender(c.tg), requirements_public: "", posted_at: parseDate(c.posted),
    },
    private: {
      guardian_label: clean(c.label) || null, exact_address: clean(c.addr) || null, lead_source: clean(c.source).toLowerCase() || null,
      private_notes: clean(c.notes) || null, tutor_qualification: clean(c.qual) || null,
      raw: { status: clean(c.status), class: clean(c.cls), subjects: clean(c.subj), days: clean(c.days), salary: clean(c.sal), location: clean(c.loc) },
    },
    selected: clean(c.selName) || normPhone(c.selPhone) ? { name: clean(c.selName) || null, phone: normPhone(c.selPhone) || null } : null,
  };
}

const BANDS = { junior: 25, ssc: 28, hsc: 31 };
const STATEMENTS = { english_experience: 24, junior_strategy: 26, junior_experience: 27, ssc_strategy: 29, ssc_experience: 30, hsc_strategy: 32, hsc_experience: 33, demo_video: 34, special_skills: 35, skills_detail: 36 };

function parseTutorRow(r, rowNo) {
  const issues = [], subjects = [];
  const email = clean(r[7]).toLowerCase(), phone = normPhone(r[13]);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) issues.push("email_invalid");
  if (!phone) issues.push("phone_invalid");
  for (const [band, col] of Object.entries(BANDS)) {
    const s = parseSubjects(r[col]);
    issues.push(...s.issues);
    for (const subject of s.keys) subjects.push({ band, subject });
  }
  const statements = [];
  for (const [kind, col] of Object.entries(STATEMENTS)) {
    const body = (r[col] ?? "").trim();
    if (body) statements.push({ kind, body });
  }
  const transport = clean(r[45]).toLowerCase();
  return {
    code: +clean(r[0]), rowNo, issues, phone,
    tutor: {
      email: email || null, full_name: clean(r[9]), gender: clean(r[8]).toLowerCase() === "female" ? "female" : clean(r[8]).toLowerCase() === "male" ? "male" : null,
      phone, alt_phone: normPhone(r[14]) || null, facebook_url: clean(r[6]) || null, photo_source_url: clean(r[4]) || null,
      institution: clean(r[10]) || null, department: clean(r[11]) || null, session_year: clean(r[12]) || null,
      ssc_school: clean(r[15]) || null, ssc_year: +clean(r[16]) || null, ssc_result: clean(r[17]) || null, ssc_group: clean(r[18]) || null,
      hsc_college: clean(r[19]) || null, hsc_year: +clean(r[20]) || null, hsc_result: clean(r[21]) || null, hsc_group: clean(r[22]) || null,
      mediums: clean(r[23]) || null, current_location: clean(r[37]) || null, home_division: clean(r[38]) || null, home_district: clean(r[39]) || null,
      priority: /urgent/i.test(r[42] ?? "") ? "urgent" : "standard", demo_willing: /^yes/i.test(clean(r[44])) ? 1 : /^no/i.test(clean(r[44])) ? 0 : null,
      transport: /bicycle|সাইকেল/.test(transport) ? "bicycle" : /motorbike/.test(transport) ? "motorbike" : /^🚶|^no\b/.test(transport) ? "none" : "other",
      referral_code: clean(r[46]) || null, registered_at: parseDate(r[48]),
    },
    subjects, statements,
    termsAsWritten: /I Agree to the Terms/i.test(r[47] ?? ""),
  };
}

const feePlan = (s) => (/৬০%/.test(s) ? "standard" : /৫০%/.test(s) ? "early" : null);

/** @param tabs CSV text keyed admin, old, registration, application */
export function analyze(tabs) {
  const rows = {};
  for (const name of ["admin", "old", "registration", "application"]) {
    rows[name] = parseCSV(tabs[name]);
    checkHeaders(name, rows[name]);
  }
  const issues = {};
  const note = (code) => bump(issues, code);

  // Tutors. Every registered tutor is imported (owner, 2026-11-03). Only what the database can't hold waits in review:
  // a repeated code or email, or no phone. Other problems are imported and flagged for the review list.
  // Numbered rows with nothing in them are not tutors.
  const regData = dataRows(rows.registration);
  const filledReg = regData.filter(({ r }) => clean(r[7]) || clean(r[9]) || clean(r[13]));
  const tutorRows = filledReg.map(({ r, rowNo }) => parseTutorRow(r, rowNo));
  const seen = { code: {}, phone: {}, email: {} };
  for (const t of tutorRows) {
    bump(seen.code, t.code);
    if (t.phone) bump(seen.phone, t.phone);
    if (t.tutor.email) bump(seen.email, t.tutor.email);
  }
  for (const t of tutorRows) {
    if (seen.code[t.code] > 1) t.issues.push("tutor_code_repeated");
    if (t.phone && seen.phone[t.phone] > 1) t.issues.push("tutor_phone_repeated");
    if (t.tutor.email && seen.email[t.tutor.email] > 1) t.issues.push("tutor_email_repeated");
    if (!t.tutor.full_name) t.issues.push("tutor_name_missing");
    if (!t.termsAsWritten) t.issues.push("tutor_changed_fee_terms");
    t.issues.forEach(note);
  }
  const blocking = /^(phone_invalid|tutor_code_repeated|tutor_email_repeated)$/;
  const flagging = /^(email_invalid|tutor_phone_repeated|tutor_name_missing)$/;
  for (const t of tutorRows) {
    t.needsReview = t.issues.some((i) => blocking.test(i));
    t.flagged = !t.needsReview && t.issues.some((i) => flagging.test(i));
    if (t.issues.includes("email_invalid")) t.tutor.email = null; // can't sign in until the owner fixes it
    if (!t.tutor.full_name) t.tutor.full_name = "(নাম নেই)";
  }
  // A number two tutors share (a relative's or a friend's) can't tell who applied, so it links nobody.
  const tutorByPhone = new Map();
  const shared = new Set();
  for (const t of tutorRows) {
    if (t.needsReview) continue;
    for (const ph of [t.phone, t.tutor.alt_phone]) {
      if (!ph || tutorByPhone.get(ph) === t.code) continue;
      if (tutorByPhone.has(ph)) shared.add(ph);
      else tutorByPhone.set(ph, t.code);
    }
  }
  for (const ph of shared) tutorByPhone.delete(ph);

  // Tuitions: the current tab wins where a code is in both.
  // A row counts if it holds anything beyond its code; only empty, pre-numbered rows are skipped.
  const adminRows = dataRows(rows.admin).filter(({ r }) => clean(r[1]) || clean(r[3]) || clean(r[5]) || clean(r[6]) || clean(r[10]));
  const oldRows = dataRows(rows.old).filter(({ r }) => clean(r[1]) || clean(r[2]) || clean(r[4]) || clean(r[5]) || clean(r[15]) || clean(r[16]));
  const unused = dataRows(rows.admin).length - adminRows.length + dataRows(rows.old).length - oldRows.length;
  const parsed = [...adminRows.map(({ r, rowNo }) => parseTuitionRow("admin", r, rowNo)), ...oldRows.map(({ r, rowNo }) => parseTuitionRow("old", r, rowNo))];
  const codeCount = {}, adminCodes = new Set();
  for (const t of parsed) {
    if (t.tab === "admin") adminCodes.add(t.code);
  }
  const tuitions = parsed.filter((t) => {
    if (t.tab === "old" && adminCodes.has(t.code)) { note("tuition_in_both_tabs"); return false; }
    bump(codeCount, `${t.tab}:${t.code}`);
    return true;
  });
  for (const t of tuitions) {
    if (codeCount[`${t.tab}:${t.code}`] > 1) t.issues.push("tuition_code_repeated");
    // The sheet still says "available" on many old tuitions that are long gone (owner, 2026-11-03).
    const open = t.tuition.status === "available" || t.tuition.status === "processing";
    if (open && t.code < OPEN_FROM_CODE) {
      t.tuition.status = "closed";
      t.issues.push("tuition_closed_as_old");
    }
    t.issues.forEach(note);
    const stillOpen = t.tuition.status === "available" || t.tuition.status === "processing";
    // An open tuition with gaps waits for the owner. A closed one is history: best guess, no review.
    t.needsReview = t.issues.includes("tuition_code_repeated") ||
      (stillOpen && t.issues.some((i) => /^(class_missing|area_unknown|area_missing|days_missing)$/.test(i)));
    if (!t.needsReview && !stillOpen) {
      t.tuition.class_level ??= "other";
      t.tuition.area ??= "";
      t.tuition.days_per_week ??= 3;
    }
  }
  const tuitionCodes = new Set(tuitions.map((t) => t.code));
  const guardianNumbers = {};
  for (const t of tuitions) if (t.guardianPhone) bump(guardianNumbers, t.guardianPhone);

  // Applications are matched by phone, the only reliable link. Repeats of one tutor + tuition keep the first.
  const firstPair = new Set();
  const earliest = {};
  const applications = [];
  let merged = 0, badTime = 0;
  for (const { r, rowNo } of (() => { const all = rows.application; return all.slice(1).map((row, i) => ({ r: row, rowNo: i + 2 })); })()) {
    const ts = parseDate(r[0]);
    if (!clean(r[0])) continue;
    if (ts === null) { badTime++; continue; }
    const phone = normPhone(r[6]), code = +latinDigits(r[3]).replace(/\D/g, "");
    if (!tuitionCodes.has(code)) { note("application_tuition_unknown"); continue; }
    const key = `${code}|${phone || rowNo}`;
    if (firstPair.has(key)) { merged++; continue; }
    firstPair.add(key);
    if (!earliest[code] || ts < earliest[code]) earliest[code] = ts;
    const tutorCode = tutorByPhone.get(phone) ?? null;
    if (!phone) note("application_phone_invalid");
    if (tutorCode === null) note("application_no_tutor_match");
    applications.push({
      rowNo, tuition_code: code, tutor_code: tutorCode, applicant_name: clean(r[4]) || null, applicant_phone: phone || null, applicant_gender: clean(r[2]).toLowerCase() || null,
      applicant_shortcode: clean(r[5]) || null, applicant_location: clean(r[8]) || null, note: (r[7] ?? "").trim() || null, fee_plan: feePlan(r[9] ?? ""), created_at: ts,
    });
  }

  // Posting date: the sheet's, else the first application as an estimate.
  let postedFromSheet = 0, postedEstimated = 0, postedUnknown = 0;
  for (const t of tuitions) {
    if (t.tuition.posted_at) postedFromSheet++;
    else if (earliest[t.code]) { t.tuition.posted_at = earliest[t.code]; postedEstimated++; }
    else postedUnknown++;
  }

  // Selections become "selected" placements only.
  const placements = [];
  for (const t of tuitions) {
    if (!t.selected) continue;
    const tutorCode = t.selected.phone ? tutorByPhone.get(t.selected.phone) ?? null : null;
    const applied = applications.find((a) => a.tuition_code === t.code && a.applicant_phone === t.selected.phone);
    if (tutorCode === null) note("selected_tutor_no_match");
    placements.push({ tuition_code: t.code, tutor_code: tutorCode, legacy_tutor_name: t.selected.name, legacy_tutor_phone: t.selected.phone, application_row: applied?.rowNo ?? null, status: "selected" });
  }

  const emails = tutorRows.map((t) => t.tutor.email).filter(Boolean);
  const report = {
    tutors: {
      rows: tutorRows.length, blankRowsSkipped: regData.length - filledReg.length, ready: tutorRows.filter((t) => !t.needsReview).length, flagged: tutorRows.filter((t) => t.flagged).length, needsReview: tutorRows.filter((t) => t.needsReview).length,
      gmail: emails.filter((e) => e.endsWith("@gmail.com")).length, otherEmail: emails.filter((e) => !e.endsWith("@gmail.com")).length,
      canLinkByEmail: tutorRows.filter((t) => !t.needsReview && t.tutor.email).length,
    },
    tuitions: {
      rows: tuitions.length, ready: tuitions.filter((t) => !t.needsReview).length, needsReview: tuitions.filter((t) => t.needsReview).length,
      public: tuitions.filter((t) => t.tuition.is_public).length, unusedCodesSkipped: unused, postedFromSheet, postedEstimated, postedUnknown,
    },
    guardians: { numbers: Object.keys(guardianNumbers).length, repeat: Object.values(guardianNumbers).filter((n) => n > 1).length },
    applications: { kept: applications.length, repeatsMerged: merged, unreadableTime: badTime, linkedToTutor: applications.filter((a) => a.tutor_code !== null).length },
    placements: { rows: placements.length, linkedToTutor: placements.filter((p) => p.tutor_code !== null).length },
    issues: Object.fromEntries(Object.entries(issues).sort((a, b) => b[1] - a[1])),
  };
  return { report, tutors: tutorRows, tuitions, applications, placements };
}
