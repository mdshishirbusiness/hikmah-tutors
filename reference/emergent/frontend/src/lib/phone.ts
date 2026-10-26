const BN = "০১২৩৪৫৬৭৮৯";

export function normalizePhone(raw: string): string | null {
  let s = raw.replace(/[০-৯]/g, (d) => String(BN.indexOf(d))).replace(/\D/g, "");
  if (s.startsWith("880") && s.length === 13) s = `0${s.slice(3)}`;
  else if (s.length === 10 && s.startsWith("1")) s = `0${s}`;
  return /^01[3-9]\d{8}$/.test(s) ? s : null;
}
