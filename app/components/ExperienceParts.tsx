// The Experience tab's pieces (owner, 2026-11-05). Writing help drawn from how the best sheet entries were written:
// they name a method, a hard topic and a number (months, marks, roll), so each box offers starters, an example and a
// meter that asks for exactly that. Habits are how-often questions with an honest "no". The chart shows students
// taught per level as the tutor types. The examples are invented; no real tutor's words are used.
import { useEffect, useRef, useState, type RefObject } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { inputClass } from "~/components/admin";
import { ChoiceChip } from "~/components/tutor";
import { type Band, HABITS, type HabitCol, type Level, bandShort } from "~/lib/profile";
import { VoiceSpot } from "~/components/VoiceNote";
import type { VoiceSpotKey } from "~/lib/voice";

// ---------- Writing help ----------

type Kind = "approach" | "story";

const STARTERS: Record<Kind, [string, string][]> = {
  approach: [
    ["First class", "প্রথম ক্লাসে আমি ছাত্রের অবস্থা বুঝতে "],
    ["Hard topics", "যে টপিকগুলো কঠিন লাগে (যেমন …), সেগুলো আমি "],
    ["If they fall behind", "কেউ পিছিয়ে পড়লে আমি "],
    ["After each chapter", "প্রতিটি অধ্যায় শেষে আমি "],
    ["Before exams", "পরীক্ষার আগে আমি "],
  ],
  story: [
    ["Who and when", "২০২৫ সালে ক্লাস …-এর একজনকে … মাস পড়িয়েছি। "],
    ["At the start", "শুরুতে সে "],
    ["What you did", "আমি যা করেছি: "],
    ["The result", "এখন সে "],
  ],
};

const EXAMPLES: Record<Kind, Record<Band, string>> = {
  approach: {
    junior: "প্রথম দুই ক্লাসে দেখি ছাত্রী কোথায় আটকায়, তারপর ছোট ছোট পড়া দিই। গণিতে গল্প আর ছবি দিয়ে যোগ-বিয়োগ বোঝাই, ইংরেজিতে প্রতিদিন পাঁচটা নতুন শব্দ। প্রতি শুক্রবার ২০ নম্বরের ছোট পরীক্ষা নিই, ভুলগুলো আলাদা খাতায় লিখে আবার করাই। মাসে একবার অভিভাবককে জানাই কী শেষ হলো আর কোথায় সময় লাগছে।",
    ssc: "প্রথমে বেসিক দেখি: সূত্র আর একক ঠিক আছে কিনা। সূত্র মুখস্থ না করিয়ে কোথা থেকে এল সেটা বোঝাই, তারপর বোর্ড প্রশ্নের CQ আর MCQ ধরে অনুশীলন। ভেক্টর আর গতি অধ্যায় ছবি এঁকে ধাপে ধাপে করাই। প্রতি অধ্যায় শেষে সময় ধরে পরীক্ষা নিই, আর টেস্টের আগে গত পাঁচ বছরের বোর্ড প্রশ্ন সমাধান করাই।",
    hsc: "একাডেমিক আর এডমিশন একসাথে মাথায় রেখে পড়াই। ক্যালকুলাস টাইপ ধরে ভাগ করি, যাতে দেখেই বোঝা যায় কোন পদ্ধতি লাগবে। জৈব রসায়নের বিক্রিয়াগুলো চার্ট করে দিই। প্রতি সপ্তাহে একটা বোর্ড প্রশ্ন আর একটা এডমিশন প্রশ্নের সেট; ভুলগুলো নিয়ে পরের ক্লাসের প্রথম ১০ মিনিট কাজ করি।",
  },
  story: {
    junior: "২০২৪ সালে ক্লাস ৪-এর এক ছাত্রকে এক বছর গণিত আর ইংরেজি পড়িয়েছি। শুরুতে নামতা জানত না, রোল ছিল ৩০-এর পরে। প্রতিদিন ১০ মিনিট নামতা আর মুখে মুখে অংক করিয়েছি। বার্ষিকে গণিতে ৮৮ পেয়েছে, রোল এখন ১২।",
    ssc: "ক্লাস ৯-এর এক ছাত্রীকে ৬ মাস উচ্চতর গণিত পড়িয়েছি। অর্ধবার্ষিকে ৩৫ পেয়েছিল, ত্রিকোণমিতি একদম পারত না। আগে মূল সূত্রগুলো প্রমাণসহ করিয়েছি, তারপর প্রতি সপ্তাহে ১০টা বোর্ড প্রশ্ন। বার্ষিকে পেয়েছে ৭৮।",
    hsc: "এইচএসসি পরীক্ষার্থী এক ছাত্রকে ৮ মাস পদার্থবিজ্ঞান পড়িয়েছি। টেস্টে ফেল করার ভয় ছিল। প্রতিটি অধ্যায়ের গাণিতিক সমস্যা ধাপে ধাপে করিয়ে সপ্তাহে দুইবার পরীক্ষা নিয়েছি। বোর্ডে পদার্থে A+ পেয়েছে।",
  },
};

