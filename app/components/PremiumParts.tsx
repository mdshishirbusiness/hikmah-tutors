// Pieces of the tutor's Premium page (owner, 2026-11-05: "designs can be more interesting, to inspire others to join").
// The pass is the tutor's own card; the ranking demo shows their row move up; the fee bar makes "not an extra fee"
// concrete; the patience note is said before every application (owner: রিযিকে থাকলে পাবেন).
import { useEffect, useRef, useState } from "react";
import { Crown, HeartHandshake } from "lucide-react";
import { Avatar } from "~/components/Avatar";
import { SectionCard } from "~/components/SectionCard";
import { MIN_SALARY_FLOOR, premiumPrice } from "~/lib/premium";
import { taka } from "~/lib/tuition";

type Who = { name: string; code: number; hasPhoto: boolean; school: string };

/**
 * A membership pass, like a ticket: the tutor on the left, a stub with the days on the right, notches cut in the
 * colour behind it. `cut` must match that colour. One light sweep when it appears (none under reduced motion).
 */
export function MemberPass({ who, no, stub, stubLabel, tilt = false, cut = "bg-forest" }: {
  who: Who; no: string; stub: string; stubLabel: string; tilt?: boolean; cut?: string;
}) {
  return (
    <div className={`relative isolate overflow-hidden rounded-[26px] bg-mango text-forest shadow-lift transition-transform duration-500 ${tilt ? "-rotate-2 hover:rotate-0" : ""}`}>
      <span aria-hidden className="absolute -bottom-20 -left-12 -z-10 size-48 rounded-full border-[22px] border-forest/6" />
      <div className="grid grid-cols-[minmax(0,1fr)_6rem]">
        <div className="min-w-0 p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.2em]"><Crown size={14} aria-hidden />PREMIUM TUTOR</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="shrink-0 rounded-full bg-forest p-[3px]"><Avatar code={who.code} name={who.name} hasPhoto={who.hasPhoto} size="lg" /></span>
            <span className="min-w-0">
              <span className="block truncate text-[26px] leading-tight font-extrabold tracking-tight">{who.name}</span>
              <span className="block text-xs font-bold text-forest/80">T-{who.code}</span>
              {who.school && <span className="block truncate text-xs font-semibold text-forest/70">{who.school}</span>}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center border-l-2 border-dashed border-forest/25 px-2 py-4 text-center">
          <span className="text-[10px] font-bold tracking-widest text-forest/70">{no}</span>
          <span className="mt-1.5 text-[40px] leading-none font-extrabold tabular-nums">{stub}</span>
          <span className="mt-1 text-[10px] font-extrabold tracking-widest">{stubLabel}</span>
        </div>
      </div>
      <span aria-hidden className={`absolute -top-3 right-[5.25rem] size-6 rounded-full ${cut}`} />
      <span aria-hidden className={`absolute -bottom-3 right-[5.25rem] size-6 rounded-full ${cut}`} />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-shine bg-white/40 blur-md" />
    </div>
  );
}

/** Three facts, each on its own colour. */
export function BenefitTiles() {
  const tiles = [
    { big: "1st", label: "among equally good tutors", tone: "bg-amber-50 text-amber-900 ring-amber-100" },
    { big: "90", label: "days: HTR's push for you", tone: "bg-sky-50 text-sky-900 ring-sky-100" },
    { big: "৳0", label: "extra: it's part of the fee", tone: "bg-violet-50 text-violet-900 ring-violet-100" },
  ];
  return (
    <ul className="mt-4 grid grid-cols-3 gap-2">
      {tiles.map((t, i) => (
        <li key={t.big} className={`animate-rise rounded-2xl px-3 py-3.5 ring-1 ${t.tone}`} style={{ animationDelay: `${120 + i * 80}ms` }}>
          <span className="block text-[28px] leading-none font-extrabold tracking-tight tabular-nums">{t.big}</span>
          <span className="mt-1.5 block text-xs leading-snug font-semibold opacity-80">{t.label}</span>
        </li>
      ))}
    </ul>
  );
}

const ROW = 60;
const NORMAL = ["s", "g1", "g2", "g3", "you"];
const PREMIUM = ["s", "you", "g1", "g2", "g3"];

