// Premium Tutor (owner, 2026-11-05, part E): the rules both the tutor's page and the admin's read. Money is whole taka.
import type { ProgressStep } from "./profile";

export const PREMIUM_TERMS_VERSION = "premium-2026-11-05";
export const PREMIUM_DAYS = 90;
export const PROBLEM_LIMIT = 3;
export const MIN_SALARY_FLOOR = 2000;

/** 50% of the tutor's minimum salary, rounded to the nearest ৳100. */
export const premiumPrice = (minSalary: number) => Math.round(minSalary / 200) * 100;

/** On a delivered tuition the tutor owes 50% of the real salary minus the deposit; a deposit above that comes back. */
export function feeLeft(realSalary: number, price: number) {
  const fee = Math.round(realSalary / 2);
  return { fee, left: Math.max(0, fee - price), refund: Math.max(0, price - fee) };
}

export type PremiumStatus = "applied" | "accepted" | "paid" | "active" | "declined" | "cancelled" | "delivered" | "ended";
export type EndReason = "delivered" | "day90_refund" | "problems" | "misconduct" | "htr_stopped";

export type PremiumMember = {
  id: number; tutor_id: number; status: PremiumStatus; min_salary: number; price: number;
  areas: string; anywhere: number; classes: string; subjects: string; terms_version: string;
  applied_at: number; decided_at: number | null; decline_note: string | null;
  pay_method: "bkash" | "nagad" | null; pay_from: string | null; pay_trx: string | null; pay_amount: number | null; paid_at: number | null;
  verified_at: number | null; starts_at: number | null; ends_at: number | null; renewals: number;
  placement_id: number | null; real_salary: number | null; first_salary_at: number | null; fee_left: number | null; fee_paid_at: number | null; fee_trx: string | null;
  updated_at: number; ended_at: number | null; end_reason: EndReason | null; refund_amount: number | null; refund_due_at: number | null; refund_sent_at: number | null; refund_trx: string | null;
};
export type PremiumProblem = { id: number; kind: ProblemKind; points: number; note: string | null; created_at: number };

export const PROBLEMS = {
  no_reply: { label: "No reply within 12 hours", bn: "12 ঘণ্টার মধ্যে উত্তর দেননি (সকাল 9টা–রাত 10টা)", points: 1 },
  refused: { label: "Refused a matching tuition", bn: "আপনার শর্তে মেলে এমন টিউশন নেননি", points: 1 },
  wrong_profile: { label: "Wrong or old profile details", bn: "প্রোফাইলের তথ্য ভুল বা পুরোনো", points: 1 },
  found_elsewhere: { label: "Didn't tell HTR about another tuition", bn: "অন্য জায়গায় টিউশন পেয়ে HTR-কে জানাননি", points: 1 },
  trial_missed: { label: "Missed or late to a demo class", bn: "ডেমো ক্লাসে আসেননি বা 30 মিনিটের বেশি দেরি (2 গোনা হয়)", points: 2 },
} as const;
export type ProblemKind = keyof typeof PROBLEMS;

export const problemPoints = (ps: Pick<PremiumProblem, "points">[]) => ps.reduce((n, p) => n + p.points, 0);

export const END_REASON: Record<EndReason, string> = {
  delivered: "Tuition delivered", day90_refund: "Refund after 90 days", problems: "3 problems", misconduct: "Misconduct", htr_stopped: "Stopped by HTR",
};

export const receiptNo = (id: number) => `PRM-${String(id).padStart(4, "0")}`;
export const refundNo = (id: number) => `RFD-${String(id).padStart(4, "0")}`;

/** Days of the 90 used and left (Dhaka days don't matter here: whole 24-hour days from verification). */
export function premiumDays(m: Pick<PremiumMember, "starts_at" | "ends_at">, now: number) {
  if (!m.starts_at || !m.ends_at) return { used: 0, left: PREMIUM_DAYS, total: PREMIUM_DAYS };
  const total = Math.round((m.ends_at - m.starts_at) / 86400);
  const used = Math.min(total, Math.max(0, Math.floor((now - m.starts_at) / 86400)));
  return { used, left: Math.max(0, Math.ceil((m.ends_at - now) / 86400)), total };
}

/** The Profile steps Premium needs: what HTR reads to pick a tutor and to judge "a matching tuition". */
// The lowest salary is not here: the Premium form asks for it and saves it to the Profile too.
const REQUIRED = /^(photo|areas|classes|subjects|(junior|ssc|hsc)-(numbers|approach))$/;
const LEVEL: Record<string, string> = { junior: "Junior", ssc: "SSC", hsc: "HSC" };
export const premiumMissing = (steps: ProgressStep[]) =>
  steps.filter((s) => REQUIRED.test(s.key) && !s.done).map((s) => (LEVEL[s.group] ? { ...s, label: `${LEVEL[s.group]}: ${s.label.toLowerCase()}` } : s));

/** The tutor-facing word for a term's state. */
export const STATUS_WORD: Record<PremiumStatus, string> = {
  applied: "Applied", accepted: "Accepted · pay now", paid: "Payment sent", active: "Premium", declined: "Not accepted",
  cancelled: "Cancelled", delivered: "Delivered", ended: "Ended",
};

