// The signed-in tutor's own data. Private: only this tutor and the admin can see it.
import { Form, Link } from "react-router";
import { ArrowUpRight, Check, LogOut, ShieldCheck } from "lucide-react";
import type { Route } from "./+types/me";
import { APPLICATION_TONE, Badge, Card, Facts, num, primaryButton, when } from "~/components/admin";
import { SitePage } from "~/components/site";
import { TutorBar } from "~/components/tutor";
import { APPLICATION_STATUS } from "~/lib/admin-labels";
import { requireUser } from "~/lib/auth.server";
import { confirmAvailability, myProfile } from "~/lib/me.server";
import { AREAS, CLASS_LEVELS, MEDIUMS, SUBJECTS, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "My profile · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const viewer = await requireUser(request);
  return { email: viewer.email, profile: await myProfile(viewer.id) };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireUser(request);
  await confirmAvailability(viewer.id);
  return { confirmed: true };
}

const BANDS: Record<string, string> = { junior: "Class 1–8", ssc: "Class 9–10", hsc: "Class 11–12" };
const STATEMENTS: Record<string, string> = {
  junior_strategy: "Junior: teaching approach", junior_experience: "Junior: experience", ssc_strategy: "SSC: skills and approach", ssc_experience: "SSC: experience",
  hsc_strategy: "HSC: skills and approach", hsc_experience: "HSC: experience", english_experience: "English medium / version experience", special_skills: "Special skills",
  skills_detail: "Skills in detail", demo_video: "Demo video",
};
const TRANSPORT: Record<string, string> = { none: "None", bicycle: "Bicycle", motorbike: "Motorbike", other: "Other" };

// Application steps a tutor can see, in order (APPLICATION_STATUS has the words).
const STEPS = ["submitted", "under_review", "shortlisted", "trial_arranged", "confirmed"];
const STEP_LABEL = ["Applied", "In review", "Shortlisted", "Selected", "Confirmed"];
const NEXT: Record<string, string> = {
  submitted: "HTR will review your application.",
  under_review: "HTR will talk to the guardian and shortlist.",
  shortlisted: "You'll hear the demo class time.",
  trial_arranged: "Confirmation comes after the demo.",
  confirmed: "Congratulations! HTR will call you with the details.",
};

const SignOut = () => (
  <Form method="post" action="/logout">
    <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-100 bg-white px-4 text-sm font-semibold text-forest hover:bg-brand-50">
      <LogOut size={16} aria-hidden />Log out
    </button>
  </Form>
);

