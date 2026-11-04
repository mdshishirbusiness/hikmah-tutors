// SYNTHETIC data for trying the whole site on your own computer: invented tutors, guardians, tuitions, applications and
// drawn avatar photos, about six months of activity so the admin charts have something to show. Every value is made
// up. It lives in its own local state (.wrangler/synthetic), never in the real database or the real-data local copy.
//
//   npm run synthetic:seed      (re)build it
//   npm run dev:synthetic       run the site on it
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import sharp from "sharp";
import { getPlatformProxy } from "wrangler";
import { AREAS, CLASS_CHOICES } from "../../app/lib/options.ts";

const STATE = ".wrangler/synthetic";
const DAY = 86400;
const NOW = Math.floor(Date.now() / 1000);

// ---------- a seeded random, so every run makes the same data ----------
let seed = 20261104;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
/** Earlier items are more likely: the areas and classes are listed most-asked first. */
const pickTop = (list, bias = 2.2) => list[Math.floor(Math.pow(rand(), bias) * list.length)];
const sample = (list, n) => [...list].sort(() => rand() - 0.5).slice(0, n);
const weighted = (pairs) => {
  let r = rand() * pairs.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[0][0];
};

// ---------- people ----------
const MALE = ["Arif", "Sakib", "Tanvir", "Rafi", "Nayeem", "Imran", "Fahim", "Shuvo", "Mahin", "Rakib", "Sabbir", "Tahmid", "Zubair", "Hasib", "Nahid", "Rifat", "Asif", "Sadman", "Mehedi", "Rashed", "Tamim", "Ashik", "Junaid", "Ovi"];
const FEMALE = ["Nusrat", "Farzana", "Sadia", "Tasnim", "Mim", "Jannat", "Rumana", "Afroza", "Sumaiya", "Tanjila", "Lamia", "Raisa", "Nabila", "Fariha", "Ishrat", "Maliha", "Sharmin", "Anika", "Tahsin", "Rifa", "Mehjabin", "Orin"];
const LAST_M = ["Hossain", "Rahman", "Islam", "Ahmed", "Sarker", "Haque", "Karim", "Uddin", "Chowdhury", "Biswas", "Mondal", "Pramanik", "Alam", "Hasan"];
const LAST_F = ["Akter", "Khatun", "Sultana", "Rahman", "Islam", "Jahan", "Haque", "Parvin", "Ahmed", "Tabassum", "Nahar"];

const UNIVERSITIES = [
  ["ru", 50, "University of Rajshahi", ["Physics", "Chemistry", "Mathematics", "English", "Economics", "Accounting", "Botany", "Zoology", "CSE", "Statistics", "Bangla", "Finance", "Pharmacy", "Applied Math"]],
  ["ruet", 24, "RUET", ["CSE", "EEE", "ME", "CE", "ETE", "URP", "IPE"]],
  ["medical", 9, "Rajshahi Medical College", ["MBBS"]],
  ["other", 17, "", ["Physics", "Chemistry", "Mathematics", "English", "Management", "BBA"]],
];
const OTHER_PLACES = ["Rajshahi College", "Varendra University", "New Govt. Degree College", "Rajshahi Govt. City College"];
const ARTS = new Set(["English", "Bangla", "Economics"]);
const COMMERCE = new Set(["Accounting", "Finance", "Management", "BBA"]);

const SCIENCE_SSC = ["math", "physics", "chemistry", "hmath", "science", "english", "biology", "ict"];
const SCIENCE_HSC = ["physics", "chemistry", "hmath", "math", "biology", "ict", "english"];

