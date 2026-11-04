// Premium for the tutor (owner, 2026-11-05, part E). Before: what Premium gives, how HTR sees a Premium application,
// the terms and a short form. After: where the term stands (pay, checking, active with days left), the welcome card and
// receipts to save, problems in plain words, and what counts as a matching tuition. Private: only this tutor sees it.
import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import {
  ArrowLeft, BadgeCheck, CalendarClock, Check, Copy, Crown, Hourglass, ListChecks, ReceiptText, ShieldCheck, TriangleAlert, Wallet,
} from "lucide-react";
import type { Route } from "./+types/me.premium";
import { inputClass } from "~/components/admin";
import { BenefitTiles, FeeBar, HowItWorks, MemberPass, Patience, RankDemo } from "~/components/PremiumParts";
import { SectionCard } from "~/components/SectionCard";
import { ShareCard } from "~/components/ShareCard";
import { SitePage } from "~/components/site";
import { TutorBar } from "~/components/tutor";
import { cardDate, paymentOf, receiptCard, refundOf, welcomeCard, welcomeOf } from "~/lib/cards";
import { CONTACT } from "~/lib/contact";
import { requireTutor, tutorBadges } from "~/lib/me.server";
import { AREAS, CLASS_LEVELS, SUBJECTS, labelOf } from "~/lib/options";
import {
  END_REASON, MIN_SALARY_FLOOR, PREMIUM_TERMS, PROBLEMS, PROBLEM_LIMIT, type PremiumMember, premiumDays, premiumPrice, problemPoints, receiptNo,
} from "~/lib/premium";
import { applyPremium, cancelPremium, myPremium, submitPayment } from "~/lib/premium.server";
import { taka } from "~/lib/tuition";
import { firstName } from "~/lib/whatsapp";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Premium · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { viewer, me } = await requireTutor(request);
  const [premium, badges] = await Promise.all([myPremium(me), tutorBadges(viewer, me)]);
  return { me, premium, badges, now: Math.floor(Date.now() / 1000) };
}

export async function action({ request }: Route.ActionArgs) {
  const { viewer, me } = await requireTutor(request);
  const form = await request.formData();
  const intent = form.get("intent");
  const error = intent === "apply" ? await applyPremium(viewer, me, form)
    : intent === "cancel" ? await cancelPremium(viewer, me)
      : intent === "pay" ? await submitPayment(viewer, me, form)
        : "Unknown step.";
  return { error };
}

const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical" };
// In the options' own order (classes low to high, areas by demand), not the order they were saved in.
const list = (keys: string, opts: typeof AREAS) => opts.filter((o) => keys.split(",").includes(o.key)).map((o) => o.label).join(", ");
const subjectList = (pairs: string) => [...new Set(pairs.split(",").filter(Boolean).map((p) => labelOf(SUBJECTS, p.split(":")[1])))].join(", ");