function Timeline({ status }: { status: string }) {
  const at = STEPS.indexOf(status);
  if (at < 0) return null;
  return (
    <ol className="mt-4 grid grid-cols-5 gap-1">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-col items-center text-center">
          <span className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${i <= at ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"}`}>
            {i <= at ? <Check size={16} aria-hidden /> : num(i + 1)}
          </span>
          <span className={`mt-1 text-[11px] font-semibold ${i <= at ? "text-forest" : "text-slate-400"}`}>{STEP_LABEL[i]}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Me({ loaderData: { email, profile } }: Route.ComponentProps) {
  if (!profile) {
    return (
      <SitePage>
        <div className="mx-auto max-w-md space-y-4 px-4 py-16">
          <p className="text-xs font-semibold text-brand-700">Tutor panel</p>
          <h1 className="text-3xl font-bold text-forest">Profile not found</h1>
          <p className="break-words text-slate-700">{email} দিয়ে কোনো টিউটর রেকর্ড মেলেনি। যে Google অ্যাকাউন্ট দিয়ে ফর্ম পূরণ করেছিলেন, সেটি দিয়ে লগইন করে দেখুন।</p>
          <SignOut />
        </div>
      </SitePage>
    );
  }
  const { tutor: t, subjects, statements, applications } = profile;
  const active = applications.filter((a) => STEPS.indexOf(a.status) >= 0 && a.status !== "confirmed").length;
  return (
    <SitePage>
      <div className="mx-auto max-w-5xl space-y-6 px-4 pt-6 pb-24 sm:px-6 lg:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {t.photo_key && <img src={`/photos/tutor/${t.code}`} alt="" width={64} height={64} className="size-16 shrink-0 rounded-2xl object-cover" />}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand-700">Tutor panel · {t.code}</p>
              <h1 className="mt-1 text-2xl font-bold break-words text-forest sm:text-3xl">{t.full_name}</h1>
            </div>
          </div>
          <SignOut />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <p className="text-xs font-semibold text-brand-700">Your readiness</p>
            {t.availability_confirmed_at ? (
              <>
                <h2 className="mt-2 text-2xl font-bold text-forest sm:text-3xl">Ready to apply!</h2>
                <p className="mt-2 text-sm text-slate-500">পড়াতে আগ্রহী বলে নিশ্চিত করেছেন। তথ্য বদলালে HTR-কে জানান।</p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-bold text-forest sm:text-3xl">Do you still want to tutor?</h2>
                <p className="mt-2 text-sm text-slate-500">নিচের তথ্য দেখে নিন। এখনো পড়াতে আগ্রহী হলে নিশ্চিত করুন।</p>
                <Form method="post" className="mt-4">
                  <button className={`${primaryButton} w-full sm:w-auto`}>Yes, I'm interested</button>
                </Form>
              </>
            )}
            <p className="mt-5 flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-slate-600">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-700" aria-hidden />এই তথ্য পাবলিক নয়। শুধু আপনি ও Hikmah Tutors-এর অ্যাডমিন দেখতে পান।
            </p>
          </Card>
          <div className="flex flex-col justify-between gap-5 rounded-2xl bg-forest p-6 text-cream">
            <div>
              <p className="text-xs font-semibold text-brand-200">Your teaching journey</p>
              <p className="mt-3 text-base font-semibold">Don't miss the right tuition.</p>
            </div>
            <div className="space-y-1">
              <Link to="/applied" className="flex min-h-12 items-center justify-between gap-2 border-b border-white/10 py-2 text-sm transition-colors hover:text-mango">
                <span>Active applications</span><span className="font-bold">{num(active)}</span>
              </Link>
              <Link to="/" className="flex min-h-12 items-center justify-between gap-2 py-2 text-sm transition-colors hover:text-mango">
                <span>See all tuitions</span><ArrowUpRight size={17} aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        <section id="applications" className="scroll-mt-24">
          <h2 className="mb-4 text-lg font-bold text-forest">My applications ({num(applications.length)})</h2>
          {applications.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-brand-200 bg-white p-8 text-center text-slate-600">No applications yet.</p>
          ) : (
            <div className="space-y-3">
              {applications.map((a) => (
                <Card key={a.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link to={`/tuitions/HTR-${a.tuition_code}`} className="font-bold text-forest hover:underline">HTR-{a.tuition_code}</Link>
                      <p className="text-sm text-slate-700">{labelOf(CLASS_LEVELS, a.class_level)} · {labelOf(AREAS, a.area)}</p>
                      <p className="text-xs text-slate-500">Applied {when(a.created_at)}</p>
                    </div>
                    <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
                  </div>
                  <Timeline status={a.status} />
                  {NEXT[a.status] && <p className="mt-3 text-sm text-slate-700"><b>Next:</b> {NEXT[a.status]}</p>}
                </Card>
              ))}
            </div>
          )}
        </section>

        <div id="profile" className="grid scroll-mt-24 gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="mb-2 text-lg font-bold text-forest">My details</h2>
            <Facts rows={[
              ["Tutor code", t.code], ["Email", t.email], ["Phone", t.phone], ["Other phone", t.alt_phone], ["Gender", t.gender === "female" ? "Female" : t.gender === "male" ? "Male" : ""],
              ["Institution", t.institution], ["Department", t.department], ["Session", t.session_year],
              ["Medium", (t.mediums ?? "").split(",").filter(Boolean).map((m) => labelOf(MEDIUMS, m)).join(", ")],
              ["Lives in", t.current_location], ["Home", [t.home_district, t.home_division].filter(Boolean).join(", ")],
              ["Demo class", t.demo_willing === null ? "" : t.demo_willing ? "Willing" : "Not willing"], ["Transport", t.transport ? TRANSPORT[t.transport] : ""],
            ]} />
          </Card>
          <div className="space-y-5">
            <Card>
              <h2 className="mb-2 text-lg font-bold text-forest">Education</h2>
              <Facts rows={[
                ["SSC", [t.ssc_school, t.ssc_group, t.ssc_year, t.ssc_result && `GPA ${t.ssc_result}`].filter(Boolean).join(" · ")],
                ["HSC", [t.hsc_college, t.hsc_group, t.hsc_year, t.hsc_result && `GPA ${t.hsc_result}`].filter(Boolean).join(" · ")],
              ]} />
            </Card>
            <Card>
              <h2 className="mb-3 text-lg font-bold text-forest">Can teach</h2>
              {Object.entries(BANDS).map(([band, label]) => {
                const list = subjects.filter((s) => s.band === band).map((s) => labelOf(SUBJECTS, s.subject));
                return list.length > 0 && (
                  <div key={band} className="py-1.5">
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">{list.map((s) => <span key={s} className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-forest">{s}</span>)}</div>
                  </div>
                );
              })}
            </Card>
          </div>
        </div>

        {statements.map((s) => (
          <Card key={s.kind}>
            <h2 className="mb-1 text-lg font-bold text-forest">{STATEMENTS[s.kind]}</h2>
            <p className="text-sm break-words whitespace-pre-line text-slate-700">{s.body}</p>
          </Card>
        ))}
      </div>
      <TutorBar active="home" count={applications.filter((a) => a.status === "trial_arranged").length} />
    </SitePage>
  );
}
