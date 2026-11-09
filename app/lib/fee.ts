// Media fee rules shared by the server and the pages (owner, 2026-11-09: media fee ledger). Whole taka only, rounded
// half up (PRD BR-FEE-001/002). The ledger itself is in fee.server.ts.
import { taka } from "./tuition";

/** A tuition's fee: Standard (PRD §7.3) or Custom, a percent of the first month's salary or a fixed amount. */
export type FeeTerms = { kind: "standard" | "percent" | "fixed"; value: number | null };

export const FEE_KINDS = [
  { key: "standard", label: "Standard" },
  { key: "percent", label: "Custom %" },
  { key: "fixed", label: "Custom ৳" },
] as const;

/** Where a fee payment came from. Money goes to CONTACT.pay or is handed over in cash. */
export const FEE_METHODS: Record<string, string> = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket", cash: "Cash" };

export const isCustom = (t: FeeTerms) => t.kind !== "standard";

const pct = (basis: number, p: number) => Math.floor((basis * p + 50) / 100);

/** Reads the "Media fee" choice of New tuition and Edit tuition. */
export function feeTermsFromForm(form: FormData): { terms: FeeTerms; error?: string } {
  const kind = String(form.get("fee_kind") ?? "standard");
  if (kind === "standard" || !form.has("fee_kind")) return { terms: { kind: "standard", value: null } };
  const value = Number(String(form.get(kind === "percent" ? "fee_percent" : "fee_fixed") ?? "").trim());
  if (kind === "percent") {
    if (!Number.isInteger(value) || value < 1 || value > 100) return { terms: { kind: "standard", value: null }, error: "Media fee: enter a percent from 1 to 100." };
    return { terms: { kind, value } };
  }
  if (kind === "fixed") {
    if (!Number.isInteger(value) || value < 1 || value > 100000) return { terms: { kind: "standard", value: null }, error: "Media fee: enter the amount in taka." };
    return { terms: { kind, value } };
  }
  return { terms: { kind: "standard", value: null }, error: "Media fee not valid." };
}

/** Short English line for the fee, e.g. "20% of the first month's salary". */
export function feeTermsLabel(t: FeeTerms): string {
  if (t.kind === "percent") return `${t.value}% of the first month's salary`;
  if (t.kind === "fixed") return `${taka(t.value ?? 0)} once`;
  return "Standard: 60%, or 50% paid early";
}

/** A charge as written to the ledger when the tutor confirms. `later` is due only after the first salary. */
export type Charge = { total: number; later: number; terms: string; basis: number | null };

/**
 * The fee a confirm writes. Standard is 60% of the basis: half on confirm, half after the first salary (an odd taka goes
 * to the second); Early is 50%, all at once; Custom is due in full on confirm. Null when there is no salary to take a
 * percent of: the owner sets the agreed salary on Money first.
 */
export function chargeFor(t: FeeTerms, basis: number | null, plan: "standard" | "early" | null = null): Charge | null {
  if (t.kind === "fixed" && t.value) return { total: t.value, later: 0, terms: `fixed:${t.value}`, basis };
  if (!basis || basis <= 0) return null;
  if (t.kind === "percent" && t.value) {
    const total = pct(basis, t.value);
    return total > 0 ? { total, later: 0, terms: `percent:${t.value}`, basis } : null;
  }
  if (plan === "early") return { total: pct(basis, 50), later: 0, terms: "early", basis };
  const total = pct(basis, 60);
  return { total, later: total - Math.floor(total / 2), terms: "standard", basis };
}

/** The words for a charge's terms as stored on the entry. */
export function chargeTermsLabel(terms: string): string {
  const [kind, v] = terms.split(":");
  if (kind === "percent") return `Custom ${v}%`;
  if (kind === "fixed") return "Custom, fixed";
  return kind === "early" ? "Early 50%" : "Standard 60%";
}

/** One placement's money, summed from its entries. */
export type FeeBalance = {
  charged: number; // live charge
  reduced: number; // reductions kept
  paid: number; // payments kept
  credited: number; // wallet credit applied (step 5)
  later: number; // the charge's part due after the first salary
  owed: number; // charged - reduced - paid - credited; below 0 means overpaid
  due_now: number; // what can be asked for today
};

/** `first_salary` is when the first salary was reported; until then a Standard charge's second half waits. */
export function dueNow(b: Omit<FeeBalance, "owed" | "due_now">, firstSalary: number | null): FeeBalance {
  const owed = b.charged - b.reduced - b.paid - b.credited;
  const waiting = firstSalary ? 0 : Math.min(b.later, Math.max(owed, 0));
  return { ...b, owed, due_now: Math.max(owed - waiting, 0) };
}