export default function Premium({ loaderData: { me, premium, badges, now }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const m = premium.current;
  const open = m && ["applied", "accepted", "paid", "active"].includes(m.status);
  const person = { name: firstName(me.full_name), code: me.code, school: [me.university && UNI[me.university], me.department].filter(Boolean).join(" · "), hasPhoto: !!me.photo_key };

  return (
    <SitePage app>
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-28 sm:px-6">
        <Link to="/me" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-500"><ArrowLeft size={16} aria-hidden />Home</Link>
        {actionData?.error && <p role="alert" className="mt-2 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}

        {m && open ? <Term m={m} person={person} problems={premium.problems} now={now} busy={busy} /> : (
          <>
            <Hero who={person} members={premium.members} />
            <BenefitTiles />
            {m && <LastTerm m={m} person={person} />}
            <RankDemo who={person} />
            <HowItWorks />
            <Patience />
            <Promises />
            <Apply me={me} missing={premium.missing} choices={premium.choices} busy={busy} />
          </>
        )}
      </div>
      <TutorBar active="home" count={badges.applied} />
    </SitePage>
  );
}

// ---------- Before applying ----------

function Hero({ who, members }: { who: Person; members: number }) {
  return (
    <section className="relative mt-2 animate-rise overflow-hidden rounded-3xl bg-forest px-5 pt-6 pb-5 text-cream shadow-lift sm:px-7">
      <span aria-hidden className="absolute -top-24 -right-20 size-72 rounded-full bg-forest-mid" />
      <span aria-hidden className="absolute -top-8 -right-6 size-36 rounded-full bg-[#13513f]" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mango px-3 py-1 text-xs font-extrabold tracking-wide text-forest"><Crown size={14} aria-hidden />PREMIUM</span>
        <h1 className="mt-4 text-[36px] leading-[1.02] font-extrabold tracking-tight">First pick<br />among equals.</h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-brand-100">সমান যোগ্য টিউটরদের মধ্যে HTR আপনাকে আগে বিবেচনা করবে, আর 90 দিন ধরে আপনার জন্য টিউশন খুঁজবে।</p>
        <p className="mt-6 mb-2 text-xs font-semibold text-brand-200">Your pass could look like this</p>
        <div className="px-1 pb-2"><MemberPass who={who} no="No. ——" stub="90" stubLabel="DAYS" tilt /></div>
        <a href="#apply" className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-mango text-base font-extrabold text-forest transition-transform hover:-translate-y-0.5">
          Apply now · it's free to apply
        </a>
        {members >= 5 && <p className="mt-3 text-center text-xs font-semibold text-brand-100">{members} tutors are Premium now</p>}
      </div>
    </section>
  );
}

function Promises() {
  const Block = ({ title, items, tone, tick }: { title: string; items: string[]; tone: string; tick: string }) => (
    <section className={`rounded-2xl p-4 ring-1 ${tone}`}>
      <h3 className="text-xs font-extrabold tracking-wide uppercase">{title}</h3>
      <ul className="mt-2.5 space-y-2">
        {items.map((s) => <li key={s} className="flex gap-2 text-sm leading-relaxed text-slate-700"><Check size={16} className={`mt-0.5 shrink-0 ${tick}`} aria-hidden />{s}</li>)}
      </ul>
    </section>
  );
  return (
    <section aria-labelledby="promises" className="mt-5">
      <h2 id="promises" className="flex items-center gap-2 text-lg font-extrabold text-forest"><ShieldCheck size={20} className="text-brand-600" aria-hidden />Promises on both sides</h2>
      <p className="mt-0.5 text-sm text-slate-500">শর্তগুলো দুই পক্ষের প্রতিশ্রুতি হিসেবে লেখা।</p>
      <div className="mt-3 space-y-3">
        <Block title="HTR promises" items={PREMIUM_TERMS.htr} tone="bg-brand-50 text-brand-700 ring-brand-100" tick="text-brand-600" />
        <Block title="You promise" items={PREMIUM_TERMS.tutor} tone="bg-sky-50 text-sky-800 ring-sky-100" tick="text-sky-600" />
        <Block title="Money" items={PREMIUM_TERMS.money} tone="bg-amber-50 text-amber-800 ring-amber-100" tick="text-amber-600" />
      </div>
    </section>
  );
}

function Apply({ me, missing, choices, busy }: {
  me: Route.ComponentProps["loaderData"]["me"]; missing: { key: string; label: string; section: string }[];
  choices: { areas: string[]; classes: string[]; subjects: { band: string; subject: string }[] }; busy: boolean;
}) {
  const [min, setMin] = useState(String(me.min_salary && me.min_salary >= MIN_SALARY_FLOOR ? me.min_salary : ""));
  const n = Number(min.replace(/\D/g, ""));
  const ready = me.review_status === "approved" && missing.length === 0;
  return (
    <SectionCard id="apply" icon={Crown} tone="brand" title="Apply for Premium" hint="এখন কোনো টাকা লাগবে না। HTR 24 ঘণ্টার মধ্যে WhatsApp-এ জানাবে, তারপর পেমেন্ট।" className="mt-5 scroll-mt-20">
      {me.review_status !== "approved" ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">HTR is still checking your registration. You can apply once it's approved.</p>
      ) : missing.length > 0 ? (
        <div className="rounded-xl bg-rose-50 p-4">
          <p className="font-bold text-rose-900">Profile পূর্ণ করুন</p>
          <p className="mt-1 text-sm text-rose-900">Premium-এর জন্য এগুলো লাগবে, কারণ এগুলো দেখেই HTR টিউটর বাছাই করে।</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {missing.map((s) => <Link key={s.key} to={`/me/profile#${s.section}`} className="inline-flex min-h-10 items-center rounded-full bg-white px-3 text-sm font-semibold text-forest ring-1 ring-rose-200">+ {s.label}</Link>)}
          </div>
        </div>
      ) : null}
      <Form method="post" className="mt-4 space-y-4">
        <input type="hidden" name="intent" value="apply" />
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-forest">Your minimum salary</span>
          <span className="flex items-stretch gap-2">
            <input name="min_salary" value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" required placeholder="3000" disabled={!ready} className={`${inputClass} max-w-40 text-lg font-bold tabular-nums`} />
            <span className={`flex flex-1 items-center rounded-xl px-4 text-sm font-bold ${n >= MIN_SALARY_FLOOR ? "bg-mango text-forest" : "bg-slate-100 text-slate-500"}`}>
              {n >= MIN_SALARY_FLOOR ? <>Premium {taka(premiumPrice(n))}</> : `At least ${taka(MIN_SALARY_FLOOR)}`}
            </span>
          </span>
          <span className="mt-1 block text-xs text-slate-500">এর কম বেতনের টিউশন নিতে বাধ্য নন। এটা আপনার Profile-এর Lowest salary-ও হবে।</span>
        </label>
        <FeeBar min={n} />
        <div className="rounded-xl bg-cream p-4 ring-1 ring-brand-100">
          <p className="text-xs font-extrabold tracking-wide text-brand-700 uppercase">A matching tuition is</p>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex gap-2"><dt className="w-16 shrink-0 font-semibold text-slate-500">Areas</dt><dd className="text-slate-800">{me.anywhere ? "Anywhere in Rajshahi" : list(choices.areas.join(","), AREAS) || "—"}</dd></div>
            <div className="flex gap-2"><dt className="w-16 shrink-0 font-semibold text-slate-500">Classes</dt><dd className="text-slate-800">{list(choices.classes.join(","), CLASS_LEVELS) || "—"}</dd></div>
            <div className="flex gap-2"><dt className="w-16 shrink-0 font-semibold text-slate-500">Subjects</dt><dd className="text-slate-800">{[...new Set(choices.subjects.map((s) => labelOf(SUBJECTS, s.subject)))].join(", ") || "—"}</dd></div>
          </dl>
          <Link to="/me/profile#areas" className="mt-2 inline-flex min-h-10 items-center text-sm font-bold text-brand-700">Change in Profile</Link>
        </div>
        <label className="flex min-h-11 items-start gap-3 text-sm text-slate-700"><input type="checkbox" name="confirm" value="1" required disabled={!ready} className="mt-0.5 size-5 shrink-0 accent-forest" />আমার এলাকা, ক্লাস আর বিষয় ঠিক আছে।</label>
        <label className="flex min-h-11 items-start gap-3 text-sm text-slate-700"><input type="checkbox" name="terms" value="1" required disabled={!ready} className="mt-0.5 size-5 shrink-0 accent-forest" />ওপরের কথা আর দুই পক্ষের প্রতিশ্রুতি পড়েছি। বুঝেছি, Premium টিউশনের নিশ্চয়তা নয়; HTR সর্বাত্মক চেষ্টা করবে।</label>
        <button disabled={!ready || busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest text-base font-extrabold text-cream hover:bg-brand-700 disabled:opacity-50">
          <Crown size={18} className="text-mango" aria-hidden />Apply for Premium
        </button>
      </Form>
    </SectionCard>
  );
}

type Person = { name: string; code: number; school: string; hasPhoto: boolean };

/** The last term, once it ended: what happened, and the refund receipt to save. */
function LastTerm({ m, person }: { m: PremiumMember; person: Person }) {
  const ended = m.status === "ended" || m.status === "delivered";
  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-ring">
      <p className="font-bold text-forest">
        {m.status === "declined" ? "HTR didn't accept your last application" : m.status === "cancelled" ? "Your last application was cancelled" : `Last Premium term: ${m.end_reason ? END_REASON[m.end_reason] : "ended"}`}
      </p>
      {m.status === "declined" && m.decline_note && <p className="mt-1 text-sm text-slate-600">{m.decline_note}</p>}
      {ended && m.refund_amount ? (
        m.refund_sent_at ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-emerald-800">Refund sent {taka(m.refund_amount)}</span>
            <ShareCard label="Refund receipt" title="Refund receipt" filename={`hikmah-refund-${m.id}.png`} share={false} make={() => receiptCard(refundOf(m, person))} className="bg-brand-50 text-forest" />
          </div>
        ) : <p className="mt-1 text-sm text-amber-800">Refund of {taka(m.refund_amount)} coming within 7 days.</p>
      ) : null}
      <p className="mt-2 text-sm text-slate-500">নিচে আবার আবেদন করতে পারেন।</p>
    </div>
  );
}

