// Premium for the admin (owner, 2026-11-05, part E). Tabs follow a term's life: Applied → Payment → Active (with day
// counts and the "no tuition after 60 days" group) → Ending soon → Ended (refunds first). Each term opens in a sheet
// with its steps, the ready WhatsApp messages and the three cards. Search finds a receipt number, a code or a name.
import { useMemo, useState } from "react";
import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { AlertTriangle, Check, Crown, MessageCircle, Search, X } from "lucide-react";
import type { Route } from "./+types/admin.premium";
import { Avatar } from "~/components/Avatar";
import { PageHead, ago, inputClass, num, when } from "~/components/admin";
import { StatTile } from "~/components/charts";
import { ShareCard } from "~/components/ShareCard";
import { Sheet } from "~/components/tutor";
import { requireAdmin } from "~/lib/auth.server";
import { cardDate, paymentOf, receiptCard, refundOf, welcomeCard, welcomeOf } from "~/lib/cards";
import { CONTACT, waLink } from "~/lib/contact";
import { AREAS, CLASS_LEVELS, SUBJECTS, labelOf } from "~/lib/options";
import {
  END_REASON, PROBLEMS, PROBLEM_LIMIT, type MessageKind, type ProblemKind, feeLeft, premiumDays, premiumMessage, receiptNo, refundNo,
} from "~/lib/premium";
import { type AdminPremium, premiumAction, premiumBoard, premiumDetail } from "~/lib/premium.server";
import { taka } from "~/lib/tuition";
import { firstName } from "~/lib/whatsapp";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Premium · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("m")) || 0;
  const [rows, detail] = await Promise.all([premiumBoard(), id ? premiumDetail(id) : null]);
  return { rows, detail, origin: url.origin, now: Math.floor(Date.now() / 1000) };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const form = await request.formData();
  return { error: await premiumAction(String(form.get("intent") ?? ""), Number(form.get("id")), form, viewer?.id ?? null) };
}

const DAY = 86400;
const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical" };
// In the options' own order (classes low to high, areas by demand), not the order they were saved in.
const list = (keys: string, opts: typeof AREAS) => opts.filter((o) => keys.split(",").includes(o.key)).map((o) => o.label).join(", ");
const subjectList = (pairs: string) => [...new Set(pairs.split(",").filter(Boolean).map((p) => labelOf(SUBJECTS, p.split(":")[1])))].join(", ");
const person = (r: AdminPremium) => ({ name: firstName(r.name), code: r.code, school: [r.university && UNI[r.university], r.department].filter(Boolean).join(" · "), hasPhoto: !!r.photo_key });
const refundWaiting = (r: AdminPremium) => !!r.refund_due_at && !r.refund_sent_at;

const TABS = [
  { key: "applied", label: "Applied", test: (r: AdminPremium) => r.status === "applied" },
  { key: "payment", label: "Payment", test: (r: AdminPremium) => r.status === "accepted" || r.status === "paid" },
  { key: "active", label: "Active", test: (r: AdminPremium) => r.status === "active" },
  { key: "ending", label: "Ending soon", test: (r: AdminPremium, now: number) => r.status === "active" && (r.ends_at ?? 0) - now < 5 * DAY },
  { key: "ended", label: "Ended", test: (r: AdminPremium) => !["applied", "accepted", "paid", "active"].includes(r.status) },
] as const;