const ABOUT = [
  "I explain every chapter with examples and give a short test each week.",
  "Patient with young students. I keep homework light but regular.",
  "Board exam focused: past questions, creative questions and time practice.",
  "I have taught SSC students for two years; most improved by a full grade.",
  "Strong in Physics and Higher Math. I can start within a week.",
  "ছোটদের সাথে ধৈর্য নিয়ে পড়াই, প্রতি সপ্তাহে অভিভাবককে অগ্রগতি জানাই।",
];
const NOTES = ["I can start this week.", "I live 5 minutes away.", "I have taught this class before.", "Available every evening.", "আমি এই এলাকাতেই থাকি।", "Can do a demo class tomorrow."];
const REQUIREMENTS = [
  "Experienced tutor who can handle board exam preparation",
  "Patient tutor for a young child",
  "Science background, strong in Math",
  "RU student preferred, punctual",
  "Female tutor, must be regular",
  "Good English pronunciation",
  "Someone who can give weekly tests",
  "Engineering student for Higher Math and Physics",
];

function personName(gender) {
  return `${pick(gender === "female" ? FEMALE : MALE)} ${pick(gender === "female" ? LAST_F : LAST_M)}`;
}

const tutors = [];
function makeTutor(code, opts = {}) {
  const gender = opts.gender ?? (chance(0.55) ? "male" : "female");
  const [university, , institution, departments] = opts.university
    ? UNIVERSITIES.find((u) => u[0] === opts.university)
    : weighted(UNIVERSITIES.map((u) => [u, u[1]]));
  const department = opts.department ?? pick(departments);
  const stream = ARTS.has(department) ? "arts" : COMMERCE.has(department) ? "commerce" : "science";
  const subjects = [];
  const junior = stream === "arts" ? ["all", "english", "bangla"] : stream === "commerce" ? ["all", "math", "english"] : ["all", "math", "english", "science"];
  for (const s of sample(junior, int(2, junior.length))) subjects.push(["junior", s]);
  if (chance(0.85)) {
    const ssc = stream === "arts" ? ["english", "bangla", "all-arts", "bgs"] : stream === "commerce" ? ["accounting", "finance", "all-commerce", "math"] : SCIENCE_SSC;
    for (const s of sample(ssc, int(2, Math.min(5, ssc.length)))) subjects.push(["ssc", s]);
  }
  if (stream === "science" && chance(0.55)) for (const s of sample(SCIENCE_HSC, int(2, 4))) subjects.push(["hsc", s]);
  if (stream === "commerce" && chance(0.4)) for (const s of sample(["accounting", "finance", "economics"], 2)) subjects.push(["hsc", s]);
  const bands = new Set(subjects.map(([b]) => b));
  const setup = opts.setup ?? chance(0.42);
  const anywhere = chance(0.18);
  const registered = NOW - int(5, 700) * DAY;
  const year = int(2019, 2023);
  tutors.push({
    id: tutors.length + 1,
    code,
    created_via: opts.staff ? "staff" : "import",
    full_name: opts.name ?? personName(gender),
    gender,
    phone: `0170000${String(code).slice(-4).padStart(4, "0")}`,
    email: `t${code}@example.test`,
    university,
    institution: university === "other" ? pick(OTHER_PLACES) : institution,
    department,
    session_year: `${year}-${String(year + 1).slice(2)}`,
    ssc_result: pick(["5.00", "5.00", "5.00", "4.94", "4.83", "4.67"]),
    ssc_group: stream === "science" ? "Science" : stream === "arts" ? "Humanities" : "Business Studies",
    hsc_result: pick(["5.00", "5.00", "4.92", "4.75", "4.58"]),
    hsc_group: stream === "science" ? "Science" : stream === "arts" ? "Humanities" : "Business Studies",
    mediums: chance(0.25) ? "bangla,ev" : "bangla",
    current_location: pickTop(AREAS).label,
    priority: chance(0.05) ? "urgent" : "standard",
    subjects,
    areas: anywhere ? [] : sample(AREAS.slice(0, 30), int(1, 4)).map((a) => a.key),
    anywhere: anywhere ? 1 : 0,
    classes: setup ? CLASS_CHOICES.filter((c) => bands.has(bandOf(c.key))).map((c) => c.key) : [],
    setup_done_at: setup ? registered + int(1, 30) * DAY : null,
    min_salary: setup ? pick([2500, 3000, 3500, 4000, 5000, null]) : null,
    transport: setup ? pick(["none", "bicycle", "motorbike", "none"]) : null,
    demo_willing: setup ? (chance(0.85) ? 1 : 0) : null,
    about: setup && chance(0.6) ? pick(ABOUT) : null,
    photo: opts.photo ?? chance(0.93),
    registered_at: registered,
  });
}