// ---------- An open term ----------

function Term({ m, person, problems, now, busy }: {
  m: PremiumMember; person: Person; problems: { id: number; kind: keyof typeof PROBLEMS; points: number; note: string | null; created_at: number }[]; now: number; busy: boolean;
}) {
  const days = premiumDays(m, now);
  const points = problemPoints(problems);
  const labels = { areas: list(m.areas, AREAS), classes: list(m.classes, CLASS_LEVELS) };
  return (
    <>
      <section className="relative mt-2 animate-rise overflow-hidden rounded-3xl bg-forest p-6 text-cream shadow-lift">
        <span aria-hidden className="absolute -top-20 -right-16 size-64 rounded-full bg-forest-mid" />
        <div className="relative">
          {m.status !== "active" && <span className="inline-flex items-center gap-1.5 rounded-full bg-mango px-3 py-1 text-xs font-extrabold tracking-wide text-forest"><Crown size={14} aria-hidden />PREMIUM</span>}
          {m.status === "active" ? (
            <>
              <MemberPass who={person} no={`No. ${String(m.id).padStart(4, "0")}`} stub={String(days.left)} stubLabel="DAYS LEFT" />
              <p className="mt-5 text-sm text-brand-200">Valid till {m.ends_at ? cardDate(m.ends_at) : "—"}</p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={days.total} aria-valuenow={days.used} aria-label="Days used">
                <div className="h-full rounded-full bg-mango transition-[width] duration-700" style={{ width: `${(100 * days.used) / days.total}%` }} />
              </div>
              <p className="mt-2 text-xs text-brand-100">Day {days.used} of {days.total} · {receiptNo(m.id)}</p>
            </>
          ) : (
            <>
              <p className="mt-4 flex items-center gap-2 text-[28px] leading-tight font-extrabold tracking-tight">
                {m.status === "applied" ? <><Hourglass size={26} className="text-mango" aria-hidden />HTR is checking</> : m.status === "accepted" ? <><Wallet size={26} className="text-mango" aria-hidden />Accepted · pay {taka(m.price)}</> : <><Hourglass size={26} className="text-mango" aria-hidden />Checking your payment</>}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-brand-100">
                {m.status === "applied" ? "HTR 24 ঘণ্টার মধ্যে WhatsApp-এ জানাবে।" : m.status === "accepted" ? "নিচের নম্বরে টাকা পাঠিয়ে TrxID লিখুন। HTR যাচাই করলেই 90 দিন শুরু।" : `TrxID ${m.pay_trx}. HTR যাচাই করলে এখানে আর WhatsApp-এ জানাবে।`}
              </p>
            </>
          )}
        </div>
      </section>

      {m.status === "accepted" && <Pay m={m} busy={busy} />}

      {m.status === "active" && m.fee_left === null && <Patience during />}

      {m.status === "active" && (
        <SectionCard icon={ReceiptText} tone="amber" title="Your cards" hint="ছবিগুলো সেভ করে রাখুন। Premium গোপন থাকে, তাই এগুলো ফেসবুকে দেওয়ার দরকার নেই।" className="mt-5">
          <div className="flex flex-wrap gap-2">
            <ShareCard label="Welcome card" title="Your Premium card" filename={`hikmah-premium-${m.id}.png`} share={false} make={() => welcomeCard(welcomeOf(m, person, labels))} className="bg-forest text-cream" />
            <ShareCard label="Payment receipt" title="Payment receipt" filename={`hikmah-receipt-${m.id}.png`} share={false} make={() => receiptCard(paymentOf(m, person))} className="bg-white text-forest shadow-ring" />
          </div>
        </SectionCard>
      )}

      {m.status === "active" && m.fee_left !== null && (
        <div className="mt-5 rounded-2xl bg-mango p-4 text-forest">
          <p className="font-extrabold">First salary received · fee left {taka(m.fee_left)}</p>
          <p className="mt-1 text-sm">প্রথম বেতনের 7 দিনের মধ্যে বাকি ফি দিন: বেতন {taka(m.real_salary ?? 0)}-এর 50%, থেকে Premium-এর {taka(m.price)} বাদ।</p>
        </div>
      )}

      {m.status === "active" && (
        <SectionCard icon={TriangleAlert} tone="rose" title="Problems" aside={<span className="rounded-full bg-white px-2.5 py-0.5 text-sm font-extrabold text-rose-800 tabular-nums ring-1 ring-rose-200">{points} of {PROBLEM_LIMIT}</span>}
          hint={`সমস্যা: ${points} of ${PROBLEM_LIMIT}। ${PROBLEM_LIMIT}টি হলে Premium শেষ, অর্ধেক টাকা ফেরত। HTR প্রতিটির আগে কথা বলবে।`} className="mt-5">
          {problems.length === 0 ? <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><BadgeCheck size={18} aria-hidden />No problems. Keep it up!</p> : (
            <ul className="space-y-2">
              {problems.map((p) => (
                <li key={p.id} className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm">
                  <p className="font-bold text-rose-900">{PROBLEMS[p.kind].bn}{p.points > 1 ? ` · ${p.points}` : ""}</p>
                  {p.note && <p className="mt-0.5 text-rose-900/80">{p.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      <SectionCard icon={ListChecks} tone="sky" title="A matching tuition is" hint="HTR গ্রহণ করার দিনের তথ্য। এর সাথে মেলে এমন টিউশন না নিলে সমস্যা গোনা হয়।" className="mt-5">
        <dl className="space-y-1.5 text-sm">
          <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-slate-500">Min. salary</dt><dd className="font-bold text-slate-800">{taka(m.min_salary)}</dd></div>
          <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-slate-500">Areas</dt><dd className="text-slate-800">{m.anywhere ? "Anywhere in Rajshahi" : labels.areas || "—"}</dd></div>
          <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-slate-500">Classes</dt><dd className="text-slate-800">{labels.classes || "—"}</dd></div>
          <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-slate-500">Subjects</dt><dd className="text-slate-800">{subjectList(m.subjects) || "—"}</dd></div>
        </dl>
      </SectionCard>

      {(m.status === "applied" || m.status === "accepted") && (
        <Form method="post" className="mt-5 text-center">
          <input type="hidden" name="intent" value="cancel" />
          <button disabled={busy} className="min-h-11 px-4 text-sm font-semibold text-slate-500 hover:text-rose-700">Cancel my application</button>
        </Form>
      )}
      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400"><CalendarClock size={14} aria-hidden />Questions? WhatsApp HTR at {CONTACT.whatsapp}</p>
    </>
  );
}

function Pay({ m, busy }: { m: PremiumMember; busy: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <SectionCard icon={Wallet} tone="brand" title={`Pay ${taka(m.price)}`} hint="bKash বা Nagad থেকে Send Money অথবা Cash In করুন, তারপর নিচে লিখুন।" className="mt-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream p-4 ring-1 ring-brand-100">
        <div>
          <p className="text-xs font-bold text-slate-500">bKash / Nagad (Personal)</p>
          <p className="text-2xl font-extrabold tracking-wide text-forest tabular-nums">{CONTACT.pay}</p>
        </div>
        <button type="button" onClick={() => navigator.clipboard?.writeText(CONTACT.pay).then(() => setCopied(true))} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-bold text-forest shadow-ring">
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? "Copied" : "Copy"}
        </button>
      </div>
      <Form method="post" className="mt-4 space-y-3">
        <input type="hidden" name="intent" value="pay" />
        <fieldset>
          <legend className="mb-1 text-sm font-bold text-forest">Sent with</legend>
          <div className="flex gap-2">
            {[["bkash", "bKash"], ["nagad", "Nagad"]].map(([k, l]) => (
              <label key={k} className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-brand-100 bg-white text-sm font-bold text-forest has-checked:border-forest has-checked:bg-forest has-checked:text-cream">
                <input type="radio" name="method" value={k} required className="sr-only" />{l}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block"><span className="mb-1 block text-sm font-bold text-forest">Your number you sent from</span><input name="from" required inputMode="tel" placeholder="01XXXXXXXXX" className={inputClass} /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold text-forest">TrxID</span><input name="trx" required autoCapitalize="characters" placeholder="9AB7C6D5E4" className={`${inputClass} uppercase`} /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold text-forest">Amount</span><input name="amount" required inputMode="numeric" defaultValue={m.price} className={`${inputClass} tabular-nums`} /></label>
        <button disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest text-base font-extrabold text-cream hover:bg-brand-700 disabled:opacity-50">I've paid</button>
      </Form>
    </SectionCard>
  );
}
