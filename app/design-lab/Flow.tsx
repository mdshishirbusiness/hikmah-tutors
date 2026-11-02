// Design lab, round 2: the shared light flow (board → detail → apply → done) around any of the three cards. It keeps
// the parts of round 1 the owner found useful: per-class rate and an honest fee chart, the fit checks, a clear receipt.
import { useState, type ComponentType, type ReactNode } from "react";
import { bnDigits, taka } from "~/lib/tuition";
import { GenderChip, SubjectChips, appliedText, type CardProps } from "./Cards";
import { CheckRow, Icon, Sheet, useApply, useStage } from "./parts";
import { ME, PLAN_NAME, PLAN_TERMS, STEPS, T1, T2, T3, area, cls, fees, fit, mediumEn, planFee, student, type LabTuition, type Plan } from "./sample";

const PAGE = "min-h-[calc(100dvh-3rem)] bg-cream text-slate-900";
const HATCH = { backgroundImage: "repeating-linear-gradient(135deg, rgb(9 51 42 / 0.16) 0 3px, transparent 3px 7px)" };
const box = (on: boolean) => (on ? "border-forest bg-forest text-cream" : "border-slate-300 bg-white");

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-slate-600">{k}</dt>
    <dd className="text-right font-semibold text-forest">{v}</dd>
  </div>
);

function Board({ Card, card }: { Card: ComponentType<CardProps>; card: (t: LabTuition) => CardProps }) {
  return (
    <div className={`${PAGE} pb-10`}>
      <header className="px-5 pt-6 pb-4">
        <p className="text-sm text-slate-600">শুভ বিকেল, {ME.first}</p>
        <h2 className="mt-1 text-[28px] leading-tight font-semibold text-forest">আজ {bnDigits(12)}টি নতুন টিউশন</h2>
        <div className="mt-4 flex min-h-12 items-center gap-2 rounded-2xl bg-white px-4 text-slate-500 ring-1 ring-brand-100">
          <Icon name="search" className="size-5 text-brand-600" />
          <span className="text-[15px]">এলাকা, ক্লাস বা বিষয় খুঁজুন</span>
        </div>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 text-sm font-semibold [scrollbar-width:none]">
          {["সব", "কাছাকাছি", "Class 9", "Class 10", "SSC 27", "SSC 28"].map((x, i) => (
            <button key={x} type="button" className={`min-h-11 shrink-0 rounded-full px-4 ${i ? "bg-white text-forest ring-1 ring-brand-100" : "bg-forest text-cream"}`}>{x}</button>
          ))}
        </div>
      </header>
      <div className="space-y-4 px-4">
        {[T1, T2, T3].map((x) => <Card key={x.code} {...card(x)} />)}
      </div>
    </div>
  );
}

