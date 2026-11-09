// Money (owner, 2026-11-09: media fee ledger). Totals, fees and collections by month, and who owes what. A placement
// opens in a sheet with its entries and the owner's actions: record a payment (partial is fine), reduce the fee with a
// reason, switch a Standard fee to Early, reverse a payment or a reduction, or set the salary of a fee still waiting.
import { useState } from "react";
import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { MessageCircle, Undo2 } from "lucide-react";
import type { Route } from "./+types/admin.money";
import { Avatar } from "~/components/Avatar";
import { PageHead, StageTabs, inputClass, num, primaryButton, secondaryButton, when } from "~/components/admin";
import { CHART, ColumnChart, StatTile } from "~/components/charts";
import { ChoiceChip, Sheet } from "~/components/tutor";
import { requireAdmin } from "~/lib/auth.server";
import { waLink } from "~/lib/contact";
import { FEE_METHODS, chargeTermsLabel } from "~/lib/fee";
import {
  type FeeEntry, type MoneyRow, moneyBoard, placementEntries, placementWallet, recordPayment, reduceFee, reverseEntry, setAgreedSalary, switchToEarly, useWalletCredit,
} from "~/lib/fee.server";
import { AREAS, CLASS_LEVELS, labelOf } from "~/lib/options";
import { taka } from "~/lib/tuition";
import { firstName } from "~/lib/whatsapp";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Money · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const id = Number(new URL(request.url).searchParams.get("p")) || 0;
  const [board, entries, wallet] = await Promise.all([moneyBoard(), id ? placementEntries(id) : null, id ? placementWallet(id) : 0]);
  return { ...board, entries, wallet, today: new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10) };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const form = await request.formData();
  const id = Number(form.get("id")) || 0;
  const actor = viewer?.id ?? null;
  switch (form.get("intent")) {
    case "pay": return { intent: "pay", error: await recordPayment(id, form, actor) };
    case "reduce": return { intent: "reduce", error: await reduceFee(id, form, actor) };
    case "early": return { intent: "early", error: await switchToEarly(id, actor) };
    case "reverse": return { intent: "reverse", error: await reverseEntry(Number(form.get("entry")), String(form.get("reason") ?? ""), actor) };
    case "salary": return { intent: "salary", error: await setAgreedSalary(id, form, actor) };
    case "wallet": return { intent: "wallet", error: await useWalletCredit(id, actor) };
  }
  return { intent: "", error: "Unknown request." };
}

const plural = (n: number, word: string) => `${num(n)} ${word}${n === 1 ? "" : "s"}`;
const later = (r: MoneyRow) => Math.max(r.owed - r.due_now, 0);
const TABS = [
  { key: "", label: "Owing", test: (r: MoneyRow) => r.due_now > 0 || !!r.fee_waiting_at || r.owed < 0 },
  { key: "later", label: "After 1st salary", test: (r: MoneyRow) => r.due_now === 0 && later(r) > 0 },
  { key: "paid", label: "Paid up", test: (r: MoneyRow) => r.owed === 0 && r.charged > 0 },
  { key: "all", label: "All", test: () => true },
] as const;

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const MONTH_FULL = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const monthOf = (key: string) => new Date(`${key}-01T00:00:00Z`);

const ENTRY: Record<string, string> = { charge: "Fee", payment: "Payment", reduction: "Reduced", credit: "Wallet credit", reversal: "Reversed" };

function reminder(r: MoneyRow) {
  return `Assalamu alaikum ${firstName(r.name)}. Your media fee for HTR-${r.tuition_code}: ${taka(r.due_now)} is due now. Please send it to HTR and let us know. Thank you.`;
}

