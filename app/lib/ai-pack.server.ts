// The applicant pack for an AI chat (owner, 2026-11-08): the tuition, then every open applicant's own words and whole
// profile, as one text the owner pastes into Gemini or Claude.ai to get a judged top 5. The rule scores read how much a
// tutor filled in; an AI can read what they wrote. No name, phone, Gmail, NID, photo, Facebook or document goes in,
// and phone numbers, emails and links are cut out of what tutors typed. Admin only.
import { env } from "cloudflare:workers";
import { getTuition } from "./admin.server";
import { bandOf, freeLabel } from "./fit";
import { AREAS, CLASS_LEVELS, MEDIUMS, SUBJECTS, TRANSPORTS, labelOf } from "./options";
import { HABITS, type Band, type Level, type Student, bandShort, habitAnswer, periodLabel } from "./profile";
import { cutPhones } from "./redact";
import { classLabel } from "./request";
import { taka } from "./tuition";
import { postLines } from "./whatsapp";

const OPEN = new Set(["submitted", "under_review", "shortlisted", "trial_arranged", "confirmed"]);
const BANDS: Band[] = ["junior", "ssc", "hsc"];
const STATEMENTS: [string, string][] = [
  ["junior_experience", "Junior experience (own words)"], ["junior_strategy", "Junior teaching plan"],
  ["ssc_experience", "SSC experience (own words)"], ["ssc_strategy", "SSC teaching plan"],
  ["hsc_experience", "HSC experience (own words)"], ["hsc_strategy", "HSC teaching plan"],
  ["english_experience", "English medium experience"], ["special_skills", "Special skills"], ["skills_detail", "Skills in detail"],
];

const PROMPT = `Help Hikmah Tutors (home tutors, Rajshahi) choose a tutor for the tuition below. Applicants are by code;
names and contacts are removed on purpose.
Judge the expertise each tutor shows in their own words, not how much they wrote: specific, believable detail
(classes taught, results before and after, how they teach) beats long generic text.
For every applicant: expertise 0-10 for Junior, SSC and HSC and for each subject this tuition needs ("no evidence"
where none); writing 0-10 (clear, specific, believable); fit (gender, area, time, salary, guardian's wishes); one
line why, quoting their words; doubts.
Then the top 5, best first, with reasons, and whom to call first. Say when evidence is thin; invent nothing.
Answer in Bangla (চলিত); keep codes, subject names and numbers in English.`;

/** Cuts phone numbers, emails and links out of what a tutor typed. */
const scrub = (s: string | null | undefined) =>
  cutPhones((s ?? "").replace(/https?:\/\/\S+|www\.\S+/gi, "[link]").replace(/\S+@\S+\.\S+/g, "[email]")).trim();
const list = (keys: string | null | undefined, options = SUBJECTS) => (keys ?? "").split(",").filter(Boolean).map((k) => labelOf(options, k) || k).join(", ");

/** The classes a tutor wants at this tuition's level only; the rest as a count. */
function wantedClasses(keys: string, band: Band | null) {
  const all = keys.split(",").filter(Boolean);
  const here = all.filter((k) => !band || bandOf(k) === band);
  return `Classes they want at this level: ${here.map((k) => labelOf(CLASS_LEVELS, k) || k).join(", ") || "none"}${all.length > here.length ? ` (+${all.length - here.length} other)` : ""}`;
}

async function all<T>(sql: string, ...args: unknown[]): Promise<T[]> {
  return (await env.DB.prepare(sql).bind(...args).all<T>()).results;
}