function bandOf(cls) {
  if (cls === "pre") return "junior";
  const n = /^class-(\d+)$/.exec(cls)?.[1];
  if (n) return Number(n) <= 8 ? "junior" : Number(n) <= 10 ? "ssc" : "hsc";
  if (cls.startsWith("ssc") || cls === "olevel") return "ssc";
  if (cls.startsWith("hsc") || cls === "alevel" || cls === "admission") return "hsc";
  return null;
}

for (let code = 2001; code <= 2340; code++) makeTutor(code);
// Test tutors you can sign in as in `npm run dev`: /dev/tutor/99001 and so on.
makeTutor(99001, { name: "Test Tutor One", gender: "female", university: "ru", department: "Physics", setup: true, staff: true });
makeTutor(99002, { name: "Test Tutor Two", gender: "male", university: "ruet", department: "CSE", setup: false, staff: true });
makeTutor(99003, { name: "Test Tutor Three", gender: "female", university: "medical", department: "MBBS", setup: true, staff: true });

// ---------- tuitions ----------
const CLASS_WEIGHTS = [
  ["class-1", 3], ["class-2", 3], ["class-3", 4], ["class-4", 4], ["class-5", 5], ["class-6", 5], ["class-7", 5], ["class-8", 6],
  ["class-9", 7], ["class-10", 6], ["ssc-27", 5], ["ssc-28", 4], ["class-11", 4], ["class-12", 3], ["hsc-27", 4], ["hsc-28", 3],
  ["admission", 2], ["olevel", 1], ["pre", 2],
];
const SUBJECTS_FOR = {
  junior: [["all"], ["all"], ["math", "english"], ["english"], ["math", "science"], ["all"]],
  ssc: [["math", "physics", "chemistry"], ["math", "hmath"], ["physics", "chemistry", "hmath"], ["english"], ["math", "english"], ["biology", "chemistry"], ["accounting", "finance"]],
  hsc: [["physics", "chemistry", "hmath"], ["physics", "hmath"], ["chemistry", "biology"], ["english"], ["ict"], ["accounting", "finance", "economics"]],
};
function salaryFor(cls) {
  const band = bandOf(cls);
  const [lo, hi] = cls === "admission" || cls === "olevel" ? [8000, 14000] : band === "hsc" ? [5000, 9000] : band === "ssc" ? [4000, 7000] : [2500, 4500];
  return Math.round(int(lo, hi) / 500) * 500;
}

