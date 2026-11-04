// Ready-made WhatsApp texts for the admin (owner, 2026-11-04). The guardian's summary never carries a photo, Facebook,
// address or (before Selected) the tutor's phone, so a guardian cannot go round HTR.
import { AREAS, SUBJECTS, labelOf } from "./options";
import { classLabel, requirementLabels, subjectLabel, windowLabel } from "./request";
import { bandOf, tutorFromLabel } from "./fit";
import { taka } from "./tuition";

const PREFIX = /^(md\.?|mohammad|mohammed|muhammad|mohd\.?|mst\.?|most\.?|mosammat|sk\.?|sheikh)$/i;

/** "Md. Rahim Uddin" → "Rahim": the guardian sees a first name only. */
export function firstName(full: string | null): string {
  const words = (full ?? "").trim().split(/\s+/).filter(Boolean);
  return words.find((w) => !PREFIX.test(w)) ?? words[0] ?? "";
}

type Tuition = { code: number; class_level: string; class_other?: string | null; area: string; salary_kind: string; salary_amount: number | null };
type Tutor = {
  tutor_code: number | null; name: string | null; phone: string | null; institution: string | null; department: string | null;
  session_year: string | null; ssc_group: string | null; ssc_result: string | null; hsc_group: string | null; hsc_result: string | null;
  experience: string | null;
};

const what = (t: Tuition) =>
  [classLabel(t.class_level, t.class_other), labelOf(AREAS, t.area), t.salary_kind === "fixed" && t.salary_amount ? `${taka(t.salary_amount)}/month` : ""]
    .filter(Boolean).join(" · ");

const result = (group: string | null, gpa: string | null) => [group, gpa && `GPA ${gpa}`].filter(Boolean).join(", ");

/**
 * The tutor's summary the admin sends to the guardian. `withPhone` only once the tutor is Selected. With no tuition
 * (the tutor's own preview on Profile) the code reads "HTR-…".
 */
export function guardianSummary(t: Pick<Tuition, "code"> | null, a: Tutor, subjects: string[], withPhone: boolean): string {
  const ssc = result(a.ssc_group, a.ssc_result), hsc = result(a.hsc_group, a.hsc_result);
  const experience = a.experience?.replace(/\s+/g, " ").trim();
  return [
    `আসসালামু আলাইকুম। HTR-${t ? t.code : "…"}-এর জন্য টিউটরের তথ্য:`,
    "",
    `Tutor${a.tutor_code ? ` T-${a.tutor_code}` : ""}: ${firstName(a.name)}`,
    [a.institution, a.department, a.session_year && `Session ${a.session_year}`].filter(Boolean).join(" · "),
    [ssc && `SSC: ${ssc}`, hsc && `HSC: ${hsc}`].filter(Boolean).join(" · "),
    subjects.length ? `Teaches: ${subjects.map((s) => labelOf(SUBJECTS, s)).join(", ")}` : "",
    experience ? `Experience: ${experience.length > 220 ? `${experience.slice(0, 217)}…` : experience}` : "",
    withPhone && a.phone ? `Phone: ${a.phone}` : "",
    "",
    "— Hikmah Tutors",
  ].filter((line, i, all) => line !== "" || (i > 0 && all[i - 1] !== "")).join("\n");
}

/** The message the admin sends the tutor when they are shortlisted or selected. */
export function tutorMessage(t: Tuition, a: Pick<Tutor, "name">, step: "shortlisted" | "selected"): string {
  const hello = `Assalamu alaikum ${firstName(a.name)}, Hikmah Tutors here.`;
  return step === "shortlisted"
    ? `${hello} You're shortlisted for HTR-${t.code} (${what(t)}). We'll let you know after talking to the guardian.`
    : `${hello} You're selected for HTR-${t.code} (${what(t)}). We'll send the guardian's number next; please call them within 3 hours.`;
}

