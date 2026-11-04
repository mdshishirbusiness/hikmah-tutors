// The Profile's sticky progress line (owner, 2026-11-05): one segment per section, filled when that section is done,
// the same percent as the ring, and the next step one tap away. Not a scroll bar: it shows what is left to fill. When
// the profile reaches 100% in this visit it says so for a moment, then only the jump chips stay.
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { CONTACT, waLink } from "~/lib/contact";
import { type ProgressStep, profilePercent } from "~/lib/profile";

export type BarSection = { id: string; label: string; done: boolean };

export function ProfileBar({ sections, steps, code }: { sections: BarSection[]; steps: ProgressStep[]; code: number }) {
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

  if (percent === 100 && !cheer) return null;
  if (percent === 100) {
    return (
      <p role="status" className="flex min-h-10 animate-rise items-center gap-2 text-sm font-extrabold text-emerald-800">
        <span className="grid size-6 place-items-center rounded-full bg-emerald-600 text-white"><Check size={14} strokeWidth={3} aria-hidden /></span>
        Profile complete. HTR sees you first.
      </p>
    );
  }
  const photo = next?.key === "photo";
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-extrabold text-forest tabular-nums">{percent}%</span>
        <div className="flex flex-1 gap-[3px]" role="img" aria-label={`${sections.filter((s) => s.done).length} of ${sections.length} sections done`}>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} title={s.label} tabIndex={-1} className="group flex h-4 flex-1 items-center">
              <span className={`h-1.5 w-full rounded-full transition-colors duration-500 ${s.done ? "bg-brand-500" : "bg-slate-200 group-hover:bg-slate-300"}`} />
            </a>
          ))}
        </div>
      </div>
      {next && (
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