export default function PremiumAdmin({ loaderData: { rows, detail, origin, now }, actionData }: Route.ComponentProps) {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState("");
  const tab = TABS.find((t) => t.key === sp.get("tab")) ?? (rows.some((r) => r.status === "applied" || r.status === "paid") ? TABS[rows.some((r) => r.status === "applied") ? 0 : 1] : TABS[2]);
  const picked = rows.find((r) => r.id === Number(sp.get("m"))) ?? null;
  const stale = (r: AdminPremium) => r.status === "active" && r.placements === 0 && !!r.starts_at && now - r.starts_at > 60 * DAY;

  const needle = q.trim().toLowerCase().replace(/^(prm|rfd)-0*/, "");
  const shown = useMemo(() => {
    const base = needle
      ? rows.filter((r) => `${r.id} ${r.code} t-${r.code} ${r.name} ${r.pay_trx ?? ""} ${r.refund_trx ?? ""}`.toLowerCase().includes(needle))
      : rows.filter((r) => tab.test(r, now));
    return [...base].sort((a, b) =>
      tab.key === "active" || tab.key === "ending" ? Number(stale(b)) - Number(stale(a)) || (a.ends_at ?? 0) - (b.ends_at ?? 0)
        : tab.key === "payment" ? Number(b.status === "paid") - Number(a.status === "paid") || b.updated_at - a.updated_at
          : tab.key === "ended" ? Number(refundWaiting(b)) - Number(refundWaiting(a)) || b.updated_at - a.updated_at
            : a.applied_at - b.applied_at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tab.key, needle, now]);

  const active = rows.filter((r) => r.status === "active");
  const set = (changes: Record<string, string | null>) => setSp((p) => {
    for (const [k, v] of Object.entries(changes)) if (v === null) p.delete(k); else p.set(k, v);
    return p;
  }, { preventScrollReset: true });

  return (
    <>
      <PageHead title="Premium" sub="Applications, payments, active tutors and refunds." />
      {actionData?.error && <p role="alert" className="mb-4 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Active Premium" value={num(active.length)} note={`${active.filter((r) => r.placements > 0).length} got a tuition`} />
        <StatTile label="Waiting on you" value={num(rows.filter((r) => r.status === "applied" || r.status === "paid").length)} note="new applications and payments" />
        <StatTile label="No tuition after 60 days" value={num(active.filter(stale).length)} note="push these first" />
        <StatTile label="Refunds due" value={num(rows.filter(refundWaiting).length)} note={rows.some((r) => refundWaiting(r) && (r.refund_due_at ?? 0) < now) ? "some are late" : "within 7 days each"} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <nav aria-label="Premium tabs" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
          {TABS.map((t) => {
            const n = rows.filter((r) => t.test(r, now)).length;
            const on = !needle && t.key === tab.key;
            return (
              <button key={t.key} type="button" onClick={() => set({ tab: t.key, m: null })} aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold ${on ? "bg-forest text-cream" : "bg-white text-slate-600 shadow-ring"}`}>
                {t.label}<span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-white/15" : "bg-brand-50 text-brand-700"}`}>{n}</span>
              </button>
            );
          })}
        </nav>
        <label className="relative ml-auto w-full sm:w-64">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="PRM-0001, T-code, name, TrxID" aria-label="Find a Premium term" className="min-h-10 w-full rounded-xl bg-white pr-3 pl-9 text-sm shadow-ring outline-none focus:ring-2 focus:ring-brand-200" />
        </label>
      </div>

      {tab.key === "active" && !needle && active.some(stale) && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900"><AlertTriangle size={16} aria-hidden />60 দিন পার, কোনো টিউশন হয়নি: এদের আগে সুযোগ দিন। ওপরে রাখা হয়েছে।</p>
      )}

      <ul className="mt-3 overflow-hidden rounded-2xl bg-white shadow-ring">
        {shown.map((r) => <PremiumRow key={r.id} r={r} now={now} stale={stale(r)} onOpen={() => set({ m: String(r.id) })} />)}
        {shown.length === 0 && <li className="p-8 text-center text-sm text-slate-500">{needle ? "Nothing found." : tab.key === "applied" ? "No new applications." : "Nothing here."}</li>}
      </ul>

      <Sheet open={!!picked} onClose={() => set({ m: null })} title={picked ? `${picked.name} · ${receiptNo(picked.id)}` : ""}>
        {picked && <Detail r={picked} detail={detail} origin={origin} now={now} />}
      </Sheet>
    </>
  );
}

