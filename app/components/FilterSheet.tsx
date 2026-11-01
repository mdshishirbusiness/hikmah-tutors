import { useEffect, useMemo, useRef, useState } from "react";
import { AREAS, AREAS_TOP, CLASS_LEVELS, DAYS_PER_WEEK, MEDIUMS, MODES, SALARY_PRESETS, SUBJECTS, TUTOR_GENDERS } from "~/lib/options";
import { bnDigits, normalizeSearch, taka, type TuitionFilters } from "~/lib/tuition";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors duration-150 ${active ? "border-forest bg-forest text-cream" : "border-brand-100 bg-white text-forest hover:bg-brand-50"}`}
    >
      {children}
    </button>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-brand-100 py-4 last:border-0">
      <p className="font-semibold text-forest">{title}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function FilterSheet({ open, onClose, filters, setParam, clearAll, resultCount }: {
  open: boolean;
  onClose: () => void;
  filters: TuitionFilters;
  setParam: (name: string, value: string | number | undefined) => void;
  clearAll: () => void;
  resultCount: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [areaQ, setAreaQ] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (open && !d?.open) d?.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  const areas = useMemo(() => {
    const q = normalizeSearch(areaQ);
    if (!q) return AREAS.slice(0, AREAS_TOP);
    return AREAS.filter((a) => normalizeSearch(`${a.label} ${a.alt ?? ""}`).includes(q));
  }, [areaQ]);
  // A chosen area stays visible even when it is outside the short list.
  const chosenArea = filters.area && !areas.some((a) => a.key === filters.area) ? AREAS.find((a) => a.key === filters.area) : undefined;

  const options = (name: string, current: string | undefined, list: { key: string; label: string }[]) =>
    list.map((o) => (
      <Chip key={o.key} active={current === o.key} onClick={() => setParam(name, current === o.key ? undefined : o.key)}>
        {o.label}
      </Chip>
    ));

  return (
    <dialog
      ref={ref}
      aria-labelledby="filter-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-3xl bg-cream p-0 backdrop:bg-forest/50 sm:m-auto sm:max-w-xl sm:rounded-3xl"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 id="filter-title" className="text-lg font-semibold text-forest">সব ফিল্টার</h2>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">বন্ধ করুন</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <Group title="এলাকা">
            <input
              aria-label="এলাকা খুঁজুন"
              value={areaQ}
              onChange={(e) => setAreaQ(e.target.value)}
              placeholder="এলাকা খুঁজুন…"
              className="mb-1 min-h-11 w-full rounded-xl border border-brand-100 bg-white px-3 text-base outline-none focus:border-brand-500"
            />
            {options("area", filters.area, chosenArea ? [chosenArea, ...areas] : areas)}
          </Group>
          <Group title="ক্লাস">{options("class", filters.class_level, CLASS_LEVELS)}</Group>
          <Group title="বিষয়">{options("subject", filters.subject, SUBJECTS)}</Group>
          <Group title="মাধ্যম">{options("medium", filters.medium, MEDIUMS)}</Group>
          <Group title="টিউটর">{options("gender", filters.tutor_gender, TUTOR_GENDERS)}</Group>
          <Group title="মোড">{options("mode", filters.mode, MODES)}</Group>
          <Group title="বেতন" hint="শুধু মাসিক ফিক্সড বেতনের টিউশন দেখাবে">
            {SALARY_PRESETS.map((amt) => (
              <Chip key={amt} active={filters.salary_min === amt} onClick={() => setParam("salary_min", filters.salary_min === amt ? undefined : amt)}>
                {taka(amt)}+
              </Chip>
            ))}
          </Group>
          <Group title="দিন">
            {DAYS_PER_WEEK.map((d) => (
              <Chip key={d} active={filters.days === d} onClick={() => setParam("days", filters.days === d ? undefined : d)}>
                সপ্তাহে {bnDigits(d)} দিন
              </Chip>
            ))}
          </Group>
        </div>
        <div className="flex gap-2 border-t border-brand-100 px-5 py-4">
          <button type="button" onClick={clearAll} className="min-h-12 flex-1 rounded-xl border border-brand-100 bg-white text-sm font-semibold text-forest">ফিল্টার মুছুন</button>
          <button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-xl bg-forest text-sm font-semibold text-white">{bnDigits(resultCount)}টি টিউশন দেখুন</button>
        </div>
      </div>
    </dialog>
  );
}
