import { useCallback, useEffect, useState } from "react";
import { Link, redirect, useNavigation, useSearchParams } from "react-router";
import { ArrowRight, Sparkles, Timer, Users } from "lucide-react";
import type { Route } from "./+types/home";
import { FilterSheet } from "~/components/FilterSheet";
import { SiteFooter, SiteHeader } from "~/components/site";
import { TuitionCard } from "~/components/TuitionCard";
import { TutorBar } from "~/components/tutor";
import { getViewer } from "~/lib/auth.server";
import { JOIN } from "~/lib/join";
import { forYou, tutorBadges, tutorForUser } from "~/lib/me.server";
import { AREAS, CLASS_LEVELS, MEDIUMS, MODES, SUBJECTS, TUTOR_GENDERS, labelOf } from "~/lib/options";
import { applyFilters, readFilters, taka } from "~/lib/tuition";
import { openTuitions, recentlyBooked } from "~/lib/tuitions.server";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "রাজশাহীর টিউশন বোর্ড · Hikmah Tutors" },
    { name: "description", content: "রাজশাহীর হোম টিউশন: এলাকা, ক্লাস আর বেতন দেখে বেছে নিন।" },
  ];
}

// The chip row (owner, 2026-11-04): All · For You · Female tutor · Male tutor · RU · RUET · Medical.
const CHIPS = [
  { key: "", label: "All" },
  { key: "for-you", label: "For you" },
  { key: "female", label: "Female tutor" },
  { key: "male", label: "Male tutor" },
  { key: "ru", label: "RU" },
  { key: "ruet", label: "RUET" },
  { key: "medical", label: "Medical" },
];