/** Terms as promises on both sides (owner, 2026-10-29: no card words). Draft for the owner's review. */
export const PREMIUM_TERMS: { htr: string[]; tutor: string[]; money: string[] } = {
  htr: [
    "আপনার শর্তে মেলে এমন টিউশনে, সমান যোগ্য টিউটরদের মধ্যে আপনাকে আগে বিবেচনা করা হবে।",
    "যাচাইয়ের দিন থেকে 90 দিনের মধ্যে একটি টিউশন দেওয়ার সর্বাত্মক চেষ্টা করা হবে। টিউশন রিযিকের ব্যাপার, তাই নিশ্চয়তা দেওয়া যায় না।",
    "কোনো সমস্যা গোনার আগে HTR আপনার সাথে কথা বলবে, আর প্রতিটি সমস্যা WhatsApp-এ লিখে জানাবে।",
    "গার্ডিয়ান বা অন্য কেউ জানবে না যে আপনি Premium।",
  ],
  tutor: [
    "HTR-এর মেসেজের উত্তর 12 ঘণ্টার মধ্যে দেবেন (সকাল 9টা–রাত 10টা)।",
    "আপনার এলাকা, ক্লাস, বিষয় আর সর্বনিম্ন বেতনে মেলে এমন টিউশন নেবেন।",
    "প্রোফাইলের তথ্য সঠিক ও হালনাগাদ রাখবেন।",
    "অন্য কোথাও টিউশন পেলে HTR-কে জানাবেন।",
    "ডেমো ক্লাসে সময়মতো যাবেন; না পারলে অন্তত 6 ঘণ্টা আগে জানাবেন।",
  ],
  money: [
    "Premium-এর টাকা আসলে মিডিয়া ফি-র অগ্রিম অংশ, আলাদা কোনো চার্জ নয়।",
    "টিউশন পেলে প্রথম মাসের বেতনের 50% থেকে এই টাকা বাদ যাবে; বাকিটা প্রথম বেতনের 7 দিনের মধ্যে দেবেন।",
    "90 দিনের আগে রিফান্ড চাওয়া যাবে না। 90 দিনে টিউশন না পেলে পুরো টাকা ফেরত, অথবা আরও 90 দিন।",
    "3টি সমস্যা হলে Premium শেষ, অর্ধেক টাকা ফেরত। অসদাচরণ বা ভুল যোগ্যতা দিলে Premium শেষ, টাকা ফেরত নেই।",
    "HTR আপনাকে বাদ দিলে বা Premium বন্ধ করলে পুরো টাকা সাথে সাথে ফেরত।",
    "রিফান্ড 7 দিনের মধ্যে একই bKash/Nagad নম্বরে যাবে; পাঠানোর খরচ HTR দেবে।",
  ],
};

// ---------- WhatsApp texts the admin sends at each step ----------

const tk = (n: number) => `৳${new Intl.NumberFormat("en-IN").format(n)}`;
export type MessageKind = "accepted" | "declined" | "reminder" | "verified" | "problem" | "day85" | "refund";

/** `first` = the tutor's first name; `origin` = the site, for the link to their Premium page. */
export function premiumMessage(kind: MessageKind, d: {
  first: string; origin: string; pay: string; price: number; id: number; till?: string; from?: string; problem?: string; points?: number;
  refund?: number | null; trx?: string | null;
}): string {
  const hello = `আসসালামু আলাইকুম ${d.first}, Hikmah Tutors থেকে বলছি।`;
  const link = `${d.origin}/me/premium`;
  switch (kind) {
    case "accepted":
      return `${hello}\n\nআপনার Premium আবেদন গ্রহণ করা হয়েছে।\n\n${tk(d.price)} পাঠান bKash বা Nagad (Personal) ${d.pay} নম্বরে, Send Money অথবা Cash In করে। তারপর TrxID লিখুন এখানে:\n${link}\n\nযাচাইয়ের দিন থেকে 90 দিন শুরু হবে। HTR সর্বাত্মক চেষ্টা করবে; রিযিকে থাকলে ইনশাআল্লাহ পাবেন।`;
    case "declined":
      return `${hello}\n\nএই মুহূর্তে আপনার এলাকা ও ক্লাসে টিউশন কম আসছে, তাই 90 দিনের প্রতিশ্রুতি রাখা কঠিন। তাই এবার Premium আবেদন গ্রহণ করা গেল না। কোনো টাকা নেওয়া হয়নি।\n\nসাধারণভাবে আবেদন চালিয়ে যান; পরে আবার চেষ্টা করতে পারেন।`;
    case "reminder":
      return `${hello}\n\nআপনার Premium পেমেন্ট এখনো পাইনি। ${tk(d.price)} পাঠিয়ে TrxID লিখুন:\n${link}`;
    case "verified":
      return `${hello}\n\nপেমেন্ট যাচাই হয়েছে (PRM-${String(d.id).padStart(4, "0")})। আপনার Premium ${d.from} থেকে ${d.till} পর্যন্ত। ধৈর্য রাখুন, HTR আপনার জন্য সর্বাত্মক চেষ্টা করবে।\n\nকার্ড ও রসিদ: ${link}`;
    case "problem":
      return `${hello}\n\nআপনার Premium-এ একটি সমস্যা লেখা হয়েছে: ${d.problem}।\nসমস্যা: ${d.points} of ${PROBLEM_LIMIT}।\n\nকিছু বলার থাকলে জানাবেন।`;
    case "day85":
      return `${hello}\n\nআপনার Premium ${d.till}-এ শেষ হবে। পুরো ${tk(d.price)} ফেরত নেবেন, নাকি আরও 90 দিন রাখবেন? জানাবেন।`;
    case "refund":
      return `${hello}\n\n${tk(d.refund ?? 0)} রিফান্ড পাঠানো হয়েছে${d.trx ? `, TrxID ${d.trx}` : ""}।\n\nরসিদ: ${link}`;
  }
}
