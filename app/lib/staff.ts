// Moderator switches (owner, 2026-11-16; docs/DECISIONS.md). Shared by the server checks and the Team page.
// Keys are stored in staff.perms: never change one that is in use, only its label.

export type Perm = "leads" | "inbox" | "tuitions" | "tutors" | "batches" | "calls" | "docs" | "ai";

export const PERMS: { key: Perm; label: string; hint: string; byDefault: boolean }[] = [
  { key: "leads", label: "Leads and guardians", hint: "Quick Pad, leads, guardians. Sees guardian phones; every view is logged.", byDefault: true },
  { key: "inbox", label: "WhatsApp Inbox", hint: "Reply to WhatsApp chats not yet taken and their own (owner, 2026-11-18). Every view is logged.", byDefault: true },
  { key: "tuitions", label: "Tuitions", hint: "New, edit, post, applicants up to Selected, placements, follow-ups.", byDefault: true },
  { key: "tutors", label: "Tutors", hint: "Profiles, flags and the notice to tutors. No NID or documents.", byDefault: true },
  { key: "batches", label: "Batch teachers", hint: "Admission batch applications.", byDefault: true },
  { key: "calls", label: "Call list", hint: "Rate tutors per level. Ratings are private.", byDefault: false },
  { key: "docs", label: "Documents", hint: "Approve sign-ups and new photos; open NID and documents (each view logged).", byDefault: false },
  { key: "ai", label: "Copy for AI", hint: "Copy a tuition's applicant pack for an AI chat.", byDefault: false },
];

export const DEFAULT_PERMS: Perm[] = PERMS.filter((p) => p.byDefault).map((p) => p.key);

const KEYS = new Set<string>(PERMS.map((p) => p.key));
export const parsePerms = (raw: string | null | undefined): Perm[] => (raw ?? "").split(",").filter((k): k is Perm => KEYS.has(k));

/** Who is looking: the owner (also `null` under the dev bypass) or a moderator with their switches. */
export type StaffViewer = { role: "owner" | "moderator" | "tutor"; perms?: Perm[] } | null;

export const isOwner = (v: StaffViewer) => v === null || v.role === "owner";
export const can = (v: StaffViewer, perm: Perm) => isOwner(v) || (v!.role === "moderator" && (v!.perms ?? []).includes(perm));