// Public page: the tuitions are public fields only. For You and the bottom bar read the signed-in tutor's own record;
// those responses are private, and the plain board stays the same for everyone.
export async function loader({ request }: Route.LoaderArgs) {
  const sp = new URL(request.url).searchParams;
  const filters = readFilters(sp);
  const chip = CHIPS.some((c) => c.key === sp.get("chip")) ? sp.get("chip") ?? "" : "";
  const tab = sp.get("tab") === "booked" ? "booked" : "open";
  const viewer = await getViewer(request);
  const me = viewer?.role === "tutor" ? await tutorForUser(viewer.id) : null;
  if (chip === "for-you" && !viewer) throw redirect(`/login?next=${encodeURIComponent("/?chip=for-you")}`);
  if (chip === "for-you" && me && !me.setup_done_at) throw redirect(`/me/setup?next=${encodeURIComponent("/?chip=for-you")}`);

  // Only open tuitions show (owner, 2026-11-04): a Processing one leaves the board while a tutor is tried, and comes
  // back if the match falls through. Its own page keeps working for shared links.
  const all = (await openTuitions()).filter((t) => t.status === "available");
  let items = applyFilters(all, filters);
  if (chip === "for-you") {
    const fits = new Set((me ? await forYou(me) : []).map((t) => t.code));
    items = items.filter((t) => fits.has(t.code));
  } else if (chip === "female" || chip === "male") items = items.filter((t) => t.tutor_gender_pref === chip);
  else if (chip) items = items.filter((t) => t.tutor_from.includes(chip));

  const [booked, badges] = await Promise.all([recentlyBooked(), me?.setup_done_at && viewer ? tutorBadges(viewer, me) : null]);
  return { items, chip, tab, booked: tab === "booked" ? booked : [], bookedCount: booked.length, openCount: all.length, badges, signedIn: !!viewer, now: Math.floor(Date.now() / 1000) };
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

const FILTER_PARAMS = ["area", "class", "subject", "medium", "gender", "mode", "salary_min", "days"];
const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical" };
const fast = (h: number | null) => (h === null ? "" : h < 1 ? "Booked within an hour" : h < 48 ? `Booked in ${h} h` : `Booked in ${Math.round(h / 24)} days`);

export default function Home({ loaderData: { items, chip, tab, booked, bookedCount, openCount, badges, signedIn, now } }: Route.ComponentProps) {
  const [sp, setSp] = useSearchParams();
  const filters = readFilters(sp);
  const navigation = useNavigation();
  const updating = navigation.state === "loading" && navigation.location.pathname === "/";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.q ?? "");
  useEffect(() => setSearchText(filters.q ?? ""), [filters.q]);

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

  const active: { param: string; label: string }[] = [
    filters.area && { param: "area", label: labelOf(AREAS, filters.area) },
    filters.class_level && { param: "class", label: labelOf(CLASS_LEVELS, filters.class_level) },
    filters.subject && { param: "subject", label: labelOf(SUBJECTS, filters.subject) },
    filters.medium && { param: "medium", label: labelOf(MEDIUMS, filters.medium) },
    filters.tutor_gender && { param: "gender", label: labelOf(TUTOR_GENDERS, filters.tutor_gender) },
    filters.mode && { param: "mode", label: labelOf(MODES, filters.mode) },
    filters.salary_min && { param: "salary_min", label: `${taka(filters.salary_min)}+` },
    filters.days && { param: "days", label: `${filters.days} days/week` },
  ].filter((c): c is { param: string; label: string } => !!c);
  const hasAny = FILTER_PARAMS.some((p) => sp.get(p)) || !!filters.q || !!chip;
  const chipHref = (key: string) => {
    const next = new URLSearchParams(sp);
    if (key) next.set("chip", key); else next.delete("chip");
    next.delete("tab");
    return `?${next}`;
  };

  return (
    <>
      <SiteHeader />
      <main className={badges ? "pb-20 lg:pb-0" : ""}>
        <section className="relative overflow-hidden bg-forest text-cream">
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand-600/30 blur-3xl" />
          <div className={`relative mx-auto max-w-6xl animate-rise px-4 ${badges ? "py-6 sm:py-8" : "py-10 sm:py-14"}`}>
            <p className="flex items-center gap-2 text-xs font-semibold text-brand-200">
              <span aria-hidden className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-mango opacity-60 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-mango" /></span>
              {openCount} open now · {bookedCount} booked this week
            </p>
            {/* A signed-in tutor comes back for the tuitions, so the big welcome gives way to the search. */}
            {badges ? <h1 className="sr-only">Tuition board</h1> : (
              <>
                <h1 className="mt-4 text-4xl leading-tight font-semibold sm:text-6xl">
                  আপনার পছন্দের টিউশন,
                  <span className="mt-1 block text-mango">আপনারই রাজশাহীতে।</span>
                </h1>
                <p className="mt-4 max-w-lg text-brand-100">এলাকা, ক্লাস আর বেতন দেখে বেছে নিন।</p>
              </>
            )}
            <form
              role="search"
              className={`${badges ? "mt-3" : "mt-6"} flex max-w-xl items-center gap-1 rounded-2xl bg-white p-1.5 shadow-lg`}
              onSubmit={(e) => {
                e.preventDefault();
                setParam("q", searchText.trim() || undefined);
                document.getElementById("board")?.scrollIntoView();
              }}
            >
              <label htmlFor="board-search" className="sr-only">Search tuitions</label>
              <input
                id="board-search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Area, class, subject or code…"
                className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-slate-800 outline-none placeholder:text-slate-500"
              />
              <button type="submit" className="min-h-12 shrink-0 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-forest">Search</button>
            </form>
            {!badges && <p className="mt-2 text-xs text-brand-200">e.g. Saheb Bazar, Math</p>}
            {!signedIn && (
              <Link to={JOIN} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-mango px-4 text-sm font-extrabold text-forest transition-transform duration-150 hover:translate-x-0.5">
                New tutor? Join in 3 minutes<ArrowRight size={16} aria-hidden />
              </Link>
            )}
          </div>
        </section>

        <section id="board" aria-labelledby="board-heading" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="board-heading" className="text-2xl font-extrabold tracking-tight text-forest">{tab === "booked" ? "Recently booked" : "Tuition board"}</h2>
            <div className="flex rounded-xl bg-white p-1 shadow-ring" role="group" aria-label="Board">
              <Link to="/" preventScrollReset className={`inline-flex min-h-10 items-center rounded-[10px] px-3 text-sm font-bold ${tab === "open" ? "bg-forest text-cream" : "text-slate-600"}`}>Open now</Link>
              <Link to="/?tab=booked" preventScrollReset className={`inline-flex min-h-10 items-center gap-1.5 rounded-[10px] px-3 text-sm font-bold ${tab === "booked" ? "bg-forest text-cream" : "text-slate-600"}`}>Recently booked{bookedCount > 0 && <span className={`tabular-nums ${tab === "booked" ? "text-mango" : "text-slate-400"}`}>{bookedCount}</span>}</Link>
            </div>
          </div>

          {tab === "booked" ? (
            <>
              <p className="mt-2 text-sm text-slate-600">গত ৭ দিনে যেসব টিউশন বুক হয়েছে। Tutors are shown by university and department only.</p>
              {booked.length === 0 ? <p className="mt-4 rounded-2xl bg-white px-5 py-12 text-center font-semibold text-forest shadow-ring">Nothing booked in the last 7 days yet.</p> : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {booked.map((b, i) => (
                    <li key={b.code} className="animate-rise rounded-2xl bg-white p-4 shadow-ring" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-400">HTR-{b.code}</span>
                        <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">Booked</span>
                      </div>
                      <p className="mt-1 text-xl font-extrabold tracking-tight text-forest">{b.salary_amount ? taka(b.salary_amount) : "Salary negotiable"}<span className="text-sm font-normal text-slate-500"> /month</span></p>
                      <p className="font-bold text-slate-800">{labelOf(CLASS_LEVELS, b.class_level)} · {b.mode === "online" ? "Online" : labelOf(AREAS, b.area)}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{b.subjects.split(",").filter(Boolean).map((s) => labelOf(SUBJECTS, s)).join(", ")}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
                        {b.hours !== null && <span className="inline-flex items-center gap-1 rounded-full bg-mango px-2.5 py-1 text-forest"><Timer size={13} aria-hidden />{fast(b.hours)}</span>}
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"><Users size={13} aria-hidden />{b.applicants} applied</span>
                        {b.university && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">{[UNI[b.university] ?? "Tutor", b.department].filter(Boolean).join(" · ")}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <nav aria-label="Quick filters" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                {CHIPS.map((c) => (
                  <Link key={c.key || "all"} to={chipHref(c.key)} preventScrollReset aria-current={chip === c.key ? "page" : undefined}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors ${chip === c.key ? "bg-forest text-cream" : "bg-white text-forest shadow-ring hover:shadow-lift"}`}>
                    {c.key === "for-you" && <Sparkles size={15} className={chip === c.key ? "text-mango" : "text-brand-600"} aria-hidden />}{c.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setSheetOpen(true)} className="min-h-11 rounded-full bg-white px-4 text-sm font-semibold text-forest shadow-ring transition-colors duration-150 hover:bg-brand-50">More filters</button>
                {active.map((c) => (
                  <button key={c.param} type="button" aria-label={`Remove ${c.label} filter`} onClick={() => setParam(c.param, undefined)} className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white">
                    {c.label} <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
              <div className="my-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <span aria-live="polite">{updating ? "Updating…" : `${items.length} tuitions`}</span>
                <div className="flex items-center gap-3">
                  {hasAny && <button type="button" onClick={clearAll} className="min-h-11 font-semibold text-brand-700">Clear</button>}
                  <select
                    aria-label="Sort"
                    value={filters.sort}
                    onChange={(e) => setParam("sort", e.target.value === "newest" ? undefined : e.target.value)}
                    className="min-h-11 rounded-xl border border-brand-100 bg-white px-3 text-base text-forest"
                  >
                    <option value="newest">Newest first</option>
                    <option value="salary_desc">Highest salary</option>
                  </select>
                </div>
              </div>
              <div aria-busy={updating} className={`transition-opacity duration-150 ${updating ? "opacity-60" : ""}`}>
                {items.length === 0 ? (
                  <div className="rounded-2xl bg-white px-5 py-12 text-center shadow-ring">
                    <p className="font-semibold text-forest">{chip === "for-you" ? "No open tuitions match your choices right now." : hasAny ? "No tuitions match these filters." : "No tuitions right now."}</p>
                    {chip === "for-you" && <Link to="/me/profile" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-forest px-5 text-sm font-semibold text-white">Widen your choices</Link>}
                    {hasAny && chip !== "for-you" && <button type="button" onClick={clearAll} className="mt-3 min-h-11 rounded-xl bg-forest px-5 text-sm font-semibold text-white">Clear filters</button>}
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((t, i) => <TuitionCard key={t.code} t={t} now={now} index={i} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} filters={filters} setParam={setParam} clearAll={clearAll} resultCount={items.length} />
      {badges && <TutorBar active="tuitions" count={badges.applied} dot={badges.home} />}
    </>
  );
}