/**
 * An example applicant list. Other applicants are blank rows, not invented people. When it scrolls into view the
 * tutor's row moves from 4th to 1st among "Good", and stays below the "Strong" tutor: Premium never jumps a better one.
 */
export function RankDemo({ who }: { who: Who }) {
  const [on, setOn] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || !("IntersectionObserver" in window)) return;
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      timer = window.setTimeout(() => setOn(true), 700);
      io.disconnect();
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, []);
  const order = on ? PREMIUM : NORMAL;
  const Blank = ({ strong, w }: { strong?: boolean; w: string }) => (
    <div className="flex h-[52px] items-center gap-3 rounded-xl bg-white px-3 ring-1 ring-slate-200">
      <span className="size-8 shrink-0 rounded-full bg-slate-200" />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5"><span className={`h-2.5 rounded-full bg-slate-200 ${w}`} /><span className="h-2 w-14 rounded-full bg-slate-100" /></span>
      <Level strong={strong} />
    </div>
  );
  return (
    <SectionCard icon={Crown} tone="amber" title="Watch your name move up" hint="উদাহরণ: একটি টিউশনে HTR-এর আবেদন তালিকা। গার্ডিয়ান এটা কখনো দেখেন না।" className="mt-5">
      <div ref={box}>
        <div role="radiogroup" aria-label="Show as" className="inline-flex rounded-xl bg-slate-100 p-1">
          {[[false, "Normal"], [true, "Premium"]].map(([v, label]) => (
            <button key={String(label)} type="button" role="radio" aria-checked={on === v} onClick={() => setOn(v as boolean)}
              className={`min-h-10 rounded-lg px-4 text-sm font-bold transition-colors ${on === v ? "bg-white text-forest shadow-ring" : "text-slate-500"}`}>{label as string}</button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
          <ol aria-hidden className="text-sm font-extrabold text-slate-400 tabular-nums">
            {[1, 2, 3, 4, 5].map((n) => <li key={n} className="flex items-center justify-center" style={{ height: ROW }}>{n}</li>)}
          </ol>
          <div className="relative" style={{ height: ROW * 5 }}>
            {[
              { key: "s", el: <Blank strong w="w-28" /> },
              { key: "g1", el: <Blank w="w-24" /> },
              { key: "g2", el: <Blank w="w-20" /> },
              { key: "g3", el: <Blank w="w-24" /> },
              {
                key: "you", el: (
                  <div className={`flex h-[52px] items-center gap-3 rounded-xl px-3 transition-shadow duration-500 ${on ? "bg-white shadow-lift ring-2 ring-forest" : "bg-white ring-1 ring-slate-300"}`}>
                    <Avatar code={who.code} name={who.name} hasPhoto={who.hasPhoto} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-bold text-forest">{who.name}</span>
                        <span className={`inline-flex shrink-0 items-center gap-0.5 rounded bg-mango px-1.5 text-[10px] font-extrabold text-forest transition-all duration-300 ${on ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}><Crown size={10} aria-hidden />PREMIUM</span>
                      </span>
                      <span className="block text-xs text-slate-500">You · T-{who.code}</span>
                    </span>
                    <Level />
                  </div>
                ),
              },
            ].map((r) => (
              <div key={r.key} className="absolute inset-x-0 top-0 transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]" style={{ transform: `translateY(${order.indexOf(r.key) * ROW + 4}px)`, zIndex: r.key === "you" ? 2 : 1 }}>
                {r.el}
              </div>
            ))}
          </div>
        </div>
        <p aria-live="polite" className="mt-2 text-sm leading-relaxed text-slate-600">
          {on
            ? "Premium: Good টিউটরদের মধ্যে আপনি 1st। Strong টিউটর আগেই থাকেন, তাই গার্ডিয়ান সেরাটাই পান।"
            : "Normal: Good টিউটরদের মধ্যে আপনি আবেদনের ক্রম আর Strength অনুযায়ী, এখানে 4th।"}
        </p>
      </div>
    </SectionCard>
  );
}
const Level = ({ strong }: { strong?: boolean }) => (
  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${strong ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{strong ? "Strong" : "Good"}</span>
);

/** The way in, step by step, each step on its own colour. */
export function HowItWorks() {
  const steps = [
    { title: "Apply", sub: "এখন কোনো টাকা লাগে না।", tone: "bg-brand-50 text-brand-700" },
    { title: "HTR replies", sub: "24 ঘণ্টার মধ্যে, WhatsApp-এ।", tone: "bg-sky-50 text-sky-800" },
    { title: "Pay and get verified", sub: "bKash বা Nagad, তারপর TrxID লিখুন।", tone: "bg-amber-50 text-amber-800" },
    { title: "90 days, first among equals", sub: "যাচাইয়ের দিন থেকে গোনা শুরু।", tone: "bg-violet-50 text-violet-800" },
  ];
  return (
    <section aria-labelledby="how" className="mt-5 rounded-2xl bg-white p-5 shadow-ring">
      <h2 id="how" className="text-lg font-extrabold text-forest">How it works</h2>
      <ol className="mt-4">
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden className="absolute top-11 bottom-1 left-5 w-px bg-slate-200" />}
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-lg font-extrabold tabular-nums ${s.tone}`}>{i + 1}</span>
            <span className="pt-0.5">
              <span className="block font-bold text-forest">{s.title}</span>
              <span className="block text-sm text-slate-600">{s.sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** "Not an extra fee", in money: a sample tuition's fee split into what Premium pays now and what is left later. */
export function FeeBar({ min }: { min: number }) {
  if (!(min >= MIN_SALARY_FLOOR)) return null;
  const price = premiumPrice(min);
  const salary = Math.round((min + 1000) / 500) * 500;
  const fee = Math.round(salary / 2);
  const now = Math.min(price, fee), later = Math.max(0, fee - price);
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-brand-100">
      <p className="text-xs font-extrabold tracking-wide text-brand-700 uppercase">Example: a {taka(salary)} tuition</p>
      <p className="mt-1 text-sm text-slate-600">মিডিয়া ফি = প্রথম মাসের বেতনের 50% = <b className="text-forest">{taka(fee)}</b></p>
      <div className="mt-3 flex h-10 gap-0.5 overflow-hidden rounded-xl text-sm font-extrabold tabular-nums" role="img" aria-label={`${taka(now)} paid now with Premium, ${taka(later)} after the first salary`}>
        <span className="flex min-w-16 items-center justify-center bg-mango px-2 text-forest transition-[flex-basis] duration-500" style={{ flexBasis: `${(100 * now) / fee}%` }}>{taka(now)}</span>
        {later > 0 && <span className="flex min-w-16 flex-1 items-center justify-center bg-brand-600 px-2 text-white">{taka(later)}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm bg-mango ring-1 ring-forest/20" />Premium, paid now</span>
        {later > 0 && <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm bg-brand-600" />After the first salary</span>}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">Premium-এর টাকা ফি-র ভেতরেই ধরা, বাড়তি কিছু নয়। আপনার সর্বনিম্ন বেতনের ({taka(min)}) টিউশন হলে Premium-এই পুরো ফি শোধ।</p>
    </div>
  );
}

/** Said before every application, and kept in view while a term runs (owner, 2026-11-05). */
export function Patience({ during = false }: { during?: boolean }) {
  return (
    <SectionCard icon={HeartHandshake} tone="violet" title={during ? "ধৈর্য রাখুন" : "A word before you apply"} className="mt-5"
      hint={during ? "HTR প্রতিদিন আপনার শর্তে মেলে এমন টিউশন খুঁজছে।" : "Premium নেওয়ার আগে সবাইকে এটা বলা হয়।"}>
      <div className="space-y-2.5 text-[15px] leading-relaxed text-slate-700">
        <p><b className="text-violet-900">টিউশন রিযিকের ব্যাপার।</b> রিযিকে থাকলে ইনশাআল্লাহ পাবেন।</p>
        <p>HTR আপনার জন্য সর্বাত্মক চেষ্টা করবে। তবে Premium টিউশনের নিশ্চয়তা নয়; এটা সমান যোগ্যদের মধ্যে আগে বিবেচনার সুযোগ।</p>
        <p>{during
          ? "প্রোফাইল হালনাগাদ রাখুন আর HTR-এর মেসেজে দ্রুত উত্তর দিন। 90 দিনে না হলে পুরো টাকা ফেরত, অথবা আরও 90 দিন।"
          : "ধৈর্য রাখুন। 90 দিনে টিউশন না হলে পুরো টাকা ফেরত, অথবা আরও 90 দিন।"}</p>
      </div>
    </SectionCard>
  );
}
