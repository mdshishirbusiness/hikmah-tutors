import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GraduationCap, LayoutDashboard, Search, X } from "lucide-react";
import { listTuitions, shareUrl } from "../api/client";
import type { Tuition, TuitionFilters } from "../types";
import { useI18n } from "../i18n";
import { gstyle } from "../lib/gender";
import { TuitionCard } from "../components/TuitionCard";
import { FilterBar } from "../components/FilterBar";
import { FilterSheet, type FilterKey } from "../components/FilterSheet";
import { GuardianPanel } from "../components/GuardianPanel";
import { EmptyState, ErrorState, SkeletonList } from "../components/States";
import { Toast, shareLink, shareToastMessage, useToast } from "../components/Toast";

const PARAM: Record<FilterKey, string> = { area: "area", class_level: "class", subject: "subject", medium: "medium", tutor_gender: "gender", mode: "mode", salary_min: "salary_min", days: "days" };

function readFilters(sp: URLSearchParams): TuitionFilters {
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  return {
    area: sp.get("area") || undefined, class_level: sp.get("class") || undefined, subject: sp.get("subject") || undefined,
    medium: sp.get("medium") || undefined, tutor_gender: sp.get("gender") || undefined, mode: sp.get("mode") || undefined,
    salary_min: num("salary_min"), days: num("days"), q: sp.get("q") || undefined,
    sort: sp.get("sort") === "salary_desc" ? "salary_desc" : "newest",
  };
}