function EntryRow({ e, busy }: { e: FeeEntry; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const reversible = (e.kind === "payment" || e.kind === "reduction" || e.kind === "credit") && !e.reversed;
  return (
    <li className={`py-2.5 ${e.reversed || e.kind === "reversal" ? "text-slate-400" : "text-slate-800"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0">
          <span className="font-semibold">{ENTRY[e.kind] ?? e.kind}</span>
          {e.kind === "charge" && e.terms && <span className="text-sm"> · {chargeTermsLabel(e.terms)}</span>}
          {e.method && <span className="text-sm"> · {FEE_METHODS[e.method]}</span>}
          {e.reversed ? <span className="ml-1 rounded bg-slate-100 px-1 text-xs font-bold text-slate-500">reversed</span> : null}
        </span>
        <span className="shrink-0 font-bold tabular-nums">{e.delta > 0 ? "+" : "−"}{taka(Math.abs(e.delta))}</span>
      </div>
      <p className="text-xs text-slate-500">
        {when(e.paid_at ?? e.created_at)}{e.txn_ref && ` · ${e.txn_ref}`}{e.note && ` · ${e.note}`}
      </p>
      {reversible && (open ? (
        <Form method="post" className="mt-2 flex gap-2" onSubmit={() => setOpen(false)}>
          <input type="hidden" name="intent" value="reverse" />
          <input type="hidden" name="entry" value={e.id} />
          <input name="reason" required maxLength={300} placeholder="Why? e.g. entered twice" aria-label="Reason for the reversal" className={`${inputClass} min-h-11 flex-1 text-sm`} />
          <button disabled={busy} className="min-h-11 shrink-0 rounded-xl bg-rose-700 px-3 text-sm font-bold text-white disabled:opacity-60">Reverse</button>
        </Form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="mt-1 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-slate-500 hover:text-rose-700"><Undo2 size={14} aria-hidden />Reverse</button>
      ))}
    </li>
  );
}

function Detail({ r, entries, wallet, today, busy, error }: { r: MoneyRow; entries: FeeEntry[]; wallet: number; today: string; busy: boolean; error: string | null }) {
  const [panel, setPanel] = useState<"pay" | "reduce">("pay");
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">HTR-{r.tuition_code} · {labelOf(CLASS_LEVELS, r.class_level)} · {labelOf(AREAS, r.area)}{r.basis ? ` · salary ${taka(r.basis)}` : ""}</p>
      {error && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{error}</p>}

      {r.fee_waiting_at ? (
        <Form method="post" className="space-y-2 rounded-2xl bg-mango/30 p-4">
          <p className="text-sm font-semibold text-forest">Confirmed with no fixed salary. Enter the agreed monthly salary to fix the fee ({r.fee_kind === "percent" ? `${r.fee_value}%` : "Standard 60%"}).</p>
          <input type="hidden" name="intent" value="salary" />
          <input type="hidden" name="id" value={r.id} />
          <input name="salary" type="number" min={1} step={100} inputMode="numeric" required placeholder="e.g. 5000" aria-label="Agreed monthly salary" className={`${inputClass} text-lg font-bold`} />
          <button disabled={busy} className={`${primaryButton} w-full`}>Set the fee</button>
        </Form>
      ) : (
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[["Fee", r.charged - r.reduced], ["Paid", r.paid + r.credited], ["Due now", r.due_now]].map(([k, v]) => (
            <div key={k} className={`rounded-xl py-2 ${k === "Due now" && Number(v) > 0 ? "bg-mango" : "bg-cream"}`}>
              <dt className="text-xs font-semibold text-slate-600">{k}</dt>
              <dd className="text-lg font-extrabold text-forest tabular-nums">{taka(Number(v))}</dd>
            </div>
          ))}
        </dl>
      )}
      {later(r) > 0 && <p className="text-sm text-slate-600">{taka(later(r))} more after the first salary{r.first_salary_at ? "" : " (not reported yet)"}.</p>}
      {r.owed < 0 && <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">Overpaid by {taka(-r.owed)}. Refund it, or keep it for the wallet when that comes.</p>}
      {wallet > 0 && r.charged > 0 && r.owed > 0 && (
        <Form method="post" className="flex items-center justify-between gap-3 rounded-2xl bg-brand-50 px-4 py-3">
          <input type="hidden" name="intent" value="wallet" />
          <input type="hidden" name="id" value={r.id} />
          <p className="text-sm text-forest"><b>Wallet {taka(wallet)}</b> from referrals. Take {taka(Math.min(wallet, r.owed))} off this fee?</p>
          <button disabled={busy} className="min-h-11 shrink-0 rounded-xl bg-forest px-4 text-sm font-bold text-cream disabled:opacity-60">Use credit</button>
        </Form>
      )}

      {r.charged > 0 && r.owed > 0 && (
        <section className="rounded-2xl bg-white shadow-ring">
          <div role="tablist" className="flex gap-1 border-b border-brand-50 p-1.5">
            {(["pay", "reduce"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={panel === k} onClick={() => setPanel(k)}
                className={`min-h-11 flex-1 rounded-xl text-sm font-bold ${panel === k ? "bg-forest text-cream" : "text-forest"}`}>
                {k === "pay" ? "Record payment" : "Reduce fee"}
              </button>
            ))}
          </div>
          {panel === "pay" ? (
            <Form method="post" key={`pay-${r.id}-${r.paid}`} className="space-y-3 p-4">
              <input type="hidden" name="intent" value="pay" />
              <input type="hidden" name="id" value={r.id} />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Amount (৳) · partial is fine</span>
                <input name="amount" type="number" min={1} max={r.owed} step={1} inputMode="numeric" required defaultValue={r.due_now || r.owed} className={`${inputClass} text-lg font-bold`} />
              </label>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Paid by">
                {Object.entries(FEE_METHODS).map(([k, label], i) => <ChoiceChip key={k} type="radio" name="method" value={k} checked={i === 0}>{label}</ChoiceChip>)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Paid on</span>
                  <input name="paid_on" type="date" max={today} defaultValue={today} className={inputClass} />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Transaction ID</span>
                  <input name="txn_ref" maxLength={40} placeholder="optional" className={inputClass} />
                </label>
              </div>
              <input name="note" maxLength={300} placeholder="Note (optional)" aria-label="Note" className={inputClass} />
              <button disabled={busy} className={`${primaryButton} w-full`}>Record payment</button>
            </Form>
          ) : (
            <div className="space-y-3 p-4">
              <Form method="post" key={`reduce-${r.id}-${r.reduced}`} className="space-y-3">
                <input type="hidden" name="intent" value="reduce" />
                <input type="hidden" name="id" value={r.id} />
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Take off (৳) · at most {taka(r.owed)}</span>
                  <input name="amount" type="number" min={1} max={r.owed} step={1} inputMode="numeric" required className={`${inputClass} text-lg font-bold`} />
                </label>
                <input name="reason" required maxLength={300} placeholder="Reason, e.g. tuition ended in week 2" aria-label="Reason" className={inputClass} />
                <button disabled={busy} className={`${primaryButton} w-full`}>Reduce fee</button>
              </Form>
              {r.terms === "standard" && (
                <Form method="post" className="border-t border-brand-50 pt-3">
                  <input type="hidden" name="intent" value="early" />
                  <input type="hidden" name="id" value={r.id} />
                  <button disabled={busy} className={`${secondaryButton} w-full`}>Paid early: change to 50%</button>
                </Form>
              )}
            </div>
          )}
        </section>
      )}

      {r.due_now > 0 && r.phone && (
        <a href={waLink(r.phone, reminder(r))} target="_blank" rel="noreferrer" className="wa-btn inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-forest shadow-ring">
          <MessageCircle size={16} aria-hidden />Remind on WhatsApp
        </a>
      )}

      <section>
        <h3 className="text-sm font-bold text-slate-500">Entries</h3>
        {entries.length === 0 ? <p className="mt-1 text-sm text-slate-500">None yet.</p> : <ul className="divide-y divide-brand-50">{entries.map((e) => <EntryRow key={e.id} e={e} busy={busy} />)}</ul>}
        <p className="mt-2 text-xs text-slate-500">Entries are never edited or deleted. A mistake is undone by a reversal, with its reason.</p>
      </section>
    </div>
  );
}

export default function MoneyAdmin({ loaderData: { rows, byMonth, totals, entries, wallet, today }, actionData }: Route.ComponentProps) {
  const [sp, setSp] = useSearchParams();
  const busy = useNavigation().state !== "idle";
  const tab = TABS.find((t) => t.key === (sp.get("tab") ?? "")) ?? TABS[0];
  const shown = rows.filter((r) => tab.test(r)).sort((a, b) => b.due_now - a.due_now || (b.confirmed_at ?? 0) - (a.confirmed_at ?? 0));
  const open = rows.find((r) => r.id === Number(sp.get("p")));
  const close = () => setSp((s) => { s.delete("p"); return s; }, { preventScrollReset: true });
  const thisMonth = byMonth.at(-1);
  return (
    <>
      <PageHead title="Money" sub="Media fees: what is owed and what came in. Started fresh on the app; nothing from the sheet." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total fees" value={taka(totals.fees)} note={plural(rows.filter((r) => r.charged > 0).length, "placement")} />
        <StatTile label="Collected" value={taka(totals.collected)} note={thisMonth ? `${taka(thisMonth.collected)} this month` : undefined} />
        <StatTile label="Due now" value={taka(totals.due_now)} note={plural(rows.filter((r) => r.due_now > 0).length, "tutor")} />
        <StatTile label="After 1st salary" value={taka(totals.later)} note={totals.waiting ? `${totals.waiting} fee${totals.waiting > 1 ? "s" : ""} need a salary` : totals.overpaid ? `${taka(totals.overpaid)} overpaid` : "Not due yet"} />
      </div>

      <section className="mt-4 rounded-2xl bg-white p-4 shadow-ring">
        <ColumnChart
          title="By month"
          series={[{ key: "fees", label: "Fees", color: CHART.two }, { key: "collected", label: "Collected", color: CHART.one }]}
          data={byMonth.map((m) => ({ label: MONTH.format(monthOf(m.key)), full: MONTH_FULL.format(monthOf(m.key)), fees: m.fees, collected: m.collected }))}
        />
      </section>

      <div className="mt-6">
        <StageTabs param="tab" active={tab.key} tabs={TABS.map((t) => ({ key: t.key, label: t.label, n: rows.filter((r) => t.test(r)).length }))} />
      </div>
      {shown.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-ring">
          {rows.length ? "Nobody here." : "No fees yet. A fee is fixed when a tutor confirms a tuition."}
        </p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-2xl bg-white shadow-ring">
          {shown.map((r) => {
            const next = new URLSearchParams(sp);
            next.set("p", String(r.id));
            return (
              <li key={r.id} className="border-b border-brand-50 last:border-0">
                <Link to={`?${next}`} preventScrollReset className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-brand-50/50">
                  <Avatar code={r.tutor_code} name={r.name} hasPhoto={!!r.photo_key} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-forest">{r.name}</span>
                    <span className="block truncate text-xs text-slate-500">HTR-{r.tuition_code} · {r.terms ? chargeTermsLabel(r.terms) : "No fee yet"} · paid {taka(r.paid + r.credited)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    {r.fee_waiting_at ? <span className="rounded-full bg-mango px-2 py-0.5 text-xs font-bold text-forest">Needs salary</span>
                      : r.owed < 0 ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">Overpaid</span>
                      : <>
                          <span className="block text-lg leading-tight font-extrabold text-forest tabular-nums">{taka(r.due_now)}</span>
                          <span className="block text-[11px] text-slate-500">{r.due_now ? "due now" : later(r) ? `${taka(later(r))} later` : "paid up"}</span>
                        </>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={!!open && !!entries} onClose={close} title={open ? `${open.name} · T-${open.tutor_code}` : "Fee"}>
        {open && entries && <Detail key={open.id} r={open} entries={entries} wallet={wallet} today={today} busy={busy} error={actionData?.error ?? null} />}
      </Sheet>
    </>
  );
}