const tuitions = [];
const guardians = [];
let code = 1000;
// About 6 months, busier recently: a few a day at the start, up to three times that now.
for (let day = 180; day >= 0; day--) {
  const perDay = Math.round(0.6 + (1 - day / 180) * 1.6 + rand() * 1.2);
  for (let k = 0; k < perDay; k++) {
    code++;
    const posted = NOW - day * DAY - int(0, DAY - 1) - (day === 0 ? 0 : 0);
    const cls = weighted(CLASS_WEIGHTS);
    const band = bandOf(cls);
    const online = chance(0.05);
    const age = (NOW - posted) / DAY;
    let status;
    if (age > 21) status = weighted([["booked", 72], ["closed", 15], ["cancelled", 9], ["processing", 4]]);
    else if (age > 4) status = weighted([["booked", 50], ["processing", 25], ["available", 15], ["cancelled", 5], ["closed", 5]]);
    else status = weighted([["available", 70], ["processing", 20], ["booked", 10]]);
    const isNewGuardian = !guardians.length || chance(0.88);
    if (isNewGuardian) {
      guardians.push({
        id: guardians.length + 1,
        phone: `0180000${String(guardians.length + 1).padStart(4, "0")}`,
        name: chance(0.5) ? `${pick(["Mr.", "Mrs."])} ${pick([...LAST_M, ...LAST_F])}` : null,
        created_at: posted - int(1, 20) * 3600,
      });
    }
    const guardian = isNewGuardian ? guardians.at(-1) : pick(guardians);
    const area = online ? "" : pickTop(AREAS.slice(0, 40)).key;
    const salaryKind = chance(0.05) ? "negotiable" : "fixed";
    tuitions.push({
      code, status, class_level: cls,
      medium: weighted([["bangla", 65], ["ev", 20], ["em", 10], ["madrasa", 5]]),
      subjects: pick(SUBJECTS_FOR[band] ?? [["all"]]).join(","),
      area: online ? "uposhohor" : area,
      mode: online ? "online" : "home",
      salary_kind: salaryKind, salary_amount: salaryKind === "fixed" ? salaryFor(cls) : null,
      days_per_week: pick([3, 4, 4, 5, 5, 6]),
      session_minutes: pick([60, 90, 90, 120]),
      time_of_day: pick(["afternoon", "evening", "evening", "morning", "flexible"]),
      student_gender: pick(["boy", "girl"]),
      tutor_gender_pref: weighted([["any", 45], ["female", 35], ["male", 20]]),
      tutor_from: chance(0.22) ? pick(["ru", "ru", "ruet", "ru,ruet", "medical"]) : "",
      requirements_public: chance(0.7) ? pick(REQUIREMENTS) : "",
      start_note: chance(0.4) ? pick(["From next week", "1st of next month", "As soon as possible"]) : "",
      posted_at: posted,
      guardian,
      address: `House ${int(1, 120)}, Road ${int(1, 20)}, ${online ? "Uposhohor" : AREAS.find((a) => a.key === area)?.label}`,
      lead_source: weighted([["call", 50], ["whatsapp", 20], ["facebook", 15], ["old", 8], ["referral", 7]]),
    });
  }
}
// Two big open tuitions, so the applicant table has 40 to 60 rows to sort through.
for (const t of tuitions.filter((x) => x.status === "available").slice(-2)) t.big = true;

// ---------- applications ----------
const applications = [];
const events = [];
const placements = [];
const ACTIVE = new Set(["submitted", "under_review", "shortlisted", "trial_arranged", "confirmed"]);
const at = (base, minH, maxH) => Math.min(base + int(minH * 60, maxH * 60) * 60, NOW - 60);

function addApp(t, tutor, created) {
  const a = { id: applications.length + 1, tuition_code: t.code, tutor_id: tutor.id, status: "submitted", created_at: created, updated_at: created, note: chance(0.3) ? pick(NOTES) : null, called_at: null, met_at: null, demo_done_at: null };
  applications.push(a);
  events.push({ application_id: a.id, from: null, to: "submitted", at: created });
  return a;
}
function move(a, to, time, reason = null) {
  events.push({ application_id: a.id, from: a.status, to, at: time, reason });
  a.status = to;
  a.updated_at = time;
}
function walk(a, steps, start) {
  let time = start;
  for (const s of steps) {
    time = at(time, 0.3, 6);
    move(a, s, time);
  }
  return time;
}

