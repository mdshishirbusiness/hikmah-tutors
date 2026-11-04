// The tutor's profile progress (owner, 2026-11-05: "should look like a senior designer made it"; inspired by an expanding
// task card the owner sent, not copied). A light card: a ring that fills to the real percentage, a bar split into one
// coloured segment per group, and the next step as the one highlighted row. Tapping opens the step tree: check circles
// on a connector line, grouped by colour. Motion is short (fill, check, open) and stops under reduced motion.
import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { SECTION_TONES } from "~/components/SectionCard";
import { CONTACT, waLink } from "~/lib/contact";
import { type ProgressStep, STEP_GROUPS, profilePercent, stepGain } from "~/lib/profile";

/** Starts at 0 and moves to the target once after mount, so CSS transitions draw the fill. */
function useArrive(target: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return v;
}

/** A number that counts up with the ring. */
function useCount(target: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(target);
    let f = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setN(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) f = requestAnimationFrame(tick);
    };
    f = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(f);
  }, [target]);
  return n;
}

function Ring({ percent }: { percent: number }) {
  const r = 25, c = 2 * Math.PI * r;
  const p = useArrive(percent), n = useCount(percent);
  return (
    <span className="relative grid size-[62px] shrink-0 place-items-center">
      <svg viewBox="0 0 62 62" className="absolute inset-0 -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ring-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-brand-500)" />
            <stop offset="1" stopColor="var(--color-brand-700)" />
          </linearGradient>
        </defs>
        <circle cx="31" cy="31" r={r} fill="none" stroke="var(--color-brand-100)" strokeWidth="6" />
        <circle cx="31" cy="31" r={r} fill="none" stroke="url(#ring-fill)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} className="transition-[stroke-dashoffset] duration-[900ms] ease-out" />
      </svg>
      <span className="text-[17px] font-extrabold tracking-tight text-forest tabular-nums">{n}<span className="text-[11px] text-slate-500">%</span></span>
    </span>
  );
}

export function ProfileChecklist({ steps, code }: { steps: ProgressStep[]; code: number }) {
  const [open, setOpen] = useState(false);
  const percent = profilePercent(steps);
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const groups = STEP_GROUPS.map((g) => ({ ...g, steps: steps.filter((s) => s.group === g.key) })).filter((g) => g.steps.length);
  const arrived = useArrive(1);
  const href = (s: ProgressStep) => (s.key === "photo" ? waLink(CONTACT.whatsapp, `Assalamu alaikum, I'm tutor T-${code}. Here is my photo for my profile.`) : `#${s.section}`);
  const ext = (s: ProgressStep) => (s.key === "photo" ? { target: "_blank", rel: "noreferrer" } : {});
  const nextTone = next ? SECTION_TONES[STEP_GROUPS.find((g) => g.key === next.group)!.tone] : null;

  return (
    <section aria-label="Profile progress" className="mt-5 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-brand-100">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="profile-steps"
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-brand-50/40 sm:p-5">
        <Ring percent={percent} />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold tracking-[0.14em] text-brand-700 uppercase">Profile strength</span>
          <span className="mt-0.5 block text-[17px] leading-tight font-extrabold tracking-tight text-forest">{done} of {steps.length} steps done</span>
          <span className="mt-0.5 block text-sm text-slate-500">{percent === 100 ? "Complete. HTR sees you first." : "Complete profiles are shown to HTR first."}</span>
        </span>
        <ChevronDown size={20} aria-hidden className={`shrink-0 text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* One segment per group, sized by its weight, filled by what is done. */}
      <div aria-hidden className="flex gap-1 px-4 sm:px-5">
        {groups.map((g, i) => {
          const total = g.steps.reduce((n, s) => n + s.weight, 0);
          const got = g.steps.filter((s) => s.done).reduce((n, s) => n + s.weight, 0);
          return (
            <span key={g.key} title={g.label} className="h-1.5 overflow-hidden rounded-full bg-slate-100" style={{ flexGrow: total, flexBasis: 0 }}>
              <span className={`block h-full rounded-full ${SECTION_TONES[g.tone].dot} transition-[width] duration-700 ease-out`}
                style={{ width: `${arrived ? (100 * got) / total : 0}%`, transitionDelay: `${150 + i * 90}ms` }} />
            </span>
          );
        })}
      </div>

      {next && nextTone && (
        <a href={href(next)} {...ext(next)} className={`group mx-4 mt-4 mb-4 flex items-center gap-3 rounded-2xl px-3.5 py-3 ring-1 transition-shadow hover:shadow-card sm:mx-5 ${nextTone.soft} ${SECTION_TONES[STEP_GROUPS.find((g) => g.key === next.group)!.tone].frame}`}>
          <span className="relative flex size-3 shrink-0" aria-hidden>
            <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-40 motion-reduce:animate-none ${nextTone.dot}`} />
            <span className={`relative inline-flex size-3 rounded-full ${nextTone.dot}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-[11px] font-bold tracking-[0.12em] uppercase ${nextTone.text}`}>Next · {STEP_GROUPS.find((g) => g.key === next.group)!.label}</span>
            <span className="block font-extrabold text-forest">{next.label}</span>
          </span>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-forest shadow-sm tabular-nums">+{stepGain(steps, next)}%</span>
          <ArrowRight size={17} aria-hidden className="shrink-0 text-forest transition-transform duration-200 group-hover:translate-x-0.5" />
        </a>
      )}

      <div id="profile-steps" className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="space-y-5 border-t border-slate-100 px-4 pt-4 pb-5 sm:px-5">
            {groups.map((g) => {
              const t = SECTION_TONES[g.tone];
              return (
                <div key={g.key}>
                  <p className="flex items-center gap-2 text-sm font-extrabold text-forest">
                    <span aria-hidden className={`size-2 rounded-full ${t.dot}`} />{g.label}
                    <span className="ml-auto text-xs font-semibold text-slate-400 tabular-nums">{g.steps.filter((s) => s.done).length}/{g.steps.length}</span>
                  </p>
                  <ul className="relative mt-2 ml-[5px] space-y-0.5 border-l border-slate-200 pl-4">
                    {g.steps.map((s, i) => {
                      const isNext = s === next;
                      return (
                        <li key={s.key} className="relative">
                          <span aria-hidden className={`absolute top-1/2 -left-[26px] grid size-[19px] -translate-y-1/2 place-items-center rounded-full ${s.done ? `${t.dot} text-white` : isNext ? `bg-white ring-2 ${t.strong}` : "bg-white ring-2 ring-slate-200"}`}>
                            {s.done && <Check size={11} strokeWidth={3.5} className={open ? "animate-pop" : ""} style={{ animationDelay: `${i * 50}ms` }} />}
                          </span>
                          <a href={href(s)} {...ext(s)} onClick={() => setOpen(false)}
                            className={`flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm transition-colors hover:bg-slate-50 ${s.done ? "text-slate-500" : isNext ? `font-extrabold text-forest ${t.soft}` : "font-semibold text-forest"}`}>
                            <span className="min-w-0 flex-1">{s.label}</span>
                            {!s.done && <span className="shrink-0 text-xs font-bold text-slate-400 tabular-nums">+{stepGain(steps, s)}%</span>}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
