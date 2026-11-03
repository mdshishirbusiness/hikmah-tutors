// Synthetic tuitions and a synthetic tutor for the design lab (/design). Never real people or posts.
import { AREAS, MEDIUMS, SUBJECTS, labelOf } from "~/lib/options";
import { feeDisplay, perClass as realPerClass, type PublicTuition } from "~/lib/tuition";

export type Check = { ok: boolean; short: string; title: string; detail: string };
/** A public tuition plus what the lab pretends to know: its real class label, the viewer's fit and distance. */
export type LabTuition = PublicTuition & { salary_amount: number; level: string; fresh: boolean; hours: string; ago: string; applied: number; when: string; km: string; checks: Check[] };
export type Plan = "standard" | "early";

export const ME = { name: "নুসরাত জাহান", first: "নুসরাত", from: "বিনোদপুর" };

const base = { status: "open", accepting_applications: true, mode: "home", salary_kind: "fixed", salary_period: "per_month", is_available: true, posted_at: null, session_minutes: null, time_of_day: null, applicants: 0 } as const;

export const T1: LabTuition = {
  ...base,
  code: 1042,
  code_label: "HT-1042",
  class_level: "ssc",
  level: "SSC 27",
  medium: "bangla",
  subjects: ["math", "physics", "chemistry"],
  area: "uposhohor",
  salary_amount: 5000,
  days_per_week: 4,
  student_gender: "girl",
  tutor_gender_pref: "female",
  tutor_from: [],
  requirements_public: "RU science faculty, patient female tutor needed",
  start_note: "ডিসেম্বরের শুরু থেকে",
  fresh: true,
  hours: "১.৫ ঘণ্টা",
  ago: "২৫ মিনিট আগে",
  applied: 6,
  when: "বিকেলে",
  km: "~৬ কিমি",
  checks: [
    { ok: true, short: "মহিলা টিউটর", title: "মহিলা টিউটর চাওয়া হয়েছে", detail: "আপনার প্রোফাইলের সাথে মেলে" },
    { ok: true, short: "আপনার বিষয়", title: "গণিত, পদার্থ, রসায়ন", detail: "তিনটিই আপনার পড়ানোর বিষয়" },
    { ok: true, short: "পছন্দের এলাকা", title: "উপশহর", detail: "আপনার পছন্দের এলাকার তালিকায় আছে" },
    { ok: true, short: "আপনার ক্লাস", title: "SSC 27", detail: "এই ক্লাস আপনি পড়ান" },
  ],
};

export const T2: LabTuition = {
  ...base,
  code: 1039,
  code_label: "HT-1039",
  class_level: "ssc",
  level: "Class 9",
  medium: "ev",
  subjects: ["english", "bangla"],
  area: "kazla",
  salary_amount: 4000,
  days_per_week: 3,
  student_gender: "boy",
  tutor_gender_pref: "any",
  tutor_from: [],
  requirements_public: "Experienced tutor needed, good at English grammar",
  start_note: "যত দ্রুত সম্ভব",
  fresh: false,
  hours: "১ ঘণ্টা",
  ago: "৩ ঘণ্টা আগে",
  applied: 11,
  when: "সন্ধ্যায়",
  km: "~১ কিমি",
  checks: [
    { ok: true, short: "যেকোনো টিউটর", title: "যেকোনো টিউটর চলবে", detail: "আপনি মিলে যান" },
    { ok: false, short: "বিষয় মেলেনি", title: "ইংরেজি, বাংলা", detail: "আপনার প্রোফাইলের বিষয়ে নেই" },
    { ok: true, short: "পছন্দের এলাকা", title: "কাজলা", detail: "আপনার পছন্দের এলাকার তালিকায় আছে" },
    { ok: true, short: "আপনার ক্লাস", title: "Class 9", detail: "এই ক্লাস আপনি পড়ান" },
  ],
};

export const T3: LabTuition = {
  ...base,
  status: "processing",
  code: 1036,
  code_label: "HT-1036",
  class_level: "hsc",
  level: "HSC 27",
  medium: "bangla",
  subjects: ["physics", "hmath"],
  area: "talaimari",
  salary_amount: 6000,
  days_per_week: 4,
  student_gender: "boy",
  tutor_gender_pref: "male",
  tutor_from: [],
  requirements_public: "RUET/RU engineering student preferred",
  start_note: "এই মাসেই",
  fresh: false,
  hours: "২ ঘণ্টা",
  ago: "২ দিন আগে",
  applied: 14,
  when: "সন্ধ্যায়",
  km: "~২ কিমি",
  checks: [
    { ok: false, short: "Male Tutor চাওয়া", title: "Male Tutor চাওয়া হয়েছে", detail: "আপনার প্রোফাইলের সাথে মেলে না" },
    { ok: true, short: "আপনার বিষয়", title: "পদার্থ, উচ্চতর গণিত", detail: "আপনার পড়ানোর বিষয়" },
    { ok: true, short: "পছন্দের এলাকা", title: "তালাইমারী", detail: "আপনার পছন্দের এলাকার তালিকায় আছে" },
    { ok: true, short: "আপনার ক্লাস", title: "HSC 27", detail: "এই ক্লাস আপনি পড়ান" },
  ],
};

export const area = (t: PublicTuition) => labelOf(AREAS, t.area);
export const mediumEn = (t: PublicTuition) => labelOf(MEDIUMS, t.medium);
export const cls = (t: LabTuition) => t.level;
export const medium = (t: PublicTuition) => labelOf(MEDIUMS, t.medium);
export const subjects = (t: PublicTuition, sep = ", ") => t.subjects.map((s) => labelOf(SUBJECTS, s)).join(sep);
export const student = (t: PublicTuition) => (t.student_gender === "girl" ? "মেয়ে" : "ছেলে");
export const need = (t: PublicTuition) => ({ female: "মহিলা", male: "পুরুষ", any: "যেকোনো" })[t.tutor_gender_pref];
export const fees = (t: LabTuition) => feeDisplay(t);
export const perClass = (t: LabTuition) => realPerClass(t) ?? 0;
export const planFee = (t: LabTuition, p: Plan) => (p === "early" ? fees(t).early_total : fees(t).standard_total);
export const fit = (t: LabTuition) => ({ ok: t.checks.filter((c) => c.ok).length, total: t.checks.length, miss: t.checks.find((c) => !c.ok) });

export const PLAN_NAME: Record<Plan, string> = { standard: "স্ট্যান্ডার্ড", early: "আর্লি পেমেন্ট" };
// PRD §7.2 wording, split into its two alternatives. Keep verbatim.
export const PLAN_TERMS: Record<Plan, string> = {
  standard: "মোট ৬০% পরিশোধ করব (৩০% কনফার্মেশনের পর + বাকি ৩০% প্রথম স্যালারি পেয়ে)",
  early: "জয়েন করার ৭ দিনের মধ্যে ৫০% পরিশোধ করব (ডিসকাউন্ট অফার)",
};

// The tutor-facing application statuses (PRD FR-APP-003), in order.
export const STEPS = [
  { name: "Submitted", note: "এইমাত্র" },
  { name: "Under review", note: "আমরা প্রোফাইল দেখব" },
  { name: "Shortlisted", note: "ফোন করে জানাব" },
  { name: "Demo class", note: "গার্ডিয়ানের বাসায় ২টি ক্লাস" },
  { name: "Confirmed", note: "এরপর ফি, একবারই" },
];