for (const t of tuitions) {
  const fits = tutors.filter((u) => u.code < 99000 && (t.tutor_gender_pref === "any" || u.gender === t.tutor_gender_pref || chance(0.05)));
  const band = bandOf(t.class_level);
  const subjects = t.subjects.split(",");
  const good = fits.filter((u) => u.subjects.some(([b, s]) => b === band && (subjects.includes(s) || subjects[0] === "all")));
  const n = t.big ? int(44, 58) : Math.min(fits.length, Math.max(1, Math.round(Math.exp(rand() * 2.6 + 1))));
  const chosen = [...new Set([...sample(good, Math.ceil(n * 0.75)), ...sample(fits, n)])].slice(0, n);
  const apps = chosen.map((u) => addApp(t, u, at(t.posted_at, 0.05, t.status === "available" ? Math.max(0.2, (NOW - t.posted_at) / 3600) : 30)));
  apps.sort((x, y) => x.created_at - y.created_at);
  if (!apps.length) continue;
  const [first, ...rest] = [...apps].sort(() => rand() - 0.5);
  if (t.status === "booked") {
    const done = walk(first, ["under_review", "shortlisted", "trial_arranged"], first.created_at);
    first.called_at = at(done, 0.2, 3); first.met_at = at(first.called_at, 2, 24); first.demo_done_at = at(first.met_at, 24, 60);
    const confirmed = at(first.demo_done_at, 1, 20);
    move(first, "confirmed", confirmed);
    placements.push({ tuition_code: t.code, application_id: first.id, tutor_id: first.tutor_id, confirmed_at: confirmed, agreed: t.salary_amount });
    t.closed_at = confirmed;
    for (const a of rest.slice(0, int(1, 3))) walk(a, ["under_review", "shortlisted"], a.created_at);
    for (const a of rest) if (ACTIVE.has(a.status)) move(a, "opportunity_closed", confirmed, "another tutor confirmed");
  } else if (t.status === "processing") {
    const done = walk(first, ["under_review", "shortlisted", "trial_arranged"], first.created_at);
    if (chance(0.6)) first.called_at = at(done, 0.2, 2);
    t.selected_at = done;
    for (const a of rest.slice(0, int(1, 3))) walk(a, ["under_review", "shortlisted"], a.created_at);
    for (const a of rest.slice(3, 6)) walk(a, ["under_review"], a.created_at);
  } else if (t.status === "available") {
    for (const a of rest.slice(0, int(0, 3))) walk(a, ["under_review", ...(chance(0.5) ? ["shortlisted"] : [])], a.created_at);
    if (chance(0.3)) walk(first, ["under_review"], first.created_at);
  } else {
    const end = at(t.posted_at, 24, 24 * 10);
    t.closed_at = end;
    for (const a of apps) if (ACTIVE.has(a.status)) move(a, chance(0.5) ? "not_selected" : "opportunity_closed", Math.max(end, a.created_at + 60), "tuition closed");
  }
}

// The test tutors' own story: Home shows a selected tuition to call, updates and For You.
{
  const one = tutors.find((u) => u.code === 99001);
  const open = tuitions.filter((t) => t.status === "available" && t.tutor_gender_pref !== "male").slice(-12);
  const selected = tuitions.filter((t) => t.status === "processing" && t.tutor_gender_pref !== "male").at(-1);
  if (selected) {
    const a = addApp(selected, one, at(selected.posted_at, 0.1, 2));
    walk(a, ["under_review", "shortlisted", "trial_arranged"], a.created_at);
  }
  for (const t of open.slice(0, 2)) walk(addApp(t, one, at(t.posted_at, 0.1, 1)), ["under_review", "shortlisted"], t.posted_at + 3600);
  addApp(open[2], one, at(open[2].posted_at, 0.1, 1));
  const old = tuitions.filter((t) => t.status === "booked").slice(-6);
  for (const t of old.slice(0, 2)) {
    const a = addApp(t, one, at(t.posted_at, 0.1, 1));
    move(a, "opportunity_closed", t.closed_at ?? NOW - DAY, "another tutor confirmed");
  }
}