/** How much a box says: a start, good, or detailed. Detail needs length and a number (months, marks, roll). */
function depth(text: string) {
  const t = text.trim();
  const number = /[0-9০-৯]/.test(t);
  const level = t.length < 60 ? (t ? 1 : 0) : t.length < 220 ? (number ? 2 : 1) : number ? 3 : 2;
  const tip = !t ? null : t.length < 60 ? "আরো কয়েক লাইন লিখুন: ক্লাসে ধাপে ধাপে কী করেন।"
    : !number ? "একটা সংখ্যা যোগ করুন: কত মাস, কত মার্ক থেকে কত, রোল কত।"
    : level < 3 ? "আরেকটু বিস্তারিত: কোন টপিক কঠিন লাগে, আপনি কীভাবে সহজ করেন।" : null;
  return { level, word: ["", "A start", "Good", "Detailed"][level], tip };
}

export function GuidedText({ name, kind, band, label, optional, initial, max = 2000, rows = 4, voice }: {
  name: string; kind: Kind; band: Band; label: string; optional?: boolean; initial: string; max?: number; rows?: number; voice?: VoiceSpotKey;
}) {
  const [text, setText] = useState(initial);
  const [example, setExample] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const d = depth(text);
  // A starter goes on its own line at the end; the cursor waits after it. The textarea's change event reaches the form.
  const add = (starter: string) => {
    const el = box.current;
    if (!el) return;
    const next = `${text.trimEnd()}${text.trim() ? "\n" : ""}${starter}`.slice(0, max);
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
    el.setSelectionRange(next.length, next.length);
  };
  const used = (starter: string) => text.includes(starter.slice(0, 12));
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 text-xs font-bold text-slate-600">{label}{optional && <span className="font-normal text-slate-400"> (optional)</span>}</span>
        {voice && <VoiceSpot spot={voice} className="shrink-0" />}
        <button type="button" onClick={() => setExample((e) => !e)} aria-expanded={example} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold whitespace-nowrap text-brand-700 hover:bg-brand-50">
          Example<ChevronDown size={14} aria-hidden className={`transition-transform duration-200 motion-reduce:transition-none ${example ? "rotate-180" : ""}`} />
        </button>
      </div>
      {example && (
        <div className="mt-1 mb-2 animate-rise rounded-xl bg-cream p-3 ring-1 ring-brand-100 motion-reduce:animate-none">
          <p className="text-[13px] font-bold tracking-[0.12em] text-brand-700 uppercase">Example · {bandShort(band)}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{EXAMPLES[kind][band]}</p>
          <p className="mt-2 text-sm text-slate-500">নিজের কথা নিজের মতো লিখুন। উদাহরণ কপি করলে HTR সহজেই বোঝে।</p>
        </div>
      )}
      <div className="-mx-1 mt-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5 scroll-thin">
        {STARTERS[kind].map(([chip, starter]) => {
          const done = used(starter);
          return (
            <button key={chip} type="button" onClick={() => add(starter)} disabled={done}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold transition-colors duration-150 ${done ? "bg-brand-50 text-brand-700" : "bg-white text-forest ring-1 ring-slate-200 hover:ring-brand-300"}`}>
              {done ? <Check size={13} strokeWidth={3} aria-hidden /> : <Plus size={13} strokeWidth={3} aria-hidden />}{chip}
            </button>
          );
        })}
      </div>
      <textarea ref={box} name={name} rows={rows} maxLength={max} value={text} onChange={(e) => setText(e.target.value)} aria-label={label}
        placeholder="নিজের ভাষায় খোলা মনে লিখুন। ওপরের যেকোনো একটা চাপ দিয়ে শুরু করতে পারেন।" className={`${inputClass} py-3`} />
      <div className="mt-1.5 flex items-start gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div aria-hidden className="flex w-16 shrink-0 gap-[3px]">
            {[1, 2, 3].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${d.level >= n ? (d.level === 3 ? "bg-emerald-600" : "bg-brand-400") : "bg-slate-200"}`} />)}
          </div>
          <p className="min-w-0 text-xs text-slate-500" aria-live="polite">
            {d.word && <span className="font-bold text-forest">{d.word}. </span>}{d.tip}
          </p>
        </div>
        <span className={`shrink-0 text-xs tabular-nums ${text.length > max * 0.9 ? "font-semibold text-forest" : "text-slate-500"}`}>{text.length}/{max}</span>
      </div>
    </div>
  );
}

// ---------- Habits ----------

export type HabitAnswers = Partial<Record<HabitCol, string | null>>;

/**
 * The habits asked once for every level (owner, 2026-11-09): the answer most levels already share, so a tutor who
 * answered per level before sees what they said.
 */
export function sharedHabits(levels: Level[], bands: Band[]): HabitAnswers {
  const mine = levels.filter((l) => bands.includes(l.band));
  return Object.fromEntries(HABITS.map((h) => {
    const counts = new Map<string, number>();
    for (const l of mine) if (l[h.col]) counts.set(l[h.col]!, (counts.get(l[h.col]!) ?? 0) + 1);
    return [h.col, [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]];
  }).filter(([, v]) => v));
}

