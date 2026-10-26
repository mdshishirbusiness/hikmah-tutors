import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useI18n } from "../i18n";
import { optList, options } from "../lib/options";
import { fmtTaka } from "../lib/format";
import { Chip } from "./Chip";
import { Button } from "./Button";
import { ClassPicker } from "./ClassPicker";
import type { TuitionFilters } from "../types";

export type FilterKey = keyof Omit<TuitionFilters, "q" | "sort">;

export function FilterSheet({ open, onClose, filters, setFilter, clearAll, resultCount }: {
  open: boolean; onClose: () => void; filters: TuitionFilters; setFilter: (k: FilterKey, v: string | number | undefined) => void; clearAll: () => void; resultCount: number;
}) {
  const { t, lang, n } = useI18n();
  const [areaQ, setAreaQ] = useState("");

  const areas = useMemo(() => {
    const all = optList("areas");
    if (!areaQ.trim()) return all.slice(0, 12);
    const q = areaQ.toLowerCase();
    return all.filter((a) => [a.label, a.label_en, ...(a.alt || [])].some((s) => s.toLowerCase().includes(q)));
  }, [areaQ]);

  if (!open) return null;

  const lbl = (o: { label: string; label_en: string }) => (lang === "bn" ? o.label : o.label_en);
  const toggle = (k: FilterKey, v: string | number) => setFilter(k, filters[k] === v ? undefined : v);

  const group = (title: string, body: React.ReactNode, testId: string, hint?: string) => (
    <div className="py-4 border-b border-brand-100 last:border-0" data-testid={testId}>
      <p className="font-bold text-forest">{title}</p>
      {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">{body}</div>
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-forest/50 backdrop-blur-sm animate-fade" data-testid="filter-sheet-backdrop" />
      <Dialog.Content aria-describedby={undefined} onCloseAutoFocus={(e) => { e.preventDefault(); document.querySelector<HTMLButtonElement>('[data-testid="filter-open-sheet"]')?.focus(); }} className="fixed z-50 inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[640px] max-h-[88dvh] sm:max-h-[85dvh] bg-cream rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl animate-sheet sm:animate-fade outline-none" data-testid="filter-sheet">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <Dialog.Title className="text-lg font-bold text-forest">{t("filters.all")}</Dialog.Title>
          <button type="button" onClick={onClose} aria-label={t("filters.close")} className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-brand-50" data-testid="filter-sheet-close">
            <X size={22} aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-4 flex-1">
          {group(t("filters.area"), (
            <>
              <input aria-label={t("filters.search_area")} value={areaQ} onChange={(e) => setAreaQ(e.target.value)} placeholder={t("filters.search_area")} data-testid="filter-area-search"
                className="w-full min-h-[44px] rounded-xl border border-brand-100 bg-white px-3 mb-1 focus:border-brand-500 outline-none" />
              {areas.map((a) => <Chip key={a.key} active={filters.area === a.key} onClick={() => toggle("area", a.key)} testId={`filter-area-${a.key}`}>{lbl(a)}</Chip>)}
            </>
          ), "filter-group-area")}
          {group(t("filters.class"), <div className="w-full"><ClassPicker testPrefix="filter-class" compact value={filters.class_level || ""} onChange={(v) => setFilter("class_level", v || undefined)} /></div>, "filter-group-class")}
          {group(t("filters.subject"), optList("subjects").map((o) => <Chip key={o.key} active={filters.subject === o.key} onClick={() => toggle("subject", o.key)} testId={`filter-subject-${o.key}`}>{lbl(o)}</Chip>), "filter-group-subject")}
          {group(t("filters.medium"), optList("mediums").map((o) => <Chip key={o.key} active={filters.medium === o.key} onClick={() => toggle("medium", o.key)} testId={`filter-medium-${o.key}`}>{lbl(o)}</Chip>), "filter-group-medium")}
          {group(t("filters.gender"), optList("tutor_genders").map((o) => <Chip key={o.key} active={filters.tutor_gender === o.key} onClick={() => toggle("tutor_gender", o.key)} testId={`filter-gender-${o.key}`}>{lbl(o)}</Chip>), "filter-group-gender")}
          {group(t("filters.mode"), optList("modes").map((o) => <Chip key={o.key} active={filters.mode === o.key} onClick={() => toggle("mode", o.key)} testId={`filter-mode-${o.key}`}>{lbl(o)}</Chip>), "filter-group-mode")}
          {group(t("filters.salary"), options.salary_filter_steps.map((amt, i, arr) => (
            <Chip key={amt} active={filters.salary_min === amt} onClick={() => toggle("salary_min", amt)} testId={`filter-salary-${amt}`}>
              {i === arr.length - 1 ? t("filters.salary_min_plus", { amt: `৳ ${fmtTaka(amt, lang)}` }) : t("filters.salary_min", { amt: `৳ ${fmtTaka(amt, lang)}` })}
            </Chip>
          )), "filter-group-salary", t("filters.salary_hint"))}
          {group(t("filters.days"), options.days_per_week.map((d) => <Chip key={d} active={filters.days === d} onClick={() => toggle("days", d)} testId={`filter-days-${d}`}>{t("filters.days_label", { n: n(d) })}</Chip>), "filter-group-days")}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-brand-100 bg-cream rounded-b-3xl">
          <Button variant="secondary" onClick={clearAll} className="flex-1" data-testid="filter-sheet-clear">{t("filters.clear")}</Button>
          <Button onClick={onClose} className="flex-1" data-testid="filter-sheet-done">{t("filters.result_count", { n: n(resultCount) })}</Button>
        </div>
      </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
