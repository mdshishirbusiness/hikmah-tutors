// A tutor's experience at one level, as the owner reads it when picking (part B; the applicant panel uses it in part C).
import { Check } from "lucide-react";
import { type Level, bandLabel, bandShort } from "~/lib/profile";

const HABIT_LABELS = [["makes_notes", "Notes / sheets"], ["takes_tests", "Regular tests"], ["gives_homework", "Homework"], ["reports_guardian", "Reports to guardian"]] as const;

export function LevelSummary({ level, compact = false }: { level: Level; compact?: boolean }) {
  const habits = HABIT_LABELS.filter(([k]) => level[k] === 1);
  const numbers = [level.students ? `${level.students} students` : null, level.years !== null ? `${level.years} ${level.years === 1 ? "year" : "years"}` : null].filter(Boolean);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-ring">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-extrabold text-forest">{bandShort(level.band)} <span className="text-xs font-semibold text-slate-500">{bandLabel(level.band)}</span></h3>
        <p className="text-sm font-bold text-brand-700">{numbers.join(" · ") || <span className="font-normal text-slate-400">No numbers yet</span>}</p>
      </div>
      {habits.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {habits.map(([k, label]) => <li key={k} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-forest"><Check size={12} aria-hidden />{label}</li>)}
        </ul>
      )}
      {level.approach && (
        <div className="mt-3">
          <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">How they teach</p>
          <p className={`mt-0.5 text-sm break-words whitespace-pre-line text-slate-800 ${compact ? "line-clamp-4" : ""}`}>{level.approach}</p>
        </div>
      )}
      {level.story && (
        <div className="mt-3 border-l-[3px] border-mango pl-3">
          <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">A student they helped</p>
          <p className={`mt-0.5 text-sm break-words whitespace-pre-line text-slate-800 ${compact ? "line-clamp-4" : ""}`}>{level.story}</p>
        </div>
      )}
    </div>
  );
}
