// A tutor's experience at one level, as the owner reads it when picking (part B; the applicant panel uses it in part C).
import { Check } from "lucide-react";
import { HABITS, type Level, bandLabel, bandShort, habitAnswer } from "~/lib/profile";

const OLD_TICKS = [["makes_notes", "Notes / sheets"], ["takes_tests", "Regular tests"], ["gives_homework", "Homework"], ["reports_guardian", "Reports to guardian"]] as const;

export function LevelSummary({ level, compact = false }: { level: Level; compact?: boolean }) {
  // How often, as the tutor answered (migration 0023); a tutor who has not answered yet shows the old ticks.
  const answered = HABITS.filter((h) => level[h.col] !== null);
  const habits: [string, string, boolean][] = answered.length
    ? answered.map((h) => [h.key, `${h.owner}: ${habitAnswer(level, h)}`, level[h.col] !== h.no])
    : OLD_TICKS.filter(([k]) => level[k] === 1).map(([k, label]) => [k, label, true]);
  const numbers = [level.students ? `${level.students} students` : null, level.years !== null ? `${level.years} ${level.years === 1 ? "year" : "years"}` : null].filter(Boolean);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-ring">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-extrabold text-forest">{bandShort(level.band)} <span className="text-xs font-semibold text-slate-500">{bandLabel(level.band)}</span></h3>
        <p className="text-sm font-bold text-brand-700">{numbers.join(" · ") || <span className="font-normal text-slate-400">No numbers yet</span>}</p>
      </div>
      {habits.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {habits.map(([k, label, does]) => <li key={k} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${does ? "bg-brand-50 text-forest" : "bg-slate-100 text-slate-500"}`}>{does && <Check size={12} aria-hidden />}{label}</li>)}
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