export default function Board() {
  const { t, n } = useI18n();
  const [sp, setSp] = useSearchParams();
  const filters = useMemo(() => readFilters(sp), [sp]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.q || "");
  useEffect(() => setSearchText(filters.q || ""), [filters.q]);
  const [toast, showToast] = useToast();

  const query = useQuery({ queryKey: ["tuitions", filters], queryFn: () => listTuitions(filters), placeholderData: (prev) => prev });

  const setParam = useCallback((key: string, v: string | number | undefined) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      if (v === undefined || v === "" || v === null) next.delete(key);
      else next.set(key, String(v));
      return next;
    }, { replace: false });
  }, [setSp]);

  const setFilter = useCallback((k: FilterKey, v: string | number | undefined) => setParam(PARAM[k], v), [setParam]);
  const clearAll = useCallback(() => {
    setSp(new URLSearchParams());
    setSearchText("");
  }, [setSp]);

  const activeCount = Object.values(PARAM).filter((p) => sp.get(p)).length + (filters.q ? 1 : 0);

  const onShare = useCallback(async (tu: Tuition) => {
    const url = shareUrl(tu.code_label);
    const msg = shareToastMessage(await shareLink(url, `${tu.code_label} · Hikmah Tutors Rajshahi`), url, t);
    if (msg) showToast(msg);
  }, [showToast, t]);

  const items = query.data?.items ?? [];

  return (
    <div data-testid="board-page">
      <section className="relative overflow-hidden bg-forest text-cream">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#FED262_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 grid items-center gap-8 lg:grid-cols-[1.55fr_1fr] lg:gap-16">
          <div className="on-forest animate-rise">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-brand-200" data-testid="hero-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-mango" />{t("hero.eyebrow")}</p>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.25] tracking-tight" data-testid="hero-title">{t("hero.line_one")}<span className="mt-2 block text-mango">{t("hero.line_two")}</span></h1>
            <p className="mt-5 max-w-lg text-sm sm:text-base leading-relaxed text-brand-100/90" data-testid="hero-description">{t("hero.sub")}</p>
            <form className="mt-7 relative max-w-xl rounded-2xl bg-white p-1.5 flex items-center gap-1 shadow-lg focus-within:ring-4 focus-within:ring-brand-200/30" onSubmit={(e) => { e.preventDefault(); setParam("q", searchText.trim() || undefined); document.getElementById("tuition-board")?.scrollIntoView({ behavior: "smooth" }); }} role="search" data-testid="board-search-form">
              <Search className="ml-2 sm:ml-3 shrink-0 text-brand-600" size={20} aria-hidden />
              <label htmlFor="board-search" className="sr-only">{t("search.label")}</label>
              <input id="board-search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder={t("search.placeholder")} data-testid="board-search-input" className="min-w-0 flex-1 min-h-12 bg-transparent px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
              {searchText && <button type="button" aria-label={t("search.clear")} onClick={() => { setSearchText(""); setParam("q", undefined); }} data-testid="board-search-clear" className="shrink-0 h-11 w-9 inline-flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={17} aria-hidden /></button>}
              <button type="submit" data-testid="board-search-submit" className="shrink-0 min-h-12 px-4 rounded-xl bg-brand-700 text-white font-semibold text-sm hover:bg-forest transition-colors">{t("search.submit")}</button>
            </form>
            <p className="mt-2.5 text-xs text-brand-200/80" data-testid="hero-search-hint">{t("hero.search_hint")}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1" data-testid="hero-panels">
              <Link to="/tutor" data-testid="hero-tutor-panel" className="group min-h-11 inline-flex items-center gap-2 font-semibold text-sm text-cream hover:text-mango transition-colors"><GraduationCap size={19} aria-hidden />{t("hero.tutor_cta")}<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden /></Link>
              <Link to="/how-it-works" className="min-h-11 inline-flex items-center text-sm text-brand-200 underline underline-offset-4 hover:text-cream" data-testid="hero-link-how">{t("hero.how")}</Link>
              <Link to="/fees" className="min-h-11 inline-flex items-center text-sm text-brand-200 hover:text-cream" data-testid="hero-link-fees">{t("hero.fees")}</Link>
            </div>
          </div>
          <div className="animate-rise lg:pl-2" style={{ animationDelay: "90ms" }}>
            <GuardianPanel />
            <div className="mt-4 flex items-center justify-between gap-4 px-1">
              <p className="text-[11px] leading-relaxed text-brand-200/80" data-testid="hero-open-note">{t("hero.open_note")}</p>
              <Link to="/admin" data-testid="hero-admin-panel" className="min-h-11 shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-100 hover:text-mango"><LayoutDashboard size={15} aria-hidden />{t("nav.admin")}</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="tuition-board" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 scroll-mt-24" aria-labelledby="board-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div><p className="text-[11px] tracking-wider font-semibold text-brand-700">{t("board.eyebrow")}</p><h2 id="board-heading" className="mt-2 text-base md:text-lg font-bold text-forest" data-testid="board-heading">{t("board.title")}</h2><p className="mt-1 text-sm text-slate-500">{t("board.subtitle")}</p></div>
          <div className="flex flex-wrap gap-2" aria-label={t("filters.gender")} data-testid="gender-legend">
            <button type="button" aria-pressed={!filters.tutor_gender} onClick={() => setFilter("tutor_gender", undefined)} className={`min-h-11 rounded-full px-4 text-sm font-semibold border transition-colors ${!filters.tutor_gender ? "bg-forest text-cream border-forest" : "bg-white border-brand-100 text-slate-600 hover:bg-brand-50"}`} data-testid="board-gender-all">{t("board.all")}</button>
            {(["male", "female", "any"] as const).map((g) => <button key={g} type="button" aria-pressed={filters.tutor_gender === g} onClick={() => setFilter("tutor_gender", filters.tutor_gender === g ? undefined : g)} data-testid={`board-gender-${g}`} className={`min-h-11 inline-flex items-center gap-2 rounded-full px-3 text-sm font-semibold border transition-colors ${filters.tutor_gender === g ? gstyle(g).chipOn : "bg-white border-brand-100 text-slate-600 hover:bg-slate-50"}`}><span aria-hidden className={`h-2 w-2 rounded-full ${filters.tutor_gender === g ? "bg-white" : gstyle(g).bar}`} />{t(`card.tutor_${g}`)}</button>)}
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-brand-100/80 px-3 sm:px-4 py-3 shadow-card">
          <FilterBar filters={filters} setFilter={(k) => setFilter(k, undefined)} openSheet={() => setSheetOpen(true)} sort={filters.sort || "newest"} setSort={(s) => setParam("sort", s === "newest" ? undefined : s)} />
        </div>
        <div className="my-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <span aria-live="polite" data-testid="board-result-count">{query.isFetching ? t("board.updating") : query.data ? t("filters.result_count", { n: n(query.data.total) }) : t("common.loading")}</span>
          <div className="flex items-center gap-3">
            <select aria-label={t("sort.label")} value={filters.sort} onChange={(e) => setParam("sort", e.target.value === "newest" ? undefined : e.target.value)} data-testid="sort-select-mobile" className="sm:hidden min-h-11 rounded-xl border border-brand-100 bg-white px-3 text-sm text-forest"><option value="newest">{t("sort.newest")}</option><option value="salary_desc">{t("sort.salary_desc")}</option></select>
            {activeCount > 0 && <button type="button" onClick={clearAll} className="min-h-11 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline" data-testid="board-clear-filters"><X size={14} aria-hidden />{t("filters.clear")}</button>}
          </div>
        </div>
        <div aria-busy={query.isFetching}>
          {query.isPending ? <SkeletonList /> : query.isError ? <ErrorState title={t("error.title")} sub={t("error.sub")} retry={() => query.refetch()} retryLabel={t("error.retry")} /> : items.length === 0 ? <EmptyState title={t("empty.title")} sub={t("empty.sub")} action={clearAll} actionLabel={t("filters.clear")} testId="board-empty" /> : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="board-grid">{items.map((tu, i) => <TuitionCard key={tu.code} t={tu} index={i} onShare={onShare} />)}</div>
          )}
        </div>
        <section className="mt-14 border-t border-brand-100 pt-8" data-testid="board-process">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base md:text-lg font-bold text-forest">{t("board.how_title")}</h2><Link to="/how-it-works" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700" data-testid="board-process-link">{t("hero.how")}<ArrowRight size={16} aria-hidden /></Link></div>
          <ol className="mt-4 grid sm:grid-cols-3 gap-6">{[1, 2, 3].map((i) => <li key={i} className="flex gap-4" data-testid={`board-step-${i}`}><span className="text-3xl font-bold text-brand-200">{n(`0${i}`)}</span><div><h3 className="text-sm font-bold text-forest">{t(`board.step${i}`)}</h3><p className="mt-1 text-sm text-slate-500">{t(`board.step${i}_sub`)}</p></div></li>)}</ol>
        </section>
      </section>
      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} filters={filters} setFilter={setFilter} clearAll={clearAll} resultCount={query.data?.total ?? 0} />
      <Toast message={toast} />
    </div>
  );
}