export async function aiPack(code: number): Promise<{ text: string; count: number } | null> {
  const found = await getTuition(code);
  if (!found) return null;
  const { tuition: t, priv } = found;
  const applicants = found.applicants.filter((a) => OPEN.has(a.status));
  const ids = JSON.stringify(applicants.map((a) => a.tutor_id).filter(Boolean));
  const inIds = `tutor_id IN (SELECT value FROM json_each(?))`;
  const [extra, statements, levels, subjects, students] = await Promise.all([
    all<{ id: number; skills: string | null; mediums: string | null }>(`SELECT id, skills, mediums FROM tutors WHERE id IN (SELECT value FROM json_each(?))`, ids),
    all<{ tutor_id: number; kind: string; body: string }>(`SELECT tutor_id, kind, body FROM tutor_statements WHERE ${inIds}`, ids),
    all<Level & { tutor_id: number }>(`SELECT * FROM tutor_levels WHERE ${inIds}`, ids),
    all<{ tutor_id: number; band: string; subject: string }>(`SELECT tutor_id, band, subject FROM tutor_subjects WHERE ${inIds}`, ids),
    all<Student & { tutor_id: number }>(`SELECT * FROM tutor_students WHERE ${inIds} ORDER BY COALESCE(ended, '9999-12') DESC, started DESC`, ids),
  ]);
  const of = <T extends { tutor_id: number }>(rows: T[], id: number | null) => rows.filter((r) => r.tutor_id === id);

  const l = postLines(t);
  const band = bandOf(t.class_level);
  const tuition = [
    "## The tuition",
    ...l.facts,
    `Level: ${bandShort(band ?? "ssc")}`,
    t.medium && `Medium: ${labelOf(MEDIUMS, t.medium)}`,
    l.asks.length ? `Requirements: ${l.asks.join("; ")}` : "",
    priv?.tutor_qualification && `Guardian's wish about the tutor: ${scrub(priv.tutor_qualification)}`,
  ].filter(Boolean).join("\n");

  const people = applicants.map((a, i) => {
    const id = a.tutor_id;
    const x = extra.find((e) => e.id === id);
    const ownLevels = of(levels, id);
    const own = of(statements, id);
    const lines: (string | number | false | null | undefined)[] = [
      `## Applicant ${i + 1}: ${a.tutor_code ? `T-${a.tutor_code}` : `A-${a.id}`}`,
      a.status !== "submitted" && `Status: ${a.status.replace("_", " ")}`,
      [a.gender && (a.gender === "female" ? "Female" : "Male"),
        [a.institution || a.shortcode, a.department, a.session_year && `session ${a.session_year}`].filter(Boolean).join(", ") || "studies not given"].filter(Boolean).join(" · "),
      [(a.ssc_result || a.ssc_group) && `SSC ${[a.ssc_group, a.ssc_result && `GPA ${a.ssc_result}`, a.ssc_marks && `${a.ssc_marks} marks`].filter(Boolean).join(" ")}`,
        (a.hsc_result || a.hsc_group) && `HSC ${[a.hsc_group, a.hsc_result && `GPA ${a.hsc_result}`, a.hsc_marks && `${a.hsc_marks} marks`].filter(Boolean).join(" ")}`].filter(Boolean).join(" · "),
      a.own_marks && `Own marks in this tuition's subjects (an SSC subject is out of 100, an HSC subject out of 200): ${a.own_marks.split(",").map((m) => { const [k, n] = m.split(":"); return `${labelOf(SUBJECTS, k)} ${n}`; }).join(", ")}`,
      a.admission_result && `Admission test: ${scrub(a.admission_result)}`,
      a.location && `Lives in: ${scrub(a.location)}`,
      a.areas && `Areas they teach in: ${list(a.areas, AREAS)}`,
      a.classes && wantedClasses(a.classes, band),
      a.free_times && `Free: ${freeLabel(a.free_times)}`,
      [a.min_salary && `lowest salary ${taka(a.min_salary)}`, a.transport && labelOf(TRANSPORTS, a.transport).toLowerCase(),
        a.demo_willing != null && (a.demo_willing ? "demo class willing" : "no demo class"), x?.mediums && list(x.mediums, MEDIUMS)]
        .filter(Boolean).join(" · ").replace(/^./, (c) => c.toUpperCase()) || null,
      id ? `With Hikmah: ${a.total_apps} applications, ${a.placed} placed, ${a.demos} demos${a.dropped ? `, ${a.dropped} didn't work out` : ""}` : "Applied without a tutor profile",
      BANDS.map((b) => {
        const s = of(subjects, id).filter((r) => r.band === b).map((r) => labelOf(SUBJECTS, r.subject) || r.subject);
        return s.length ? `${bandShort(b)} ${s.join(", ")}` : null;
      }).filter(Boolean).join("; ").replace(/^(?=.)/, "Subjects: "),
      a.note && `\nWhat they wrote when applying:\n${scrub(a.note)}`,
      a.about && `\nAbout them:\n${scrub(a.about)}`,
      x?.skills && `\nSkills:\n${scrub(x.skills)}`,
      ...ownLevels.map((v) => [
        `\n${bandShort(v.band)} level: ${[v.students != null && `${v.students} students`, v.years != null && `${v.years} years`].filter(Boolean).join(", ") || "no numbers"}`,
        ...HABITS.map((h) => { const ans = habitAnswer(v, h); return ans ? `- ${h.owner}: ${ans}` : null; }),
        v.approach && `- How they teach:\n${scrub(v.approach)}`,
        v.story && `- A student story:\n${scrub(v.story)}`,
      ].filter(Boolean).join("\n")),
      ...STATEMENTS.map(([kind, label]) => { const s = own.find((r) => r.kind === kind); return s?.body.trim() ? `\n${label}:\n${scrub(s.body)}` : null; }),
      of(students, id).length > 0 && `\nStudents they have taught:\n${of(students, id).map((s) => `- ${[
        classLabel(s.class_level, s.class_other), list(s.subjects), s.area && labelOf(AREAS, s.area), periodLabel(s.started, s.ended),
        (s.result_before || s.result_after) && `result ${s.result_before || "?"} → ${s.result_after || "?"}`, s.improvement && scrub(s.improvement),
      ].filter(Boolean).join(" · ")}`).join("\n")}`,
    ];
    return lines.filter(Boolean).join("\n");
  });

  const text = [PROMPT, `# HTR-${t.code}`, tuition, ...(people.length ? people : ["No open applicants."])].join("\n\n");
  return { text, count: applicants.length };
}
