// Ready-made WhatsApp texts for the admin (owner, 2026-11-04). The guardian's summary never carries a photo, Facebook,
// address or (before Selected) the tutor's phone, so a guardian cannot go round HTR.
import { AREAS, CLASS_LEVELS, SUBJECTS, labelOf } from "./options";
import { taka } from "./tuition";

const PREFIX = /^(md\.?|mohammad|mohammed|muhammad|mohd\.?|mst\.?|most\.?|mosammat|sk\.?|sheikh)$/i;

/** "Md. Rahim Uddin" → "Rahim": the guardian sees a first name only. */
export function firstName(full: string | null): string {
  const words = (full ?? "").trim().split(/\s+/).filter(Boolean);
  return words.find((w) => !PREFIX.test(w)) ?? words[0] ?? "";
}

type Tuition = { code: number; class_level: string; area: string; salary_kind: string; salary_amount: number | null };
type Tutor = {
  tutor_code: number | null; name: string | null; phone: string | null; institution: string | null; department: string | null;
  session_year: string | null; ssc_group: string | null; ssc_result: string | null; hsc_group: string | null; hsc_result: string | null;
  experience: string | null;
};

const what = (t: Tuition) =>
  [labelOf(CLASS_LEVELS, t.class_level), labelOf(AREAS, t.area), t.salary_kind === "fixed" && t.salary_amount ? `${taka(t.salary_amount)}/month` : ""]
    .filter(Boolean).join(" · ");

const result = (group: string | null, gpa: string | null) => [group, gpa && `GPA ${gpa}`].filter(Boolean).join(", ");

/** The tutor's summary the admin sends to the guardian. `withPhone` only once the tutor is Selected. */
export function guardianSummary(t: Tuition, a: Tutor, subjects: string[], withPhone: boolean): string {
  const ssc = result(a.ssc_group, a.ssc_result), hsc = result(a.hsc_group, a.hsc_result);
  const experience = a.experience?.replace(/\s+/g, " ").trim();
  return [
    `আসসালামু আলাইকুম। HTR-${t.code}-এর জন্য টিউটরের তথ্য:`,
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
