// The tutor's Home (owner, 2026-11-04), top to bottom: what needs action now, the owner's notice, updates from HTR
// (a dot while unread), For You (tuitions that fit, newest first) and how complete the profile is. Empty parts hide.
// Private: only this tutor sees it.
import { Link, redirect } from "react-router";
import {
  ArrowRight, BadgeCheck, Bell, CircleSlash, ClipboardCheck, Crown, Hourglass, Megaphone, PartyPopper, PauseCircle, PhoneCall, Sparkles, Star, UserPen, XCircle,
} from "lucide-react";
import type { Route } from "./+types/me";
import { Avatar } from "~/components/Avatar";
import { ago, num } from "~/components/admin";
import { SitePage } from "~/components/site";
import { GenderChip, SalaryText, placeLabel } from "~/components/TuitionCard";
import { TutorBar } from "~/components/tutor";
import { requireUser } from "~/lib/auth.server";
import { homeView, liveNotice, markUpdatesSeen, myApplications, tutorBadges, tutorForUser } from "~/lib/me.server";
import { AREAS, CLASS_LEVELS, SUBJECTS, labelOf } from "~/lib/options";
import { timeAgo } from "~/lib/tuition";
import { profilePercent } from "~/lib/profile";
import { premiumStatus } from "~/lib/premium.server";
import { taka } from "~/lib/tuition";
import { firstName } from "~/lib/whatsapp";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Home · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const viewer = await requireUser(request);
  if (viewer.role === "owner") throw redirect("/admin");
  const me = await tutorForUser(viewer.id);
  if (!me) throw redirect("/me/join"); // a Google account with no tutor record registers first
  if (!me.setup_done_at) throw redirect("/me/setup?next=/me");
  const [view, notice, apps, badges, premium] = await Promise.all([homeView(viewer, me), liveNotice(), myApplications(me.id), tutorBadges(viewer, me), premiumStatus(me.id)]);
  // Drawn once with the dots, then marked seen, so the next visit starts clean.
  await markUpdatesSeen(me);
  return { me, view, notice, apps, badges, premium, now: Math.floor(Date.now() / 1000) };
}

const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical" };
const NEXT_STEP = {
  call: { title: "Call the guardian now", sub: "Selected tutors call within 2–3 hours. The number is in Applied.", icon: PhoneCall },
  meet: { title: "Tick Met after you meet", sub: "Then do the demo class.", icon: ClipboardCheck },
  demo: { title: "Tick Demo done", sub: "After the demo class, then confirm.", icon: ClipboardCheck },
  confirm: { title: "Confirm the tuition", sub: "If the guardian continues after the demo.", icon: BadgeCheck },
};
const UPDATE = {
  shortlisted: { text: "You're shortlisted", icon: Star, tone: "bg-sky-100 text-sky-900" },
  selected: { text: "You're selected!", icon: PartyPopper, tone: "bg-mango text-forest" },
  not_selected: { text: "Not selected this time", icon: XCircle, tone: "bg-slate-100 text-slate-600" },
  closed: { text: "Tuition closed", icon: CircleSlash, tone: "bg-slate-100 text-slate-600" },
  profile: { text: "HTR updated your profile", icon: UserPen, tone: "bg-brand-50 text-brand-700" },
};