// ---------- leads ----------
const leads = [];
const recent = tuitions.filter((t) => NOW - t.posted_at < 30 * DAY);
for (const t of recent) {
  leads.push({ client_id: `syn-${t.code}`, phone: t.guardian.phone, guardian_name: t.guardian.name, class_level: t.class_level, medium: t.medium, student_gender: t.student_gender, tutor_gender: t.tutor_gender_pref, subjects: t.subjects, area: t.area, address: t.address, salary: t.salary_amount, days: t.days_per_week, source: t.lead_source, status: "posted", created_at: t.posted_at - int(1, 8) * 3600, tuition_code: t.code, guardian_id: t.guardian.id });
}
for (let i = 0; i < 14; i++) {
  const status = i < 5 ? "new" : i < 8 ? "called" : "not_now";
  const cls = weighted(CLASS_WEIGHTS);
  const area = pickTop(AREAS.slice(0, 30)).key;
  leads.push({ client_id: `syn-lead-${i}`, phone: `0190000${String(i + 1).padStart(4, "0")}`, guardian_name: chance(0.6) ? `${pick(["Mr.", "Mrs."])} ${pick(LAST_M)}` : null, class_level: cls, medium: "bangla", student_gender: pick(["boy", "girl"]), tutor_gender: pick(["any", "female", "male"]), subjects: pick(SUBJECTS_FOR[bandOf(cls)] ?? [["all"]]).join(","), area, address: `Near ${AREAS.find((a) => a.key === area).label} school`, salary: salaryFor(cls), days: 4, source: pick(["call", "whatsapp", "facebook"]), status, created_at: NOW - (status === "new" ? int(10, 300) * 60 : int(1, 20) * DAY), tuition_code: null, guardian_id: null });
}
leads.sort((a, b) => a.created_at - b.created_at);

// ---------- avatars ----------
const SKIN = ["#f1c9a5", "#e0ac83", "#c68e63", "#a9714b", "#8d5a3b"];
const BG = [["#cfede6", "#a3dccf"], ["#fde7b0", "#fed262"], ["#dbe7ff", "#b9ccf5"], ["#f6d9e4", "#ecb6cb"], ["#e4f0d0", "#c6dfa3"], ["#e7e1f7", "#cbbff0"]];
const SHIRT = ["#0e6b5a", "#334155", "#1d4ed8", "#7c3aed", "#b45309", "#0f766e", "#be123c"];
function avatarSvg(u) {
  const [b1, b2] = pick(BG);
  const skin = pick(SKIN);
  const shirt = pick(SHIRT);
  const hijab = u.gender === "female" && chance(0.55);
  const hair = u.gender === "female" ? pick(["#1f1611", "#2b1d15", "#3a2618"]) : pick(["#14100d", "#1f1611", "#2b1d15"]);
  const body = `<path d="M70 400 C 80 300, 140 268, 200 268 C 260 268, 320 300, 330 400 Z" fill="${shirt}"/>`;
  const neck = `<rect x="176" y="225" width="48" height="58" rx="20" fill="${skin}"/>`;
  const head = `<ellipse cx="200" cy="170" rx="66" ry="78" fill="${skin}"/>`;
  const eyes = `<circle cx="176" cy="172" r="5" fill="#2a1d16"/><circle cx="224" cy="172" r="5" fill="#2a1d16"/><path d="M182 205 Q200 216 218 205" stroke="#7a4a35" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  let top;
  if (hijab) top = `<path d="M118 190 C 110 100, 160 76, 200 76 C 240 76, 290 100, 282 190 C 284 250, 300 290, 330 330 L 70 330 C 100 290, 116 250, 118 190 Z" fill="${pick(["#0e6b5a", "#1e293b", "#9f1239", "#6d28d9", "#a16207"])}"/><ellipse cx="200" cy="178" rx="58" ry="68" fill="${skin}"/>`;
  else if (u.gender === "female") top = `<path d="M128 200 C 116 110, 160 86, 200 86 C 244 86, 286 112, 272 200 L 280 300 L 120 300 Z" fill="${hair}"/>`;
  else top = "";
  const maleHair = u.gender === "male" ? `<path d="M134 160 C 130 104, 170 86, 204 88 C 246 90, 272 112, 266 160 C 250 128, 220 122, 196 124 C 170 126, 146 134, 134 160 Z" fill="${hair}"/>` : "";
  const front = hijab ? `${eyes}` : `${head}${eyes}${maleHair}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient></defs>
    <rect width="400" height="400" fill="url(#g)"/>${hijab ? "" : top}${body}${neck}${hijab ? top : ""}${front}</svg>`;
}

