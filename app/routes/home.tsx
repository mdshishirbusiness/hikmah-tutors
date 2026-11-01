import { useCallback, useEffect, useState } from "react";
import { useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { FilterSheet } from "~/components/FilterSheet";
import { SiteFooter, SiteHeader, Toast, useShare } from "~/components/site";
import { TuitionCard } from "~/components/TuitionCard";
import { AREAS, CLASS_LEVELS, MEDIUMS, MODES, SUBJECTS, TUTOR_GENDERS, labelOf } from "~/lib/options";
import { applyFilters, bnDigits, readFilters, taka, type PublicTuition } from "~/lib/tuition";
import { openTuitions } from "~/lib/tuitions.server";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "রাজশাহীর টিউশন বোর্ড · Hikmah Tutors" },
    { name: "description", content: "রাজশাহীর হোম টিউশন: এলাকা, ক্লাস আর বেতন দেখে বেছে নিন।" },
  ];
}

// Public page: returns only public tuition fields, so no viewer check is needed.
export async function loader({ request }: Route.LoaderArgs) {
  const filters = readFilters(new URL(request.url).searchParams);
  return { items: applyFilters(await openTuitions(), filters), now: Math.floor(Date.now() / 1000) };
}

const FILTER_PARAMS = ["area", "class", "subject", "medium", "gender", "mode", "salary_min", "days"];

export default function Home({ loaderData: { items, now } }: Route.ComponentProps) {
  const [sp, setSp] = useSearchParams();
  const filters = readFilters(sp);
  const navigation = useNavigation();
  const updating = navigation.state === "loading" && navigation.location.pathname === "/";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.q ?? "");
  useEffect(() => setSearchText(filters.q ?? ""), [filters.q]);
  const { share, toast } = useShare();

  const setParam = useCallback(
    (name: string, value: string | number | undefined) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === undefined || value === "") next.delete(name);
          else next.set(name, String(value));
          return next;
        },
        { preventScrollReset: true },
      );
    },
    [setSp],
  );
  const clearAll = useCallback(() => setSp(new URLSearchParams(), { preventScrollReset: true }), [setSp]);
  const onShare = useCallback((t: PublicTuition) => share(`/tuitions/${t.code_label}`, `${t.code_label} · Hikmah Tutors`), [share]);

  const active: { param: string; label: string }[] = [
    filters.area && { param: "area", label: labelOf(AREAS, filters.area) },
    filters.class_level && { param: "class", label: labelOf(CLASS_LEVELS, filters.class_level) },
    filters.subject && { param: "subject", label: labelOf(SUBJECTS, filters.subject) },
    filters.medium && { param: "medium", label: labelOf(MEDIUMS, filters.medium) },
    filters.tutor_gender && { param: "gender", label: labelOf(TUTOR_GENDERS, filters.tutor_gender) },
    filters.mode && { param: "mode", label: labelOf(MODES, filters.mode) },
    filters.salary_min && { param: "salary_min", label: `${taka(filters.salary_min)}+` },
    filters.days && { param: "days", label: `সপ্তাহে ${bnDigits(filters.days)} দিন` },
  ].filter((c): c is { param: string; label: string } => !!c);
  const hasAny = FILTER_PARAMS.some((p) => sp.get(p)) || !!filters.q;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-forest text-cream">
          <div className="animate-rise mx-auto max-w-6xl px-4 py-10 sm:py-14">
            <p className="flex items-center gap-2 text-xs font-semibold text-brand-200">
              <span aria-hidden className="size-1.5 rounded-full bg-mango" />
              রাজশাহীর টিউটর ও পরিবারের সংযোগ
            </p>
            <h1 className="mt-4 text-4xl leading-tight font-semibold sm:text-6xl">
              আপনার পছন্দের টিউশন,
              <span className="mt-1 block text-mango">আপনারই রাজশাহীতে।</span>
            </h1>
            <p className="mt-4 max-w-lg text-brand-100">এলাকা, ক্লাস আর বেতন দেখে বেছে নিন।</p>
            <form
              role="search"
              className="mt-6 flex max-w-xl items-center gap-1 rounded-2xl bg-white p-1.5 shadow-lg"
              onSubmit={(e) => {
                e.preventDefault();
                setParam("q", searchText.trim() || undefined);
                document.getElementById("board")?.scrollIntoView();
              }}
            >
              <label htmlFor="board-search" className="sr-only">টিউশন খুঁজুন</label>
              <input
                id="board-search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="এলাকা, ক্লাস, বিষয় বা কোড…"
                className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-slate-800 outline-none placeholder:text-slate-500"
              />
              <button type="submit" className="min-h-12 shrink-0 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-forest">খুঁজুন</button>
            </form>
            <p className="mt-2 text-xs text-brand-200">যেমন: সাহেব বাজার, গণিত</p>
          </div>
        </section>

        <section id="board" aria-labelledby="board-heading" className="mx-auto max-w-6xl scroll-mt-4 px-4 pt-8">
          <h2 id="board-heading" className="text-2xl font-semibold text-forest">টিউশন বোর্ড</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setSheetOpen(true)} className="min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-cream transition-colors duration-150 hover:bg-forest-mid">ফিল্টার</button>
            {active.map((c) => (
              <button key={c.param} type="button" aria-label={`${c.label} ফিল্টার মুছুন`} onClick={() => setParam(c.param, undefined)} className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white">
                {c.label} <span aria-hidden>×</span>
              </button>
            ))}
          </div>
          <div className="my-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <span aria-live="polite">{updating ? "ফলাফল আপডেট হচ্ছে…" : `${bnDigits(items.length)}টি টিউশন`}</span>
            <div className="flex items-center gap-3">
              {hasAny && <button type="button" onClick={clearAll} className="min-h-11 font-semibold text-brand-700">মুছুন</button>}
              <select
                aria-label="সাজান"
                value={filters.sort}
                onChange={(e) => setParam("sort", e.target.value === "newest" ? undefined : e.target.value)}
                className="min-h-11 rounded-xl border border-brand-100 bg-white px-3 text-base text-forest"
              >
                <option value="newest">নতুন আগে</option>
                <option value="salary_desc">বেতন বেশি → কম</option>
              </select>
            </div>
          </div>
          <div aria-busy={updating} className={`transition-opacity duration-150 ${updating ? "opacity-60" : ""}`}>
            {items.length === 0 ? (
              <div className="rounded-2xl border border-brand-100 bg-white px-5 py-12 text-center">
                <p className="font-semibold text-forest">{hasAny ? "এই ফিল্টারে এখন কোনো টিউশন নেই।" : "এখন কোনো টিউশন নেই।"}</p>
                {hasAny && <button type="button" onClick={clearAll} className="mt-3 min-h-11 rounded-xl bg-forest px-5 text-sm font-semibold text-white">ফিল্টার মুছুন</button>}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((t, i) => <TuitionCard key={t.code} t={t} now={now} index={i} onShare={onShare} />)}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} filters={filters} setParam={setParam} clearAll={clearAll} resultCount={items.length} />
      <Toast message={toast} />
    </>
  );
}
