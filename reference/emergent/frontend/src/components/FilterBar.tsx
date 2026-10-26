import { SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "../i18n";
import { optLabel } from "../lib/options";
import { fmtTaka } from "../lib/format";
import type { TuitionFilters } from "../types";
import type { FilterKey } from "./FilterSheet";

export function FilterBar({ filters, setFilter, openSheet, sort, setSort }: {
  filters: TuitionFilters; setFilter: (k: FilterKey, v: undefined) => void; openSheet: () => void; sort: string; setSort: (s: string) => void;
}) {
  const { t, lang, n } = useI18n();

  const chips: { key: FilterKey; label: string; value?: string }[] = [
    { key: "area", label: t("filters.area"), value: filters.area && optLabel("areas", filters.area, lang) },
    { key: "class_level", label: t("filters.class"), value: filters.class_level && optLabel("class_levels", filters.class_level, lang) },
    { key: "subject", label: t("filters.subject"), value: filters.subject && optLabel("subjects", filters.subject, lang) },
    { key: "medium", label: t("filters.medium"), value: filters.medium && optLabel("mediums", filters.medium, lang) },
    { key: "tutor_gender", label: t("filters.gender"), value: filters.tutor_gender && optLabel("tutor_genders", filters.tutor_gender, lang) },
    { key: "mode", label: t("filters.mode"), value: filters.mode && optLabel("modes", filters.mode, lang) },
    { key: "salary_min", label: t("filters.salary"), value: filters.salary_min ? `৳ ${fmtTaka(filters.salary_min, lang)}+` : undefined },
    { key: "days", label: t("filters.days"), value: filters.days ? t("filters.days_label", { n: n(filters.days) }) : undefined },
  ];

  return (
    <div className="flex items-center gap-2" data-testid="filter-bar">
      <div className="flex-1 min-w-0 flex flex-wrap gap-2 py-1">
        <button type="button" onClick={openSheet} data-testid="filter-open-sheet"
          className="min-h-[44px] shrink-0 inline-flex items-center gap-2 px-4 rounded-full bg-forest text-cream text-sm font-semibold hover:bg-forest-mid transition-colors duration-150">
          <SlidersHorizontal size={16} aria-hidden /> {t("filters.more")}
        </button>
        {chips.filter((c, i) => c.value || i < 3).map((c) => (
          <span key={c.key} className={`min-h-[44px] shrink-0 inline-flex items-center rounded-full text-sm font-semibold border transition-colors duration-150 ${c.value ? "bg-brand-600 border-brand-600 text-white" : "bg-white border-brand-100 text-forest"}`}>
            <button type="button" onClick={openSheet} className={`min-h-[44px] pl-4 ${c.value ? "pr-1" : "pr-4"}`} data-testid={`filter-chip-${c.key}`}>
              {c.value ? `${c.label}: ${c.value}` : c.label}
            </button>
            {c.value && (
              <button type="button" aria-label={`${t("search.clear")} ${c.label}`} onClick={() => setFilter(c.key, undefined)} className="h-11 w-9 inline-flex items-center justify-center rounded-full hover:bg-brand-700" data-testid={`filter-chip-clear-${c.key}`}>
                <X size={16} aria-hidden />
              </button>
            )}
          </span>
        ))}
      </div>
      <label className="shrink-0 hidden sm:flex items-center gap-2 text-sm text-slate-600">
        <span>{t("sort.label")}</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)} data-testid="sort-select"
          className="min-h-[44px] rounded-full border border-brand-100 bg-white px-3 font-semibold text-forest">
          <option value="newest">{t("sort.newest")}</option>
          <option value="salary_desc">{t("sort.salary_desc")}</option>
        </select>
      </label>
    </div>
  );
}