/** Six months of salary; the first bar is cut by the one-time fee (hatched). */
function Months({ t, plan }: { t: LabTuition; plan: Plan }) {
  const kept = 1 - planFee(t, plan) / t.salary_amount;
  return (
    <div aria-hidden>
      <div className="flex h-24 items-end gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex h-full flex-1 flex-col overflow-hidden rounded-md">
            {i === 0 && <div className="flex-1 bg-white" style={HATCH} />}
            <div className={`bg-mango transition-[height] duration-300 ${i ? "flex-1" : ""}`} style={i ? undefined : { height: `${kept * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-center text-[11px] text-slate-600">
        {[1, 2, 3, 4, 5, 6].map((m) => <span key={m} className="flex-1">মাস {bnDigits(m)}</span>)}
      </div>
    </div>
  );
}

function Detail({ t, Card, applied, onBack, onApply }: { t: LabTuition; Card: ComponentType<CardProps>; applied: boolean; onBack: () => void; onApply: () => void }) {
  const [plan, setPlan] = useState<Plan>("standard");
  const f = fees(t);
  const fee = planFee(t, plan);
  const match = fit(t);
  const facts: [string, ReactNode][] = [
    ["শিক্ষার্থী", `${student(t)}, ${cls(t)}`],
    ["বিষয়", <SubjectChips key="s" t={t} />],
    ["মাধ্যম", mediumEn(t)],
    ["সময়", `সপ্তাহে ${bnDigits(t.days_per_week)} দিন, ${t.hours} করে, ${t.when}`],
    ["কোথায়", `${area(t)} · বাসায় গিয়ে`],
    ["টিউটর", <GenderChip key="g" t={t} />],
    ["শুরু", t.start_note],
  ];
  return (
    <div className={PAGE}>
      <div className="sticky top-12 z-10 flex items-center gap-1 bg-cream/90 px-2 py-1 backdrop-blur">
        <button type="button" aria-label="ফিরে যান" onClick={onBack} className="grid size-11 place-items-center rounded-full text-forest hover:bg-brand-50"><Icon name="back" /></button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-forest">{t.code_label} · {appliedText(t)}</span>
        <button type="button" aria-label="শেয়ার" className="grid size-11 place-items-center rounded-full text-forest hover:bg-brand-50"><Icon name="share" /></button>
        <button type="button" aria-label="সেভ করুন" className="grid size-11 place-items-center rounded-full text-forest hover:bg-brand-50"><Icon name="bookmark" /></button>
      </div>
      <div className="px-4 pt-2"><Card t={t} hero applied={applied} onApply={onApply} /></div>

      <section className="mx-4 mt-4 rounded-3xl bg-white p-5 ring-1 ring-brand-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-forest">কেন আপনার জন্য</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${match.ok === match.total ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"}`}>{bnDigits(match.ok)}/{bnDigits(match.total)} মিল</span>
        </div>
        <ul className="mt-3 space-y-3">
          {t.checks.map((c) => (
            <li key={c.title} className="flex gap-3">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full ${c.ok ? "bg-brand-50 text-brand-600" : "bg-rose-50 text-rose-600"}`}><Icon name={c.ok ? "check" : "x"} className="size-4" /></span>
              <div>
                <p className="font-semibold text-forest">{c.title}</p>
                <p className="text-sm text-slate-600">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-4 mt-4 rounded-3xl bg-white px-5 py-2 ring-1 ring-brand-100">
        <dl className="divide-y divide-brand-50">
          {facts.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[80px_1fr] gap-3 py-3">
              <dt className="text-sm text-slate-600">{k}</dt>
              <dd className="text-[15px] text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mb-3 rounded-2xl bg-cream p-3.5 text-[15px] leading-relaxed text-slate-800 ring-1 ring-brand-100">
          <span className="font-semibold text-forest">গার্ডিয়ান যা চান: </span>
          {t.requirements_public}
        </p>
      </section>

      <section className="mx-4 mt-4 rounded-3xl bg-white p-5 ring-1 ring-brand-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-forest">৬ মাসে আপনার হাতে</h3>
            <p className="text-xs text-slate-600">উদাহরণ: টিউশন ৬ মাস চললে</p>
          </div>
          <div role="radiogroup" aria-label="ফি প্ল্যান" className="flex shrink-0 rounded-full bg-brand-50 p-1 text-xs font-semibold">
            {(["standard", "early"] as const).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={plan === p} onClick={() => setPlan(p)} className={`min-h-11 rounded-full px-3 transition-colors duration-150 ${plan === p ? "bg-forest text-cream" : "text-forest"}`}>
                {p === "early" ? "আর্লি" : "স্ট্যান্ডার্ড"}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[34px] leading-none font-semibold tracking-tight text-forest">{taka(t.salary_amount * 6 - fee)}</p>
        <div className="mt-4"><Months t={t} plan={plan} /></div>
        <dl className="mt-4 space-y-1.5 text-sm">
          <Row k="প্রথম মাসে হাতে" v={taka(t.salary_amount - fee)} />
          <Row k="২য় মাস থেকে, প্রতি মাসে" v={taka(t.salary_amount)} />
          <Row k="Hikmah ফি, একবারই" v={plan === "early" ? `${taka(fee)} (জয়েনের ৭ দিনে)` : `${taka(f.first)} + ${taka(f.second)}`} />
        </dl>
      </section>

      <ul className="mx-4 mt-4 space-y-2.5 px-1 text-sm text-slate-700">
        {["আবেদন করতে কোনো টাকা লাগে না", "ফি শুধু কনফার্ম হলে, একবারই", "গার্ডিয়ানের সাথে কথা বলে পোস্ট করা"].map((x) => (
          <li key={x} className="flex items-center gap-2.5"><Icon name="shield" className="size-5 shrink-0 text-brand-600" />{x}</li>
        ))}
      </ul>

      <div className="sticky bottom-0 mt-4 flex gap-2 bg-linear-to-t from-cream from-60% to-transparent px-4 pt-6 pb-4">
        <button type="button" aria-label="সেভ করুন" className="grid size-14 place-items-center rounded-2xl bg-white text-forest ring-1 ring-brand-100"><Icon name="bookmark" /></button>
        {t.status === "processing" ? (
          <p className="flex min-h-14 flex-1 items-center justify-center rounded-2xl bg-slate-200 text-lg font-semibold text-slate-700">Processing</p>
        ) : applied ? (
          <p className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-50 text-lg font-semibold text-brand-700 ring-1 ring-brand-200"><Icon name="check" />Applied</p>
        ) : (
          <button type="button" onClick={onApply} className="min-h-14 flex-1 rounded-2xl bg-forest text-lg font-semibold text-cream transition-colors duration-150 hover:bg-brand-700">আবেদন করুন</button>
        )}
      </div>
    </div>
  );
}

function ApplySheet({ t, onClose, onDone }: { t: LabTuition; onClose: () => void; onDone: (p: Plan) => void }) {
  const a = useApply();
  const f = fees(t);
  const [noteOpen, setNoteOpen] = useState(false);
  const options = [
    { p: "early" as const, amount: f.early_total, sub: "জয়েনের ৭ দিনের মধ্যে, একবারে" },
    { p: "standard" as const, amount: f.standard_total, sub: `${taka(f.first)} কনফার্মের পর + ${taka(f.second)} প্রথম স্যালারি পেয়ে` },
  ];
  return (
    <Sheet label={`${t.code_label} আবেদন`} onClose={onClose} className="bg-white text-slate-900">
      <div className="px-5 pt-4 pb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-700">{t.code_label} · {area(t)} · {cls(t)} · {taka(t.salary_amount)}</p>
            <h2 className="mt-0.5 text-2xl font-semibold text-forest">আবেদন করুন</h2>
          </div>
          <button type="button" aria-label="বন্ধ করুন" onClick={onClose} className="-mr-2 grid size-11 place-items-center rounded-full text-forest hover:bg-brand-50"><Icon name="x" /></button>
        </div>
        {t.requirements_public && <p className="mt-3 border-l-2 border-brand-500 pl-2 text-sm text-slate-800">{t.requirements_public}</p>}
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">
          <Icon name="check" className="size-4 shrink-0" />
          আপনার প্রোফাইল সম্পূর্ণ, আবেদন করা যাবে
        </p>
        <fieldset className="mt-5">
          <legend className="font-semibold text-forest">কনফার্ম হলে ফি কীভাবে দেবেন?</legend>
          <p className="mt-0.5 text-sm text-slate-600">আবেদন ফ্রি। ফি একবারই, শুধু কনফার্ম হলে।</p>
          <div className="mt-3 space-y-2">
            {options.map(({ p, amount, sub }) => (
              <label key={p} className={`relative block cursor-pointer rounded-2xl border-2 p-4 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${a.plan === p ? "border-forest bg-brand-50/60" : "border-brand-100"}`}>
                <input type="radio" name="plan" className="sr-only" checked={a.plan === p} onChange={() => a.setPlan(p)} />
                <span className="flex items-center gap-3">
                  <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${a.plan === p ? "border-forest" : "border-slate-300"}`}>{a.plan === p && <span className="size-2.5 rounded-full bg-forest" />}</span>
                  <span className="flex-1 font-semibold text-forest">
                    {PLAN_NAME[p]}
                    {p === "early" && <span className="ml-2 rounded-full bg-mango px-2 py-0.5 text-xs text-forest">{taka(f.saving)} কম</span>}
                  </span>
                  <span className="text-xl font-semibold text-forest">{taka(amount)}</span>
                </span>
                <span className="mt-1 block pl-8 text-sm text-slate-600">{sub}</span>
                <span className="mt-1.5 block pl-8 text-xs leading-relaxed text-slate-500">“{PLAN_TERMS[p]}”</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">স্ট্যান্ডার্ড নিলেও জয়েনের ৭ দিনের মধ্যে আর্লিতে বদলাতে পারবেন।</p>
        </fieldset>
        <div className="mt-5 space-y-2.5">
          <CheckRow checked={a.can} onChange={a.setCan} className="bg-cream ring-1 ring-brand-100" box={box(a.can)}>
            সপ্তাহে {bnDigits(t.days_per_week)} দিন, {t.hours} করে, {t.when} {area(t)} এলাকায় পড়াতে পারব
          </CheckRow>
          <CheckRow checked={a.agree} onChange={a.setAgree} className="bg-cream ring-1 ring-brand-100" box={box(a.agree)}>ফির শর্ত পড়েছি, রাজি আছি</CheckRow>
        </div>
        {noteOpen ? (
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">Hikmah-এর জন্য ছোট নোট (ঐচ্ছিক)</span>
            <textarea autoFocus value={a.note} onChange={(e) => a.setNote(e.target.value)} rows={2} placeholder="যেমন: ২ বছর SSC গণিত পড়ানোর অভিজ্ঞতা" className="mt-1.5 w-full resize-none rounded-2xl bg-white p-3.5 text-base ring-1 ring-brand-100 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-forest" />
            <span className="block text-right text-xs text-slate-500">{bnDigits(a.note.length)}/৩০০</span>
          </label>
        ) : (
          <button type="button" onClick={() => setNoteOpen(true)} className="mt-3 min-h-11 text-sm font-semibold text-brand-700">+ নোট যোগ করুন (ঐচ্ছিক)</button>
        )}
        <button type="button" disabled={!a.ready} onClick={() => onDone(a.plan)} className="mt-4 min-h-14 w-full rounded-2xl bg-forest text-lg font-semibold text-cream transition-opacity duration-150 disabled:opacity-35">আবেদন জমা দিন</button>
        {!a.ready && <p className="mt-2 text-center text-xs text-slate-500">দুটো টিক দিলেই জমা দেওয়া যাবে</p>}
      </div>
    </Sheet>
  );
}

function Done({ t, plan, onBoard }: { t: LabTuition; plan: Plan; onBoard: () => void }) {
  return (
    <div className={`${PAGE} px-5 pt-10 pb-10`}>
      <div className="animate-pop mx-auto grid size-20 place-items-center rounded-full bg-brand-600 text-white shadow-[0_12px_30px_-10px_rgb(17_129_109/0.7)]"><Icon name="check" className="size-10" /></div>
      <h2 className="mt-5 text-center text-3xl font-semibold text-forest">আবেদন জমা হয়েছে</h2>
      <p className="mt-2 text-center text-slate-700">শর্টলিস্ট হলে আমরা ফোন করব।<br />স্ট্যাটাস এখানেও দেখতে পাবেন।</p>
      <div className="mt-7 rounded-3xl bg-white p-5 ring-1 ring-brand-100">
        <dl className="space-y-2 text-sm">
          <Row k="টিউশন" v={`${t.code_label} · ${area(t)} · ${cls(t)}`} />
          <Row k="বেতন" v={`${taka(t.salary_amount)} / মাস`} />
          <Row k="ফি প্ল্যান" v={`${PLAN_NAME[plan]} · ${taka(planFee(t, plan))}`} />
        </dl>
        <div className="my-4 border-t border-dashed border-brand-200" />
        <ol>
          {STEPS.map((s, i) => (
            <li key={s.name} className="relative flex gap-3 pb-4 last:pb-0">
              {i < STEPS.length - 1 && <span aria-hidden className="absolute top-6 bottom-0 left-[11px] w-0.5 bg-brand-100" />}
              <span className={`relative grid size-6 shrink-0 place-items-center rounded-full ${i ? "bg-white ring-2 ring-brand-100" : "bg-brand-600 text-white"}`}>{!i && <Icon name="check" className="size-4" />}</span>
              <div>
                <p className={`font-semibold ${i ? "text-slate-700" : "text-forest"}`}>{s.name}</p>
                <p className="text-xs text-slate-600">{s.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-6 grid gap-2">
        <button type="button" onClick={onBoard} className="min-h-14 rounded-2xl bg-forest font-semibold text-cream">আরও টিউশন দেখুন</button>
        <button type="button" className="min-h-14 rounded-2xl bg-white font-semibold text-forest ring-1 ring-brand-100">আমার আবেদনগুলো</button>
      </div>
    </div>
  );
}

export function Flow({ Card }: { Card: ComponentType<CardProps> }) {
  const [stage, go] = useStage();
  const [t, setT] = useState<LabTuition>(T1);
  const [plan, setPlan] = useState<Plan>("standard");
  const [sheet, setSheet] = useState(false);
  const [applied, setApplied] = useState<number[]>([]);
  // Apply opens the sheet over whatever page is showing (board or detail); the card body opens the detail page.
  const card = (x: LabTuition): CardProps => ({
    t: x,
    applied: applied.includes(x.code),
    onApply: () => { setT(x); setSheet(true); },
    onOpen: () => { setT(x); go("detail"); },
  });
  return (
    <>
      {stage === "board" && <Board Card={Card} card={card} />}
      {stage === "detail" && <Detail t={t} Card={Card} applied={applied.includes(t.code)} onBack={() => go("board")} onApply={() => setSheet(true)} />}
      {stage === "done" && <Done t={t} plan={plan} onBoard={() => go("board")} />}
      {sheet && (
        <ApplySheet
          t={t}
          onClose={() => setSheet(false)}
          onDone={(p) => {
            setPlan(p);
            setApplied([...applied, t.code]);
            setSheet(false);
            go("done");
          }}
        />
      )}
    </>
  );
}