type Post = Tuition & {
  subjects: string; days_per_week: number; tutor_gender_pref: string; requirements_public: string; medium: string;
  subject_other?: string | null; requirement_keys?: string | null; time_from?: number | null; time_to?: number | null;
  student_gender?: string | null; tutor_from?: string | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dhakaDate = (d = new Date(Date.now() + 6 * 3600 * 1000)) => `${String(d.getUTCDate()).padStart(2, "0")}/${MONTHS[d.getUTCMonth()]}/${d.getUTCFullYear()}`;

/** The facts both posts share, in the owner's order; a line the tuition doesn't have is left out. */
function postLines(t: Post) {
  const subjects = t.subjects.split(",").filter(Boolean).map((s) => subjectLabel(s, t.subject_other)).join(", ");
  const gender = t.tutor_gender_pref === "female" ? "Female" : t.tutor_gender_pref === "male" ? "Male" : "Male/Female";
  const from = tutorFromLabel((t.tutor_from ?? "").split(",").filter(Boolean));
  const band = bandOf(t.class_level);
  const asks = [
    ...requirementLabels((t.requirement_keys ?? "").split(",").filter(Boolean)),
    t.requirements_public.trim(),
    // Every SSC/HSC-level post says it (owner's post rules).
    (band === "ssc" || band === "hsc") && !(t.requirement_keys ?? "").includes("experienced") ? "পূর্ব অভিজ্ঞতা অগ্রাধিকার পাবে" : "",
  ].filter(Boolean);
  return {
    gender, from, subjects, asks,
    cls: classLabel(t.class_level, t.class_other),
    facts: [
      `Tuition Code: HTR-${t.code}`,
      `Class: ${classLabel(t.class_level, t.class_other)}`,
      subjects && `Subject: ${subjects}`,
      `Weekly: ${t.days_per_week} দিন`,
      `Salary: ${t.salary_kind === "fixed" && t.salary_amount ? taka(t.salary_amount) : "৳ আলোচনা সাপেক্ষে"}`,
      windowLabel(t.time_from, t.time_to) && `Time: ${windowLabel(t.time_from, t.time_to)}`,
      `Location: ${labelOf(AREAS, t.area)}, Rajshahi`,
      t.student_gender && `Student: ${t.student_gender === "girl" ? "Female" : "Male"}`,
      `Tutor: ${gender}${from ? ` (${from})` : ""}`,
    ].filter(Boolean) as string[],
  };
}

/**
 * Facebook group post, in the owner's template (owner, 2026-11-05). No link: links cut a post's reach, and tutors
 * get the apply link by inbox. No emoji, no guardian details.
 */
export function facebookPost(t: Post): string {
  const l = postLines(t);
  return [
    `1 New Tuition Offer — ${dhakaDate()}`,
    "",
    `১ জন ${l.from ? `${l.from} ` : ""}${l.gender} Tutor প্রয়োজন।`,
    "",
    ...l.facts,
    ...(l.asks.length ? [`Requirement: ${l.asks.join("; ")}`] : []),
    "",
    "Apply Procedure",
    "",
    "Interested লিখে কমেন্ট করুন।",
    "",
    "অথবা ইনবক্সে Interested লিখুন, আবেদনের লিংক দেওয়া হবে। শুধুমাত্র আবেদনকারীদের মধ্য থেকেই Tutor সিলেক্ট করা হবে।",
    "",
    "নতুন টিউশন অফার সবার আগে পেতে আমাদের WhatsApp Community-তে যুক্ত থাকুন।",
  ].join("\n");
}

/** WhatsApp post, in the owner's template, ending with the link to apply on the site. */
export function whatsappPost(t: Post, origin: string): string {
  const l = postLines(t);
  return [
    `১ জন ${l.gender} Tutor প্রয়োজন (${l.cls}${l.subjects ? ` — ${l.subjects}` : ""})`,
    "",
    ...l.facts,
    ...(l.asks.length ? ["", `Guardian Requirement: ${l.asks.join("; ")}`] : []),
    "",
    "আগ্রহী শিক্ষকরা নিচের লিংকে সরাসরি আবেদন করুন।",
    `Apply here: ${origin}/tuitions/HTR-${t.code}`,
  ].join("\n");
}
