// "Ask to update" (owner, 2026-11-09): after a call the owner sends the tutor a personal WhatsApp message listing what
// to add to their profile, instead of typing it in himself. Shared by the call screen and the tutor's Profile.
import { bandShort } from "./profile";

type Band = "junior" | "ssc" | "hsc";
export const ASK_PARTS = ["numbers", "approach", "story", "subjects"] as const;
export type AskPart = (typeof ASK_PARTS)[number];

/** One item, in the Bangla the tutor reads. */
export function askLabel(item: string) {
  const [band, part] = item.split(":") as [Band, AskPart];
  const b = bandShort(band);
  return part === "numbers" ? `${b}-তে কতজন ছাত্র পড়িয়েছেন, কত বছর`
    : part === "approach" ? `${b}-তে কীভাবে পড়ান`
      : part === "story" ? `${b}-এর একজন ছাত্রের উন্নতির ঘটনা: আগে কেমন ছিল, পরে কেমন হলো`
        : `${b}-তে কোন কোন subject পড়ান`;
}

/** What is missing at each level, the rated levels first. */
export function missingItems(
  bands: Band[], levels: { band: string; students: number | null; years: number | null; approach: string | null; story: string | null }[],
  subjects: { band: string }[],
): string[] {
  const written = (s: string | null) => (s ?? "").trim().length >= 40;
  return bands.flatMap((b) => {
    const l = levels.find((x) => x.band === b);
    return [
      (!l || l.students == null || l.years == null) && `${b}:numbers`,
      !written(l?.approach ?? null) && `${b}:approach`,
      !written(l?.story ?? null) && `${b}:story`,
      !subjects.some((s) => s.band === b) && `${b}:subjects`,
    ].filter(Boolean) as string[];
  });
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const bn = (n: number) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

/** The message, ready to edit before sending. No emoji, no guardian details. */
export function askMessage(first: string, items: string[], link: string) {
  return [
    `আসসালামু আলাইকুম ${first}, Hikmah Tutors থেকে বলছি। আপনার সাথে কথা বলে ভালো লাগলো।`,
    `টিউশনে আপনাকে আগে রাখতে চাই, তাই profile-এ এগুলো যোগ করুন:`,
    ...items.map((it, i) => `${bn(i + 1)}) ${askLabel(it)}`),
    ``,
    `এই link-এ চাপুন, আর registration-এর Gmail দিয়ে login করুন: ${link}`,
  ].join("\n");
}
