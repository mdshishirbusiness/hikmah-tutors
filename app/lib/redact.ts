// Contacts cut out of what tutors type, before it is saved or handed on (owner, 2026-11-08 and 2026-11-09).

/** A Bangladesh mobile number in English or Bangla digits, with or without +88 and spaces or dashes between digits. */
const PHONE = /(\+?(?:88|৮৮)[\s-]?)?[0০][1১][3-9৩-৯](?:[\s-]?[0-9০-৯]){8}/g;

/** "Call me on 017…" → "Call me on [phone]". */
export const cutPhones = (s: string) => s.replace(PHONE, "[phone]");
