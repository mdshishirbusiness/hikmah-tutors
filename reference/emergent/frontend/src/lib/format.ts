import type { Lang, Tuition } from "../types";

const BN = "০১২৩৪৫৬৭৮৯";

export function toBnDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => BN[Number(d)]);
}

export function digits(s: string | number, lang: Lang): string {
  const str = String(s);
  return lang === "bn" ? toBnDigits(str) : str;
}

export function fmtTaka(n: number, lang: Lang): string {
  const grouped = new Intl.NumberFormat("en-IN").format(n);
  return digits(grouped, lang);
}

export function salaryText(t: Pick<Tuition, "salary_kind" | "salary_amount" | "salary_period">, lang: Lang, labels: { month: string; course: string; negotiable: string; unspecified: string }): string {
  if (t.salary_kind === "fixed" && t.salary_amount && t.salary_amount > 0) {
    return `৳ ${fmtTaka(t.salary_amount, lang)} / ${t.salary_period === "per_month" ? labels.month : labels.course}`;
  }
  if (t.salary_kind === "negotiable") return labels.negotiable;
  return labels.unspecified;
}

export function isNew(postedAt: string | null): boolean {
  if (!postedAt) return false;
  return Date.now() - new Date(postedAt).getTime() < 48 * 3600 * 1000;
}

export function timeAgo(iso: string | null, lang: Lang, t: (k: string, vars?: Record<string, string | number>) => string): string {
  if (!iso) return "";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("time.just_now");
  if (mins < 60) return t("time.minutes_ago", { n: digits(mins, lang) });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("time.hours_ago", { n: digits(hours, lang) });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("time.days_ago", { n: digits(days, lang) });
  return fmtDate(iso, lang);
}

export function fmtDate(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  const s = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(iso));
  if (lang === "en") return s;
  const months: Record<string, string> = {
    January: "জানুয়ারি", February: "ফেব্রুয়ারি", March: "মার্চ", April: "এপ্রিল", May: "মে", June: "জুন",
    July: "জুলাই", August: "আগস্ট", September: "সেপ্টেম্বর", October: "অক্টোবর", November: "নভেম্বর", December: "ডিসেম্বর",
  };
  return toBnDigits(s.replace(/[A-Za-z]+/, (m) => months[m] || m));
}

export function waLink(phone: string | null | undefined, text: string): string {
  const n = (phone || "").replace(/\D/g, "");
  const intl = n.startsWith("880") ? n : n.startsWith("0") ? `88${n}` : n;
  const base = intl ? `https://wa.me/${intl}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string | null | undefined): string {
  const n = (phone || "").replace(/\D/g, "");
  return n ? `tel:+${n.startsWith("880") ? n : `88${n}`}` : "tel:";
}