function PremiumRow({ r, now, stale, onOpen }: { r: AdminPremium; now: number; stale: boolean; onOpen: () => void }) {
  const days = premiumDays(r, now);
  const side =
    r.status === "applied" ? <>Applied<br />{ago(r.applied_at)}</>
      : r.status === "accepted" ? <>Waiting to pay<br />{taka(r.price)}</>
        : r.status === "paid" ? <span className="font-bold text-forest">Check payment<br />{taka(r.pay_amount ?? 0)}</span>
          : r.status === "active" ? <><span className="font-bold text-forest tabular-nums">{days.left} days left</span><br />day {days.used}</>
            : refundWaiting(r) ? <span className={`font-bold ${(r.refund_due_at ?? 0) < now ? "text-rose-700" : "text-amber-800"}`}>Refund {taka(r.refund_amount ?? 0)}<br />{(r.refund_due_at ?? 0) < now ? "late" : `due ${when(r.refund_due_at)}`}</span>
              : <>{r.end_reason ? END_REASON[r.end_reason] : r.status === "declined" ? "Not accepted" : "Cancelled"}<br />{ago(r.ended_at ?? r.updated_at)}</>;
  return (
    <li className="border-b border-brand-50 last:border-0">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
        <Avatar code={r.code} name={r.name} hasPhoto={!!r.photo_key} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-bold text-forest">{r.name}</span>
            {r.status === "active" && <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-mango px-1.5 text-[10px] font-extrabold text-forest"><Crown size={10} aria-hidden />PREMIUM</span>}
            {stale && <span className="shrink-0 rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-900">60+ DAYS</span>}
            {r.points > 0 && <span className="shrink-0 rounded bg-rose-100 px-1.5 text-[10px] font-bold text-rose-900 tabular-nums">{r.points}/{PROBLEM_LIMIT}</span>}
          </span>
          <span className="block truncate text-xs text-slate-500">T-{r.code} · {receiptNo(r.id)} · min {taka(r.min_salary)} · {list(r.classes, CLASS_LEVELS) || "no classes"}</span>
          {r.status === "active" && (
            <span className="mt-1.5 block h-1.5 max-w-56 overflow-hidden rounded-full bg-brand-50">
              <span className={`block h-full rounded-full ${stale ? "bg-amber-500" : "bg-brand-500"}`} style={{ width: `${(100 * days.used) / days.total}%` }} />
            </span>
          )}
        </span>
        <span className="shrink-0 text-right text-xs text-slate-500">{side}</span>
      </button>
    </li>
  );
}

// ---------- One term, in the sheet ----------

function Wa({ phone, text, label }: { phone: string; text: string; label: string }) {
  return (
    <a href={waLink(phone, text)} target="_blank" rel="noreferrer" className="wa-btn inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold">
      <MessageCircle size={16} aria-hidden />{label}
    </a>
  );
}
function Step({ intent, id, label, tone = "dark", children, busy }: { intent: string; id: number; label: string; tone?: "dark" | "light" | "danger"; children?: React.ReactNode; busy: boolean }) {
  const cls = tone === "dark" ? "bg-forest text-cream hover:bg-brand-700" : tone === "danger" ? "bg-white text-rose-800 shadow-ring hover:bg-rose-50" : "bg-white text-forest shadow-ring";
  return (
    <Form method="post" className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={id} />
      {children}
      <button disabled={busy} className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-bold disabled:opacity-60 ${cls}`}>{label}</button>
    </Form>
  );
}
const Fact = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex gap-3 py-1 text-sm"><dt className="w-24 shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 font-semibold text-slate-800">{v}</dd></div>
);

function Detail({ r, detail, origin, now }: { r: AdminPremium; detail: Route.ComponentProps["loaderData"]["detail"]; origin: string; now: number }) {
  const busy = useNavigation().state !== "idle";
  const p = person(r);
  const days = premiumDays(r, now);
  const labels = { areas: list(r.areas, AREAS), classes: list(r.classes, CLASS_LEVELS) };
  const msg = (kind: MessageKind, extra: Partial<Parameters<typeof premiumMessage>[1]> = {}) => premiumMessage(kind, {
    first: p.name, origin, pay: CONTACT.pay, price: r.price, id: r.id,
    from: r.starts_at ? cardDate(r.starts_at) : undefined, till: r.ends_at ? cardDate(r.ends_at) : undefined, ...extra,
  });
  const problems = detail?.problems ?? [];
  const last = problems[problems.length - 1];
  const [salary, setSalary] = useState("");
  const f = Number(salary) > 0 ? feeLeft(Number(salary), r.price) : null;

  return (
    <div className="space-y-5 pb-2">
      <div className="flex items-center gap-3">
        <Avatar code={r.code} name={r.name} hasPhoto={!!r.photo_key} size="md" />
        <div className="min-w-0 flex-1">
          <Link to={`/admin/tutors/${r.code}`} className="font-bold text-forest hover:underline">T-{r.code} · {p.school || "—"}</Link>
          <p className="text-xs text-slate-500">Applied {when(r.applied_at)} · price {taka(r.price)} (min salary {taka(r.min_salary)})</p>
        </div>
      </div>

      <dl className="rounded-2xl bg-cream px-4 py-2 ring-1 ring-brand-100">
        <Fact k="Areas" v={r.anywhere ? "Anywhere in Rajshahi" : labels.areas || "—"} />
        <Fact k="Classes" v={labels.classes || "—"} />
        <Fact k="Subjects" v={subjectList(r.subjects) || "—"} />
        {r.status === "active" && <Fact k="Days" v={`${days.used} of ${days.total} · ends ${r.ends_at ? cardDate(r.ends_at) : "—"}${r.renewals ? ` · renewed ${r.renewals}×` : ""}`} />}
      </dl>

      {r.status === "applied" && (
        <section className="space-y-2">
          <p className="text-sm text-slate-600">প্রোফাইল দেখুন, আর এই এলাকা ও ক্লাসে 90 দিনে টিউশন দেওয়া যাবে কিনা ভাবুন।</p>
          <div className="flex flex-wrap gap-2">
            <Step intent="accept" id={r.id} label="Accept" busy={busy} />
            <Wa phone={r.phone} text={msg("declined")} label="Decline message" />
          </div>
          <Step intent="decline" id={r.id} label="Decline" tone="danger" busy={busy}>
            <input name="note" maxLength={300} placeholder="Reason the tutor sees (optional)" aria-label="Reason" className={`${inputClass} min-h-11 flex-1 text-sm`} />
          </Step>
        </section>
      )}

      {r.status === "accepted" && (
        <section className="flex flex-wrap gap-2">
          <Wa phone={r.phone} text={msg("accepted")} label="How to pay" />
          <Wa phone={r.phone} text={msg("reminder")} label="Reminder" />
          <Step intent="cancel" id={r.id} label="Cancel" tone="danger" busy={busy} />
        </section>
      )}

      {r.status === "paid" && (
        <section className="space-y-3">
          <dl className="rounded-2xl bg-mango/40 px-4 py-2">
            <Fact k="Method" v={r.pay_method === "nagad" ? "Nagad" : "bKash"} />
            <Fact k="From" v={r.pay_from} />
            <Fact k="TrxID" v={<span className="font-mono">{r.pay_trx}</span>} />
            <Fact k="Amount" v={`${taka(r.pay_amount ?? 0)}${r.pay_amount !== r.price ? " (not the price!)" : ""}`} />
            <Fact k="Sent" v={ago(r.paid_at)} />
          </dl>
          <p className="text-sm text-slate-600">আপনার bKash/Nagad-এ এই TrxID আর টাকা মিলিয়ে দেখুন, তারপর Verify।</p>
          <div className="flex flex-wrap gap-2">
            <Step intent="verify" id={r.id} label="Verify · start 90 days" busy={busy} />
            <Step intent="reject_payment" id={r.id} label="Not found · ask again" tone="danger" busy={busy} />
          </div>
        </section>
      )}

      {r.status === "active" && (
        <>
          <section>
            <h3 className="mb-2 text-xs font-extrabold tracking-wide text-brand-700 uppercase">Send to the tutor</h3>
            <div className="flex flex-wrap gap-2">
              <Wa phone={r.phone} text={msg("verified")} label="Verified message" />
              <ShareCard label="Welcome card" title="Welcome card" filename={`hikmah-premium-${r.id}.png`} text={msg("verified")} make={() => welcomeCard(welcomeOf(r, p, labels))} className="bg-forest text-cream" />
              <ShareCard label="Receipt" title={`Receipt ${receiptNo(r.id)}`} filename={`hikmah-receipt-${r.id}.png`} make={() => receiptCard(paymentOf(r, p))} className="bg-white text-forest shadow-ring" />
              {days.left <= 6 && <Wa phone={r.phone} text={msg("day85")} label="Refund or renew?" />}
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-wide text-rose-800 uppercase">Problems <span className="rounded-full bg-rose-100 px-2 tabular-nums">{r.points} of {PROBLEM_LIMIT}</span></h3>
            {problems.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {problems.map((x) => (
                  <li key={x.id} className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1"><b className="text-rose-900">{PROBLEMS[x.kind].label}{x.points > 1 ? ` (${x.points})` : ""}</b>{x.note ? <span className="block text-xs text-rose-900/80">{x.note}</span> : null}<span className="block text-xs text-slate-500">{when(x.created_at)}</span></span>
                    <Form method="post">
                      <input type="hidden" name="intent" value="remove_problem" /><input type="hidden" name="id" value={r.id} /><input type="hidden" name="problem" value={x.id} />
                      <button disabled={busy} aria-label="Remove (a mistake)" title="Remove (a mistake)" className="grid size-10 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-rose-700"><X size={16} aria-hidden /></button>
                    </Form>
                  </li>
                ))}
              </ul>
            )}
            <p className="mb-2 text-xs text-slate-500">আগে টিউটরের সাথে কথা বলুন, তারপর লিখুন। {PROBLEM_LIMIT}টি হলে Premium নিজে থেকেই শেষ হবে, অর্ধেক টাকা ফেরত।</p>
            <Step intent="problem" id={r.id} label="Record" tone="danger" busy={busy}>
              <select name="kind" required defaultValue="" aria-label="What happened" className={`${inputClass} min-h-11 flex-1 text-sm`}>
                <option value="" disabled>What happened?</option>
                {(Object.keys(PROBLEMS) as ProblemKind[]).map((k) => <option key={k} value={k}>{PROBLEMS[k].label}{PROBLEMS[k].points > 1 ? " (counts 2)" : ""}</option>)}
              </select>
              <input name="note" maxLength={300} placeholder="Note (optional)" aria-label="Note" className={`${inputClass} min-h-11 w-full text-sm`} />
            </Step>
            {last && <div className="mt-2"><Wa phone={r.phone} text={msg("problem", { problem: PROBLEMS[last.kind].bn, points: r.points })} label="Tell the tutor" /></div>}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-extrabold tracking-wide text-brand-700 uppercase">Delivery</h3>
            {r.fee_left === null ? (
              detail && detail.placements.length > 0 ? (
                <Step intent="first_salary" id={r.id} label="First salary received" busy={busy}>
                  <select name="placement" required aria-label="Tuition" className={`${inputClass} min-h-11 w-full text-sm`}>
                    {detail.placements.map((pl) => <option key={pl.id} value={pl.id}>HTR-{pl.tuition_code} · {labelOf(CLASS_LEVELS, pl.class_level)} · {labelOf(AREAS, pl.area)}</option>)}
                  </select>
                  <input name="salary" value={salary} onChange={(e) => setSalary(e.target.value.replace(/\D/g, ""))} required inputMode="numeric" placeholder="Real salary" aria-label="Real monthly salary" className={`${inputClass} min-h-11 w-36 text-sm`} />
                  {f && <span className="w-full text-xs text-slate-600">Fee {taka(f.fee)} − Premium {taka(r.price)} = <b>{taka(f.left)}</b> left{f.refund ? ` · ${taka(f.refund)} back to the tutor` : ""}</span>}
                </Step>
              ) : <p className="text-sm text-slate-500">No tuition confirmed since this term began. When one is confirmed, record its first salary here.</p>
            ) : (
              <Step intent="fee_paid" id={r.id} label={`Fee ${taka(r.fee_left)} paid · delivered`} busy={busy}>
                <input name="trx" required placeholder="TrxID" aria-label="TrxID" className={`${inputClass} min-h-11 w-44 text-sm uppercase`} />
              </Step>
            )}
          </section>

          <section className="space-y-2 border-t border-brand-50 pt-4">
            <h3 className="text-xs font-extrabold tracking-wide text-slate-500 uppercase">At day 90, or to stop</h3>
            <div className="flex flex-wrap gap-2">
              <Step intent="renew" id={r.id} label="Renew 90 days" tone="light" busy={busy} />
            </div>
            <Step intent="end" id={r.id} label="End Premium" tone="danger" busy={busy}>
              <select name="reason" required defaultValue="" aria-label="Why it ends" className={`${inputClass} min-h-11 flex-1 text-sm`}>
                <option value="" disabled>Why?</option>
                <option value="day90_refund">90 days · full refund ({taka(r.price)})</option>
                <option value="htr_stopped">HTR stops it · full refund ({taka(r.price)})</option>
                <option value="misconduct">Misconduct · no refund</option>
              </select>
            </Step>
          </section>
        </>
      )}

      {!["applied", "accepted", "paid", "active"].includes(r.status) && (
        <section className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">{r.end_reason ? END_REASON[r.end_reason] : r.status === "declined" ? "Not accepted" : "Cancelled"} · {when(r.ended_at ?? r.updated_at)}</p>
          {r.status === "delivered" && <dl className="rounded-2xl bg-cream px-4 py-2 ring-1 ring-brand-100"><Fact k="Salary" v={taka(r.real_salary ?? 0)} /><Fact k="Fee left" v={taka(r.fee_left ?? 0)} />{r.fee_trx && <Fact k="Fee TrxID" v={r.fee_trx} />}</dl>}
          {refundWaiting(r) && (
            <>
              <p className={`text-sm font-bold ${(r.refund_due_at ?? 0) < now ? "text-rose-700" : "text-amber-800"}`}>Refund {taka(r.refund_amount ?? 0)} to {r.pay_method === "nagad" ? "Nagad" : "bKash"} {r.pay_from} · due {when(r.refund_due_at)}</p>
              <Step intent="refund_sent" id={r.id} label="Refund sent" busy={busy}>
                <input name="trx" required placeholder="TrxID" aria-label="TrxID" className={`${inputClass} min-h-11 w-44 text-sm uppercase`} />
              </Step>
            </>
          )}
          {r.refund_sent_at && (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-emerald-800"><Check size={16} aria-hidden />{refundNo(r.id)} · {taka(r.refund_amount ?? 0)} sent {when(r.refund_sent_at)}</span>
              <ShareCard label="Refund receipt" title={`Refund ${refundNo(r.id)}`} filename={`hikmah-refund-${r.id}.png`} make={() => receiptCard(refundOf(r, p))} className="bg-white text-forest shadow-ring" />
              <Wa phone={r.phone} text={msg("refund", { refund: r.refund_amount, trx: r.refund_trx })} label="Refund message" />
            </div>
          )}
          {r.verified_at && <ShareCard label="Payment receipt" title={`Receipt ${receiptNo(r.id)}`} filename={`hikmah-receipt-${r.id}.png`} make={() => receiptCard(paymentOf(r, p))} className="bg-white text-forest shadow-ring" />}
        </section>
      )}
    </div>
  );
}