// ---------- write ----------
console.log("Resetting", STATE);
rmSync(STATE, { recursive: true, force: true });
execSync(`npx wrangler d1 migrations apply hikmah --local --persist-to ${STATE}`, { stdio: ["ignore", "ignore", "inherit"] });

const { env, dispose } = await getPlatformProxy({ persist: { path: `${STATE}/v3` } });
const DB = env.DB;
async function insert(rows, toStatement) {
  for (let i = 0; i < rows.length; i += 80) await DB.batch(rows.slice(i, i + 80).map(toStatement));
}

await insert(tutors, (u) => DB.prepare(
  `INSERT INTO tutors (id, code, created_via, email, full_name, gender, phone, institution, department, session_year, ssc_result, ssc_group, hsc_result, hsc_group,
     mediums, current_location, priority, demo_willing, transport, registered_at, created_at, updated_at, university, min_salary, anywhere, setup_done_at,
     availability_confirmed_at, terms_accepted_at, about, photo_key)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
).bind(u.id, u.code, u.created_via, u.email, u.full_name, u.gender, u.phone, u.institution, u.department, u.session_year, u.ssc_result, u.ssc_group, u.hsc_result, u.hsc_group,
  u.mediums, u.current_location, u.priority, u.demo_willing, u.transport, u.registered_at, u.registered_at, u.registered_at, u.university, u.min_salary, u.anywhere, u.setup_done_at,
  u.setup_done_at, u.setup_done_at, u.about, u.photo ? `tutors/T${u.code}.webp` : null));
await insert(tutors.flatMap((u) => u.subjects.map((s) => [u.id, ...s])), ([id, band, s]) => DB.prepare(`INSERT OR IGNORE INTO tutor_subjects (tutor_id, band, subject) VALUES (?, ?, ?)`).bind(id, band, s));
await insert(tutors.flatMap((u) => u.areas.map((a) => [u.id, a])), ([id, a]) => DB.prepare(`INSERT OR IGNORE INTO tutor_areas (tutor_id, area) VALUES (?, ?)`).bind(id, a));
await insert(tutors.flatMap((u) => u.classes.map((c) => [u.id, c])), ([id, c]) => DB.prepare(`INSERT OR IGNORE INTO tutor_classes (tutor_id, class_level) VALUES (?, ?)`).bind(id, c));
await insert(guardians, (g) => DB.prepare(`INSERT INTO guardians (id, phone, name, created_at) VALUES (?, ?, ?, ?)`).bind(g.id, g.phone, g.name, g.created_at));
await insert(tuitions, (t) => {
  const open = t.status === "available" || t.status === "processing";
  return DB.prepare(
    `INSERT INTO tuitions (code, status, is_public, accepting_applications, class_level, medium, subjects, area, mode, salary_kind, salary_amount, days_per_week,
       session_minutes, time_of_day, student_gender, tutor_gender_pref, tutor_from, requirements_public, start_note, posted_at, closed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(t.code, t.status, open ? 1 : 0, t.status === "available" ? 1 : 0, t.class_level, t.medium, t.subjects, t.area, t.mode, t.salary_kind, t.salary_amount, t.days_per_week,
    t.session_minutes, t.time_of_day, t.student_gender, t.tutor_gender_pref, t.tutor_from, t.requirements_public, t.start_note, t.posted_at, open ? null : t.closed_at ?? null);
});
await insert(leads, (l) => DB.prepare(
  `INSERT INTO leads (client_id, phone, guardian_name, class_level, medium, student_gender, tutor_gender, subjects, area, address, salary, days_per_week, lead_source, status,
     created_at, synced_at, guardian_id, tuition_code, status_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
).bind(l.client_id, l.phone, l.guardian_name, l.class_level, l.medium, l.student_gender, l.tutor_gender, l.subjects, l.area, l.address, l.salary, l.days, l.source, l.status,
  l.created_at, l.created_at, l.guardian_id, l.tuition_code, l.status === "new" ? null : l.created_at + 3600));
const leadIds = new Map((await DB.prepare(`SELECT id, tuition_code FROM leads WHERE tuition_code IS NOT NULL`).all()).results.map((r) => [r.tuition_code, r.id]));
await insert(tuitions, (t) => DB.prepare(
  `INSERT INTO tuition_private (tuition_code, guardian_id, guardian_label, exact_address, lead_source, lead_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
).bind(t.code, t.guardian.id, t.guardian.name ?? pick(["Sir", "Madam"]), t.address, t.lead_source, leadIds.get(t.code) ?? null, t.posted_at, t.posted_at));
await insert(applications, (a) => DB.prepare(
  `INSERT INTO applications (id, tuition_code, tutor_id, note, status, source, created_at, updated_at, called_at, met_at, demo_done_at) VALUES (?, ?, ?, ?, ?, 'site', ?, ?, ?, ?, ?)`,
).bind(a.id, a.tuition_code, a.tutor_id, a.note, a.status, a.created_at, a.updated_at, a.called_at, a.met_at, a.demo_done_at));
await insert(events, (e) => DB.prepare(`INSERT INTO application_events (application_id, from_status, to_status, reason, created_at) VALUES (?, ?, ?, ?, ?)`)
  .bind(e.application_id, e.from, e.to, e.reason ?? null, e.at));
await insert(placements, (p) => DB.prepare(
  `INSERT INTO placements (tuition_code, application_id, tutor_id, status, agreed_salary, selected_at, confirmed_at, created_at, updated_at) VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?)`,
).bind(p.tuition_code, p.application_id, p.tutor_id, p.agreed, p.confirmed_at, p.confirmed_at, p.confirmed_at, p.confirmed_at));

// A few drafts posted from today's calls, waiting for their public wording.
const drafts = leads.filter((l) => l.status === "called").slice(0, 2);
for (const l of drafts) {
  code++;
  await DB.batch([
    DB.prepare(`INSERT OR IGNORE INTO guardians (phone, name, created_at) VALUES (?, ?, ?)`).bind(l.phone, l.guardian_name, l.created_at),
    DB.prepare(`INSERT INTO tuitions (code, status, is_public, class_level, medium, subjects, area, salary_kind, salary_amount, days_per_week, student_gender, tutor_gender_pref)
                VALUES (?, 'draft', 0, ?, ?, ?, ?, 'fixed', ?, 4, ?, ?)`).bind(code, l.class_level, l.medium, l.subjects, l.area, l.salary, l.student_gender, l.tutor_gender),
    DB.prepare(`INSERT INTO tuition_private (tuition_code, guardian_id, exact_address, lead_source, lead_id, created_at, updated_at)
                VALUES (?, (SELECT id FROM guardians WHERE phone = ?), ?, ?, (SELECT id FROM leads WHERE client_id = ?), ?, ?)`).bind(code, l.phone, l.address, l.source, l.client_id, NOW, NOW),
    DB.prepare(`UPDATE leads SET status = 'posted', tuition_code = ?, status_at = ? WHERE client_id = ?`).bind(code, NOW - 1800, l.client_id),
  ]);
}

console.log("Drawing", tutors.filter((u) => u.photo).length, "avatars");
for (const u of tutors.filter((x) => x.photo)) {
  const webp = await sharp(Buffer.from(avatarSvg(u))).resize(400, 400).webp({ quality: 78 }).toBuffer();
  await env.PHOTOS.put(`tutors/T${u.code}.webp`, webp, { httpMetadata: { contentType: "image/webp" } });
}

const counts = await DB.prepare(`SELECT (SELECT count(*) FROM tutors) tutors, (SELECT count(*) FROM tuitions) tuitions, (SELECT count(*) FROM applications) applications,
  (SELECT count(*) FROM leads) leads, (SELECT count(*) FROM placements) placements, (SELECT count(*) FROM tuitions WHERE status = 'available') open`).first();
console.log("Synthetic data ready:", counts);
await dispose();