/** A level answered differently from the shared habits keeps its own answers. */
export const ownHabits = (level: Level | undefined, shared: HabitAnswers) =>
  !!level && HABITS.some((h) => level[h.col] !== null && level[h.col] !== shared[h.col]);

/** Four how-often questions; nothing is picked until the tutor answers. `prefix` names the radios. */
export function HabitQuestions({ prefix, answers }: { prefix: string; answers: HabitAnswers }) {
  return (
    <div className="space-y-3">
      {HABITS.map((h) => (
        <fieldset key={h.key}>
          <legend className="mb-1.5 text-sm font-bold text-forest">{h.q}</legend>
          <div className="flex flex-wrap gap-2">
            {h.options.map(([k, label]) => (
              <ChoiceChip key={k} type="radio" name={`${prefix}${h.key}`} value={k} checked={answers[h.col] === k}>{label}</ChoiceChip>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

/** Inside a level: "Different at this level?" opens that level's own four questions; closed, the shared answers count. */
export function LevelHabits({ band, level, shared }: { band: Band; level?: Level; shared: HabitAnswers }) {
  const [own, setOwn] = useState(() => ownHabits(level, shared));
  return (
    <div className="mt-4 rounded-xl bg-cream p-3 ring-1 ring-brand-100">
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-forest">
        <input type="checkbox" name={`lv_${band}_own_habits`} value="1" checked={own} onChange={(e) => setOwn(e.target.checked)} className="size-5 shrink-0 accent-forest" />
        My habits are different at {bandShort(band)}
      </label>
      {own ? (
        <div className="mt-2"><HabitQuestions prefix={`lv_${band}_`} answers={level ?? {}} /></div>
      ) : (
        <p className="text-sm text-slate-600">{bandShort(band)}-এ আপনার উপরের "Your habits" উত্তরগুলোই ধরা হবে।</p>
      )}
    </div>
  );
}

// ---------- Chart ----------

// The brand's three colours, matching the level cards (owner, 2026-11-09).
const BAND_COLOR: Record<Band, string> = { junior: "var(--color-mango-deep)", ssc: "var(--color-brand-500)", hsc: "var(--color-forest)" };

/**
 * Students taught per level as a ring, read live from the level boxes below (the form's own inputs), so the ring moves
 * as the tutor types. Total years is the longest a level has been taught, not a sum: the levels overlap in time.
 */
export function ExperienceChart({ form, bands, added }: { form: RefObject<HTMLFormElement | null>; bands: Band[]; added: number }) {
  const read = () => bands.map((b) => {
    const num = (k: string) => Number((form.current?.elements.namedItem(`lv_${b}_${k}`) as HTMLInputElement | null)?.value || 0);
    return { band: b, students: Math.max(0, num("students")), years: Math.max(0, num("years")) };
  });
  const [rows, setRows] = useState(() => bands.map((b) => ({ band: b, students: 0, years: 0 })));
  useEffect(() => {
    const f = form.current;
    if (!f) return;
    const update = () => setRows(read());
    update();
    f.addEventListener("input", update);
    return () => f.removeEventListener("input", update);
  }, [bands.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = rows.reduce((n, r) => n + r.students, 0);
  const years = Math.max(0, ...rows.map((r) => r.years));
  let at = 0;
  const ring = total
    ? `conic-gradient(${rows.filter((r) => r.students).map((r) => { const from = at; at += (360 * r.students) / total; return `${BAND_COLOR[r.band]} ${from}deg ${at}deg`; }).join(", ")})`
    : "conic-gradient(var(--color-slate-200) 0deg 360deg)";
  return (
    <section aria-label="Your experience at a glance" className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-brand-100">
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <div className="relative grid size-[104px] shrink-0 place-items-center rounded-full transition-[background] duration-500" style={{ background: ring }}>
          <div className="grid size-[76px] place-items-center rounded-full bg-white text-center">
            <span>
              <span className="block text-2xl leading-none font-extrabold text-forest tabular-nums">{total}</span>
              <span className="block text-[13px] font-bold text-slate-500">students</span>
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold tracking-[0.14em] text-brand-700 uppercase">Your experience</p>
          <ul className="mt-1.5 space-y-1">
            {rows.map((r) => (
              <li key={r.band} className="flex items-center gap-2 text-sm">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: BAND_COLOR[r.band] }} />
                <span className="font-bold text-forest">{bandShort(r.band)}</span>
                <span className="ml-auto text-slate-600 tabular-nums">{r.students ? `${r.students} · ${r.years ? `${r.years} yr` : "– yr"}` : <span className="text-slate-400">not filled</span>}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="border-t border-brand-50 bg-brand-50/50 px-4 py-2.5 text-xs text-slate-600 sm:px-5">
        {total ? <><b className="text-forest">{years ? `${years} ${years === 1 ? "year" : "years"}` : "Add years"}</b> teaching · <b className="text-forest">{added}</b> {added === 1 ? "student" : "students"} with details above</>
          : "নিচে প্রতিটি লেভেলে কতজনকে পড়িয়েছেন লিখুন, এখানে চার্ট হয়ে দেখাবে।"}
      </p>
    </section>
  );
}
