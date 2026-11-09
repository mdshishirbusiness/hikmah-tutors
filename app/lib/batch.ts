// Admission batch teachers (owner, 2026-11-09): choices and the checks shared by the application page and the server.
// The database stores the keys; never change a key that is in use, only its label.
import type { Option } from "./options";
import { bdPhone } from "./lead";

export const BATCH_APPLY = "/batch/apply";

export const BATCH_TRACKS: Option[] = [
  { key: "humanities", label: "Group change (Humanities)", alt: "বিভাগ পরিবর্তন B unit" },
  { key: "science", label: "Science (university)", alt: "বিজ্ঞান ভার্সিটি" },
  { key: "engineering", label: "Engineering", alt: "ইঞ্জিনিয়ারিং BUET RUET" },
  { key: "medical", label: "Medical", alt: "মেডিকেল" },
];

export const BATCH_SUBJECTS: Option[] = [
  { key: "english", label: "English", alt: "ইংরেজি" },
  { key: "bangla", label: "Bangla", alt: "বাংলা" },
  { key: "gk", label: "GK", alt: "সাধারণ জ্ঞান general knowledge" },
  { key: "physics", label: "Physics", alt: "পদার্থ" },
  { key: "chemistry", label: "Chemistry", alt: "রসায়ন" },
  { key: "math", label: "Math", alt: "গণিত" },
  { key: "hmath", label: "Higher Math", alt: "উচ্চতর গণিত" },
  { key: "biology", label: "Biology", alt: "জীববিজ্ঞান" },
  { key: "ict", label: "ICT", alt: "আইসিটি" },
  { key: "other", label: "Other", alt: "অন্যান্য" },
];

export const BATCH_MODES: Option[] = [
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline (Rajshahi)" },
  { key: "both", label: "Both" },
];

export const BATCH_SETUP: Option[] = [
  { key: "laptop", label: "Laptop" },
  { key: "pen_tablet", label: "Pen tablet" },
  { key: "quiet_room", label: "Quiet room" },
  { key: "can_record", label: "Can record classes" },
];

export const BATCH_INTERNET: Option[] = [
  { key: "broadband", label: "Broadband / Wi-Fi" },
  { key: "mobile", label: "Mobile data" },
];

export const BATCH_TOOLS: Option[] = [
  { key: "meet", label: "Google Meet" },
  { key: "zoom", label: "Zoom" },
  { key: "obs", label: "OBS / screen record" },
  { key: "whiteboard", label: "Whiteboard app" },
  { key: "slides", label: "Slides" },
];

export const BATCH_DAYS: Option[] = [
  { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" }, { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" }, { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" },
];

export const BATCH_TIMES: Option[] = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "night", label: "Night" },
];

// New → Called → Demo → Shortlisted → Final, or Not now (owner, 2026-11-09). The owner may move between any of them.
export const BATCH_STATUSES: Option[] = [
  { key: "new", label: "New" },
  { key: "called", label: "Called" },
  { key: "demo", label: "Demo" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "final", label: "Final" },
  { key: "not_now", label: "Not now" },
];

/** Ready to teach online: a laptop and a pen tablet. */
export const onlineReady = (setup: string[]) => setup.includes("laptop") && setup.includes("pen_tablet");

export const splitKeys = (s: string | null) => (s ?? "").split(",").filter(Boolean);

export type BatchAnswers = {
  full_name: string; phone: string; university: string | null; department: string | null; session_year: string | null;
  tracks: string[]; subjects: string[]; subject_other: string | null; admission_result: string | null;
  experience_years: number | null; admission_students: number | null; experience: string | null;
  mode: string; setup: string[]; internet: string | null; tools: string[]; days: string[]; times: string[];
  pay_per_class: number | null; demo_url: string | null; note: string | null;
};

const text = (form: FormData, name: string, max: number) => {
  const v = String(form.get(name) ?? "").trim().replace(/\s+\n/g, "\n");
  return v ? v.slice(0, max) : null;
};
const picks = (form: FormData, name: string, list: Option[]) => [...new Set(form.getAll(name).map(String))].filter((k) => list.some((o) => o.key === k));
const whole = (form: FormData, name: string, max: number): number | null | false => {
  const raw = String(form.get(name) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : false;
};

/** Reads and checks the form; returns the answers or the first problem in plain words. */
export function readBatchForm(form: FormData): { answers: BatchAnswers } | { error: string } {
  const full_name = text(form, "full_name", 80);
  const phone = bdPhone(form.get("phone"));
  const tracks = picks(form, "tracks", BATCH_TRACKS);
  const subjects = picks(form, "subjects", BATCH_SUBJECTS);
  const subject_other = subjects.includes("other") ? text(form, "subject_other", 80) : null;
  const mode = String(form.get("mode") ?? "");
  const online = mode === "online" || mode === "both";
  const experience_years = whole(form, "experience_years", 40);
  const admission_students = whole(form, "admission_students", 10000);
  const pay_per_class = whole(form, "pay_per_class", 100000);
  const demo = text(form, "demo_url", 300);
  const internet = String(form.get("internet") ?? "");

  if (!full_name || full_name.length < 2) return { error: "Write your name." };
  if (!phone) return { error: "Phone number not valid (11 digits, 01…)." };
  if (!tracks.length) return { error: "Pick at least one admission track." };
  if (!subjects.length) return { error: "Pick the subjects you can teach." };
  if (subjects.includes("other") && !subject_other) return { error: "Write the other subject." };
  if (!BATCH_MODES.some((m) => m.key === mode)) return { error: "Pick online, offline or both." };
  if (experience_years === false || admission_students === false) return { error: "Experience must be a whole number." };
  if (pay_per_class === false) return { error: "Pay per class must be a number in taka." };
  if (demo && !/^https?:\/\/\S+$/i.test(demo)) return { error: "Demo link must start with https://" };

  return {
    answers: {
      full_name, phone, university: text(form, "university", 80), department: text(form, "department", 80), session_year: text(form, "session_year", 20),
      tracks, subjects, subject_other, admission_result: text(form, "admission_result", 200),
      experience_years, admission_students, experience: text(form, "experience", 600),
      mode, setup: online ? picks(form, "setup", BATCH_SETUP) : [], internet: online && BATCH_INTERNET.some((o) => o.key === internet) ? internet : null,
      tools: online ? picks(form, "tools", BATCH_TOOLS) : [], days: picks(form, "days", BATCH_DAYS), times: picks(form, "times", BATCH_TIMES),
      pay_per_class, demo_url: demo, note: text(form, "note", 600),
    },
  };
}
