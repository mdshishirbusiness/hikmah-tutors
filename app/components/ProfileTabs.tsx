// The Profile's sticky tabs (owner, 2026-11-05: one part at a time, not one long page, each with its own progress).
// Three tabs on one track; the open one is a forest pill that slides under the labels. Each tab carries its percent and
// a thin line along its foot that fills like the rickshaw's road in the header; a complete tab says Done with a check
// (no star: the star belongs to the rickshaw's arrival alone, owner 2026-11-05). Under the tabs, the next step is one
// tap away (it opens the right tab). At 100% the profile says so for a moment.
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { CONTACT, waLink } from "~/lib/contact";
import { PROFILE_TABS, type ProfileTab, type ProgressStep, profilePercent } from "~/lib/profile";

export const tabId = (t: ProfileTab) => `tab-${t}`;
export const panelId = (t: ProfileTab) => `panel-${t}`;

export function ProfileTabs({ tab, onTab, percents, steps, code }: {
  tab: ProfileTab; onTab: (t: ProfileTab) => void; percents: Record<ProfileTab, number>; steps: ProgressStep[]; code: number;
}) {
  const percent = profilePercent(steps);
  const next = steps.find((s) => !s.done);
  const last = useRef(percent);
  const [cheer, setCheer] = useState(false);
  useEffect(() => {
    if (percent === 100 && last.current < 100) {
      setCheer(true);
      const t = setTimeout(() => setCheer(false), 3500);
      last.current = percent;
      return () => clearTimeout(t);
    }
    last.current = percent;
  }, [percent]);
  const index = PROFILE_TABS.findIndex((t) => t.key === tab);
  // Arrow keys move between tabs, as screen readers expect of a tablist.
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const to = PROFILE_TABS[(index + step + PROFILE_TABS.length) % PROFILE_TABS.length].key;
    onTab(to);
    document.getElementById(tabId(to))?.focus();
  };
  const photo = next?.key === "photo";

  return (
    <div>
      <div role="tablist" aria-label="Profile parts" onKeyDown={onKey} className="relative grid grid-cols-3 rounded-2xl bg-white p-1 shadow-ring">
        <span aria-hidden className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-forest shadow-card transition-transform duration-300 ease-[cubic-bezier(0.3,0.9,0.3,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${index * 100}%)` }} />
        {PROFILE_TABS.map((t) => {
          const on = t.key === tab;
          const p = percents[t.key];
          return (
            <button key={t.key} id={tabId(t.key)} type="button" role="tab" aria-selected={on} aria-controls={panelId(t.key)} tabIndex={on ? 0 : -1}
              onClick={() => onTab(t.key)}
              className="relative flex min-h-[58px] flex-col items-center justify-center rounded-xl px-1 pb-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
              <span className={`text-[15px] leading-tight font-extrabold tracking-tight transition-colors duration-200 ${on ? "text-cream" : "text-forest"}`}>{t.label}</span>
              <span className={`mt-0.5 flex items-center gap-1 text-xs font-bold tabular-nums transition-colors duration-200 ${on ? "text-mango" : "text-slate-500"}`}>
                {p === 100 ? <><Check size={12} strokeWidth={3} aria-hidden />Done</> : `${p}%`}
              </span>
              <span aria-hidden className={`absolute inset-x-3 bottom-1.5 h-[3px] rounded-full transition-colors duration-200 ${on ? "bg-white/20" : "bg-slate-200"}`}>
                <span className={`block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${on ? "bg-mango" : "bg-brand-500"}`} style={{ width: `${p}%` }} />
              </span>
            </button>
          );
        })}
      </div>
      {percent === 100 ? cheer && (
        <p role="status" className="mt-1 flex min-h-9 animate-rise items-center gap-2 text-sm font-extrabold text-emerald-800">
          <span className="grid size-6 place-items-center rounded-full bg-emerald-600 text-white"><Check size={14} strokeWidth={3} aria-hidden /></span>
          Profile complete. HTR sees you first.
        </p>
      ) : next && (
        <a href={photo ? waLink(CONTACT.whatsapp, `Assalamu alaikum, I'm tutor T-${code}. Here is my photo for my profile.`) : `#${next.section}`}
          {...(photo ? { target: "_blank", rel: "noreferrer" } : {})}
          className="group mt-0.5 flex min-h-9 items-center gap-1.5 text-sm text-slate-600">
          <span className="font-bold text-brand-700">Next:</span>
          <span className="min-w-0 truncate font-extrabold text-forest">{next.label}</span>
          <ArrowRight size={15} aria-hidden className="shrink-0 text-forest transition-transform duration-200 group-hover:translate-x-0.5" />
        </a>
      )}
    </div>
  );
}
