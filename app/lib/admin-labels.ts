// Status words and allowed moves for the admin screens. The moves mirror the triggers in migrations 0003 and 0005.

export const ADMIN_PAGE_SIZE = 30;

export const TUITION_STATUS: Record<string, string> = {
  draft: "খসড়া",
  available: "খালি আছে",
  processing: "প্রক্রিয়াধীন",
  booked: "বুকড",
  cancelled: "বাতিল",
  closed: "বন্ধ",
};

export const TUITION_MOVES: Record<string, string[]> = {
  draft: ["available", "cancelled", "closed"],
  available: ["processing", "booked", "cancelled", "closed"],
  processing: ["available", "booked", "cancelled", "closed"],
  booked: ["available", "closed"],
  cancelled: ["closed"],
  closed: [],
};

export const APPLICATION_STATUS: Record<string, string> = {
  submitted: "নতুন আবেদন",
  under_review: "দেখা হচ্ছে",
  shortlisted: "শর্টলিস্ট",
  trial_arranged: "ট্রায়াল ঠিক হয়েছে",
  confirmed: "কনফার্ম",
  not_selected: "বাছাই হয়নি",
  withdrawn: "প্রত্যাহার",
  opportunity_closed: "টিউশন বন্ধ",
};

// The admin never picks withdrawn (the tutor does) or opportunity_closed (the system does).
export const APPLICATION_MOVES: Record<string, string[]> = {
  submitted: ["under_review", "not_selected"],
  under_review: ["shortlisted", "not_selected"],
  shortlisted: ["trial_arranged", "not_selected"],
  trial_arranged: ["confirmed", "shortlisted", "not_selected"],
};

export const REVIEW_ISSUE: Record<string, string> = {
  email_invalid: "ইমেইল নেই",
  phone_invalid: "ফোন নম্বর ঠিক নেই",
  tutor_code_repeated: "টিউটর কোড দুইবার আছে",
  tutor_phone_repeated: "একই ফোন অন্য টিউটরেরও",
  tutor_email_repeated: "একই ইমেইল অন্য টিউটরেরও",
  tutor_name_missing: "নাম নেই",
  tutor_changed_fee_terms: "ফি-শর্ত নিজের মতো লিখেছেন",
  subject_unknown: "বিষয় চেনা যায়নি",
  tuition_code_repeated: "টিউশন কোড দুইবার আছে",
  class_missing: "ক্লাস নেই",
  class_unknown: "ক্লাস চেনা যায়নি",
  area_missing: "এলাকা নেই",
  area_unknown: "এলাকা চেনা যায়নি",
  days_missing: "সপ্তাহে কত দিন লেখা নেই",
  days_unclear: "দিনের সংখ্যা পরিষ্কার নয়",
  salary_missing: "বেতন নেই",
  salary_unclear: "বেতন পরিষ্কার নয়",
  salary_unreadable: "বেতন পড়া যায়নি",
  salary_under_2000: "বেতন ৳২,০০০-এর কম",
  guardian_phone_missing: "গার্ডিয়ানের নম্বর নেই",
  tuition_status_blank: "স্ট্যাটাস নেই",
};
