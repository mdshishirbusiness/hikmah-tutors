// Tutor referral (owner, 2026-11-09, ready tutors plan step 5). A tutor shares a link or their code (the tutor code
// without the T); the new tutor enters it once at registration. Credit lands in the referrer's wallet when the new
// tutor's profile is 80% complete and HTR has checked them by phone. Wallet credit is spent on media fees, never cash.

export const REFERRAL_PERCENT = 80;
export const REF_COOKIE = "htr_ref";

/** The owner's rates (2026-11-09): more for RU, RUET and Medical, and more for female tutors. */
export const REFERRAL_RATES = [
  { from: "RU, RUET, Medical", male: 20, female: 30 },
  { from: "Other institutions", male: 10, female: 20 },
] as const;

/** Credit for one referred tutor, by their university key and gender, fixed when the credit is given. */
export function referralAmount(university: string | null, gender: string | null): number {
  const top = university === "ru" || university === "ruet" || university === "medical";
  const female = gender === "female";
  return top ? (female ? 30 : 20) : female ? 20 : 10;
}

/** "T-2345", "t2345", "2345" or Bangla digits → 2345; null when it isn't a code. */
export function codeFrom(input: string | null | undefined): number | null {
  const ascii = String(input ?? "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).trim();
  const m = /^t?-?\s*(\d{3,6})$/i.exec(ascii);
  return m ? Number(m[1]) : null;
}

export const referralLink = (site: string, code: number) => `${site}/r/${code}`;

/** Where a referred tutor stands, in the Bangla the referrer reads. */
export type ReferralStatus = "credited" | "needs_check" | "needs_profile";
