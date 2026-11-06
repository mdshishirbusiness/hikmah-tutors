// Status words and allowed moves for the admin screens. The moves mirror the triggers in migrations 0003, 0005 and 0010.
import { AREAS, CLASS_CHOICES } from "./options";

export const ADMIN_PAGE_SIZE = 30;

export const TUITION_STATUS: Record<string, string> = {
  draft: "Draft",
  available: "Available",
  processing: "Processing",
  booked: "Booked",
  cancelled: "Cancelled",
  closed: "Closed",
};

export const TUITION_MOVES: Record<string, string[]> = {
  draft: ["available", "cancelled", "closed"],
  available: ["processing", "booked", "cancelled", "closed"],
  processing: ["available", "booked", "cancelled", "closed"],
  booked: ["available", "processing", "closed"],
  cancelled: ["closed"],
  closed: [],
};

export const APPLICATION_STATUS: Record<string, string> = {
  submitted: "Applied",
  under_review: "In review",
  shortlisted: "Shortlisted",
  trial_arranged: "Selected", // the tutor who gets the guardian's number and arranges the demo (owner, 2026-11-04)
  confirmed: "Confirmed",
  not_selected: "Not selected",
  withdrawn: "Withdrawn",
  opportunity_closed: "Tuition closed",
};

// The button that moves an application to each status.
export const APPLICATION_ACTION: Record<string, string> = {
  under_review: "Review",
  shortlisted: "Shortlist",
  trial_arranged: "Select",
  confirmed: "Confirm",
  not_selected: "Not selected",
};

// The admin never picks withdrawn (the tutor does) or opportunity_closed (the system does).
export const APPLICATION_MOVES: Record<string, string[]> = {
  submitted: ["under_review", "not_selected"],
  under_review: ["shortlisted", "not_selected"],
  shortlisted: ["trial_arranged", "not_selected"],
  trial_arranged: ["confirmed", "shortlisted", "not_selected"],
  confirmed: ["trial_arranged", "not_selected"], // undo a tutor's tick, or the match didn't work out
};

export const REVIEW_ISSUE: Record<string, string> = {
  email_invalid: "Email not valid",
  phone_invalid: "Phone number not valid",
  tutor_code_repeated: "Tutor code appears twice",
  tutor_phone_repeated: "Phone shared with another tutor",
  tutor_email_repeated: "Email shared with another tutor",
  tutor_name_missing: "No name",
  tutor_changed_fee_terms: "Wrote own fee terms",
  subject_unknown: "Subject not recognised",
  tuition_code_repeated: "Tuition code appears twice",
  class_missing: "No class",
  class_unknown: "Class not recognised",
  tuition_closed_as_old: "Open in the sheet, closed as old",
  class_batch_missing: "No SSC/HSC year",
  class_batch_unknown: "SSC/HSC batch not in the list",
  area_missing: "No area",
  area_unknown: "Area not recognised",
  days_missing: "Days per week missing",
  days_unclear: "Days per week unclear",
  salary_missing: "No salary",
  salary_unclear: "Salary unclear",
  salary_unreadable: "Salary unreadable",
  salary_under_2000: "Salary under ৳2,000",
  guardian_phone_missing: "No guardian number",
  tuition_status_blank: "No status",
};

// Why a selected tutor's match ended (owner, 2026-11-04); the key goes into the application event's reason.
// The tutor's reasons, in Bangla (owner, 2026-11-05). Keys are stored; labels may change.
/** The longest note a selected tutor can write on a tuition (tutor_notes, migration 0022). */
export const NOTE_MAX = 600;

export const DIDNT_WORK_OUT: Record<string, string> = {
  guardian_chose_other: "গার্ডিয়ান অন্য কাউকে নিয়েছেন",
  schedule: "সময় মেলেনি",
  salary: "বেতন মেলেনি",
  tutor_declined: "আমি নিজে না করেছি",
  other: "অন্য কারণ",
};

/** What must be filled before a tuition can go on the board (the same rules as updateTuition and the trigger). */
export function publishGaps(t: { class_level: string; area: string; medium: string; subjects: string; mode?: string }): string[] {
  const gaps = [];
  if (!CLASS_CHOICES.some((c) => c.key === t.class_level)) gaps.push("Class (one class or batch)");
  if (!AREAS.some((a) => a.key === t.area)) gaps.push("Area");
  if (!t.medium) gaps.push("Medium");
  if (!t.subjects) gaps.push("Subjects");
  return gaps;
}

/**
 * The rest of a tutor's personal details the admin can change (owner, 2026-11-06: admins change every personal detail;
 * staff, when added, get less). Name, phone, gender, university and Gmail have their own checks in setTutorAccount.
 */
export const TUTOR_DETAIL_FIELDS = [
  { key: "department", label: "Department", max: 80, group: "Study" },
  { key: "session_year", label: "Session", max: 20, group: "Study", placeholder: "2023-24" },
  { key: "admission_result", label: "Admission result", max: 300, group: "Study" },
  { key: "ssc_school", label: "SSC school", max: 120, group: "SSC" },
  { key: "ssc_year", label: "SSC year", max: 4, group: "SSC", year: true },
  { key: "ssc_group", label: "SSC group", max: 40, group: "SSC" },
  { key: "ssc_result", label: "SSC GPA", max: 20, group: "SSC" },
  { key: "ssc_marks", label: "SSC marks", max: 20, group: "SSC" },
  { key: "hsc_college", label: "HSC college", max: 120, group: "HSC" },
  { key: "hsc_year", label: "HSC year", max: 4, group: "HSC", year: true },
  { key: "hsc_group", label: "HSC group", max: 40, group: "HSC" },
  { key: "hsc_result", label: "HSC GPA", max: 20, group: "HSC" },
  { key: "hsc_marks", label: "HSC marks", max: 20, group: "HSC" },
  { key: "current_location", label: "Lives at (Rajshahi)", max: 120, group: "Address" },
  { key: "home_district", label: "Home district", max: 60, group: "Address" },
  { key: "home_division", label: "Home division", max: 60, group: "Address" },
  { key: "facebook_url", label: "Facebook link", max: 300, group: "Links", url: true },
] as const satisfies readonly { key: string; label: string; max: number; group: string; placeholder?: string; year?: boolean; url?: boolean }[];