function greeting(now: number) {
  const h = Number(new Date(now * 1000).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", hour: "numeric", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** The profile ring: an SVG circle, so it costs nothing and animates with one CSS transition. */
function Ring({ percent }: { percent: number }) {
  const r = 26, c = 2 * Math.PI * r, pct = percent / 100;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" role="img" aria-label={`Profile ${percent}% complete`} className="shrink-0 -rotate-90">
      <circle cx="34" cy="34" r={r} fill="none" stroke="var(--color-brand-100)" strokeWidth="7" />
      <circle cx="34" cy="34" r={r} fill="none" stroke="var(--color-brand-600)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700" />
      <text x="34" y="34" transform="rotate(90 34 34)" textAnchor="middle" dominantBaseline="central" className="fill-forest text-sm font-extrabold">{percent}%</text>
    </svg>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { me, view, notice, apps, badges, premium, now } = loaderData;
  const open = apps.filter((a) => ["submitted", "under_review", "shortlisted", "trial_arranged"].includes(a.status));
  const stats = [
    ["Open", open.length], ["Shortlisted", apps.filter((a) => a.status === "shortlisted").length],
    ["Selected", apps.filter((a) => a.status === "trial_arranged").length], ["Confirmed", apps.filter((a) => a.status === "confirmed").length],
  ] as const;
  const missing = view.progress.filter((p) => !p.done);
  const unread = view.updates.filter((u) => u.unread).length;

  return (
    <SitePage app>
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:px-6 lg:pb-12">
        <header className="flex animate-rise items-center gap-4">
          <Avatar code={me.code} name={me.full_name} hasPhoto={!!me.photo_key} size="lg" className="shadow-card" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500">{greeting(now)},</p>
            <h1 className="truncate text-[28px] leading-tight font-extrabold tracking-tight text-forest">{firstName(me.full_name)}</h1>
            <p className="truncate text-xs text-slate-500">T-{me.code} · {[me.university && UNI[me.university], me.department].filter(Boolean).join(" · ")}</p>
          </div>
          <Link to="/me/profile#availability" className={`hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold sm:inline-flex ${view.paused ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
            {view.paused ? <PauseCircle size={14} aria-hidden /> : <span aria-hidden className="size-2 rounded-full bg-emerald-600" />}
            {view.paused ? "Paused" : "Taking tuitions"}
          </Link>
        </header>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            {me.review_status !== "approved" && (
              // A new registration waits for the owner's check before the tutor can apply (owner, 2026-11-04).
              <div className={`animate-rise rounded-3xl p-5 ${me.review_status === "needs_fix" ? "bg-mango text-forest" : "bg-forest text-cream"}`}>
                <p className="flex items-center gap-2 text-xl font-extrabold">
                  {me.review_status === "needs_fix" ? <UserPen size={22} aria-hidden /> : <Hourglass size={22} className="text-mango" aria-hidden />}
                  {me.review_status === "needs_fix" ? "HTR asked you to fix something" : "HTR is checking your profile"}
                </p>
                <p className={`mt-1 text-sm ${me.review_status === "needs_fix" ? "" : "text-brand-100"}`}>
                  {me.review_status === "needs_fix" ? me.review_note || "Open your registration to see what to change." : "Usually within a day. Look around the board meanwhile; you can apply once it's checked."}
                </p>
                <Link to="/me/join" className={`mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-extrabold ${me.review_status === "needs_fix" ? "bg-forest text-cream" : "bg-white/10 text-cream"}`}>
                  {me.review_status === "needs_fix" ? "Fix my registration" : "See or change my registration"}<ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            )}

            {view.paused && (
              <Link to="/me/profile#availability" className="flex items-center gap-3 rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900">
                <PauseCircle size={20} className="shrink-0" aria-hidden /><span><b>You're paused.</b> HTR won't suggest tuitions to you. Turn it off in Profile.</span>
              </Link>
            )}

            {view.needs.map((n) => {
              const step = NEXT_STEP[n.next];
              return (
                <Link key={n.application_id} to="/applied" className="group block animate-rise overflow-hidden rounded-3xl bg-forest p-5 text-cream shadow-lift">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-mango px-3 py-0.5 text-xs font-extrabold text-forest"><Sparkles size={13} aria-hidden />Needs action</span>
                  <p className="mt-3 text-sm text-brand-200">HTR-{n.tuition_code} · {labelOf(CLASS_LEVELS, n.class_level)} · {labelOf(AREAS, n.area)}</p>
                  <p className="mt-1 flex items-center gap-2 text-2xl font-extrabold"><step.icon size={24} className="text-mango" aria-hidden />{step.title}</p>
                  <p className="mt-1 text-sm text-brand-100">{step.sub}</p>
                  <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-mango px-4 text-sm font-extrabold text-forest transition-transform group-hover:translate-x-0.5">Open in Applied<ArrowRight size={16} aria-hidden /></span>
                </Link>
              );
            })}

            {notice && (
              <div className="flex gap-3 rounded-2xl bg-mango px-4 py-3.5 text-forest">
                <Megaphone size={20} className="mt-0.5 shrink-0" aria-hidden />
                <p className="text-sm leading-relaxed"><b>From HTR:</b> {notice.body}</p>
              </div>
            )}

            {/* Hidden until the first application, so a new tutor never sees a row of zeros (owner, 2026-11-05). */}
            {apps.length > 0 && <Link to="/applied" className="grid grid-cols-4 gap-2 rounded-2xl bg-white p-3 shadow-ring">
              {stats.map(([k, v]) => (
                <span key={k} className="rounded-xl py-1.5 text-center">
                  <span className="block text-2xl font-extrabold text-forest tabular-nums">{num(v)}</span>
                  <span className="block text-[11px] font-semibold text-slate-500">{k}</span>
                </span>
              ))}
            </Link>}

            {view.forYou.length > 0 && (
              <section aria-labelledby="for-you">
                <div className="mb-2 flex items-end justify-between">
                  <h2 id="for-you" className="text-lg font-extrabold text-forest">For you <span className="text-sm font-semibold text-slate-400">{view.forYouTotal}</span></h2>
                  <Link to="/?chip=for-you" className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-brand-700">See all<ArrowRight size={15} aria-hidden /></Link>
                </div>
                <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-1 xl:grid-cols-2">
                  {view.forYou.map((t, i) => (
                    <li key={t.code} className="w-[78%] shrink-0 snap-start sm:w-auto" style={{ animationDelay: `${i * 60}ms` }}>
                      <article className="flex h-full animate-rise flex-col rounded-2xl bg-white p-4 shadow-ring">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-400">{t.code_label}</span>
                          <span className="text-xs text-slate-400">{timeAgo(t.posted_at, now)}</span>
                        </div>
                        <p className="mt-1 text-2xl font-extrabold tracking-tight text-forest"><SalaryText t={t} unitClass="text-sm text-slate-500" /></p>
                        <p className="font-bold text-slate-800">{labelOf(CLASS_LEVELS, t.class_level)} · {placeLabel(t)}</p>
                        <p className="mt-0.5 truncate text-sm text-slate-500">{t.subjects.map((s) => labelOf(SUBJECTS, s)).join(", ")} · {t.days_per_week} days</p>
                        <div className="mt-2"><GenderChip t={t} /></div>
                        <div className="mt-auto flex gap-2 pt-3">
                          <Link to={`/tuitions/${t.code_label}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-white text-sm font-bold text-forest shadow-ring">Details</Link>
                          <Link to={`/tuitions/${t.code_label}/apply`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-forest text-sm font-bold text-cream hover:bg-brand-700">Apply</Link>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {view.forYou.length === 0 && !view.paused && (
              <p className="rounded-2xl border border-dashed border-brand-200 bg-white/60 p-5 text-center text-sm text-slate-600">
                No new tuitions match your choices right now. <Link to="/" className="font-bold text-brand-700">See all tuitions</Link>
              </p>
            )}
          </div>

          <div className="min-w-0 space-y-5">
            {missing.length > 0 && (
              <section className="rounded-2xl bg-white p-4 shadow-ring">
                <div className="flex items-center gap-4">
                  <Ring percent={profilePercent(view.progress)} />
                  <div className="min-w-0">
                    <h2 className="font-extrabold text-forest">Finish your profile</h2>
                    <p className="text-sm text-slate-500">Complete profiles are shown to HTR first.</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {missing.map((p) => (
                    <Link key={p.key} to={`/me/profile#${p.section}`} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-brand-50 px-3 text-sm font-semibold text-forest hover:bg-brand-100">+ {p.label}</Link>
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="updates" className="rounded-2xl bg-white p-4 shadow-ring">
              <h2 id="updates" className="flex items-center gap-2 font-extrabold text-forest"><Bell size={18} aria-hidden />Updates{unread > 0 && <span className="rounded-full bg-rose-600 px-2 text-xs leading-5 text-white">{unread} new</span>}</h2>
              {view.updates.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nothing new in the last 30 days.</p> : (
                <ul className="mt-2 divide-y divide-brand-50">
                  {view.updates.slice(0, 8).map((u, i) => {
                    const k = UPDATE[u.kind];
                    return (
                      <li key={i}>
                        <Link to={u.tuition_code ? "/applied" : "/me/profile"} className="flex items-center gap-3 py-2.5">
                          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${k.tone}`}><k.icon size={17} aria-hidden /></span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm ${u.unread ? "font-extrabold text-forest" : "font-semibold text-slate-700"}`}>{k.text}{u.tuition_code ? ` · HTR-${u.tuition_code}` : ""}</span>
                            <span className="block text-xs text-slate-400">{ago(u.at)}</span>
                          </span>
                          {u.unread && <span aria-label="Unread" className="size-2.5 shrink-0 rounded-full bg-rose-600" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Premium (part E): an entry for everyone, the term's state once there is one. */}
            <Link to="/me/premium" className="group relative block overflow-hidden rounded-2xl bg-forest p-4 text-cream shadow-ring transition-shadow hover:shadow-lift">
              <span aria-hidden className="absolute -top-10 -right-8 size-28 rounded-full bg-forest-mid" />
              <span className="relative flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mango text-forest"><Crown size={20} aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{premium?.status === "active" ? "Premium" : premium?.status === "accepted" ? `Premium accepted · pay ${taka(premium.price)}` : premium ? "Premium · HTR is checking" : "Become Premium"}</span>
                  <span className="block text-xs text-brand-100">{premium?.status === "active" && premium.ends_at ? `${Math.max(0, Math.ceil((premium.ends_at - now) / 86400))} days left` : premium ? "See where it stands" : "সমান যোগ্যদের মধ্যে আগে বিবেচনা, 90 দিনে টিউশনের চেষ্টা"}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-mango transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>

            <section className="grid grid-cols-2 gap-3">
              <Link to="/me/refer" className="rounded-2xl bg-white p-4 shadow-ring transition-shadow hover:shadow-lift">
                <Megaphone size={20} className="text-brand-600" aria-hidden />
                <p className="mt-2 font-bold text-forest">Refer a tuition</p>
                <p className="text-xs text-slate-500">Know a guardian? Send them to HTR.</p>
              </Link>
              <Link to="/fees" className="rounded-2xl bg-white p-4 shadow-ring transition-shadow hover:shadow-lift">
                <BadgeCheck size={20} className="text-brand-600" aria-hidden />
                <p className="mt-2 font-bold text-forest">How fees work</p>
                <p className="text-xs text-slate-500">One-time, only when you get one.</p>
              </Link>
            </section>
          </div>
        </div>
      </div>
      <TutorBar active="home" count={badges.applied} />
    </SitePage>
  );
}
