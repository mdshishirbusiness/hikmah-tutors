// Status words and allowed moves for the admin screens. The moves mirror the triggers in migrations 0003, 0005 and 0010.

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
export const DIDNT_WORK_OUT: Record<string, string> = {
  guardian_chose_other: "Guardian chose someone else",
  schedule: "Schedule didn't match",
  salary: "Salary didn't match",
  tutor_declined: "I declined",
  other: "Other reason",
};
