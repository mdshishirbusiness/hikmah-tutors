// The signed-in tutor's own data. Private: only this tutor and the admin can see it.
import { Form } from "react-router";
import type { Route } from "./+types/me";
import { Badge, Card, Facts, bn, primaryButton, when } from "~/components/admin";
import { SiteHeader } from "~/components/site";
import { APPLICATION_STATUS } from "~/lib/admin-labels";
import { requireUser } from "~/lib/auth.server";
import { confirmAvailability, myProfile } from "~/lib/me.server";
import { AREAS, CLASS_LEVELS, MEDIUMS, SUBJECTS, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "আমার প্রোফাইল · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
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

const BANDS: Record<string, string> = { junior: "১ম–৮ম", ssc: "৯ম–১০ম", hsc: "একাদশ–দ্বাদশ" };
const STATEMENTS: Record<string, string> = {
  junior_strategy: "ছোটদের পড়ানোর কৌশল", junior_experience: "ছোটদের পড়ানোর অভিজ্ঞতা", ssc_strategy: "SSC: দক্ষতা ও কৌশল", ssc_experience: "SSC: অভিজ্ঞতা",
  hsc_strategy: "HSC: দক্ষতা ও কৌশল", hsc_experience: "HSC: অভিজ্ঞতা", english_experience: "English Medium / Version অভিজ্ঞতা", special_skills: "বিশেষ দক্ষতা",
  skills_detail: "দক্ষতার বিস্তারিত", demo_video: "ডেমো ভিডিও",
};
const TRANSPORT: Record<string, string> = { none: "নেই", bicycle: "সাইকেল", motorbike: "মোটরবাইক", other: "অন্যান্য" };

const SignOut = () => (
  <Form method="post" action="/logout">
    <button className="min-h-11 rounded-xl border border-brand-100 bg-white px-4 text-sm font-semibold text-forest hover:bg-brand-50">লগআউট</button>
  </Form>
);

export default function Me({ loaderData: { email, profile } }: Route.ComponentProps) {
  if (!profile) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-md space-y-4 px-4 py-10">
          <h1 className="text-2xl font-semibold text-forest">প্রোফাইল পাওয়া যায়নি</h1>
          <p className="break-words text-slate-700">{email} দিয়ে কোনো টিউটর রেকর্ড মেলেনি। যে Google অ্যাকাউন্ট দিয়ে ফর্ম পূরণ করেছিলেন, সেটি দিয়ে লগইন করে দেখুন।</p>
          <SignOut />
        </main>
      </>
    );
  }
  const { tutor: t, subjects, statements, applications } = profile;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {t.photo_key && <img src={`/photos/tutor/${t.code}`} alt="" width={64} height={64} className="size-16 shrink-0 rounded-2xl object-cover" />}
            <h1 className="min-w-0 text-2xl font-semibold break-words text-forest">{t.full_name}</h1>
          </div>
          <SignOut />
        </div>
        <p className="text-sm text-slate-600">এই তথ্য পাবলিক নয়। শুধু আপনি ও Hikmah Tutors-এর অ্যাডমিন দেখতে পান।</p>

        {!t.availability_confirmed_at && (
          <Card className="border-forest">
            <h2 className="font-semibold text-forest">আপনি কি এখনো টিউশন করাতে চান?</h2>
            <p className="mt-1 text-sm text-slate-700">নিচের তথ্য দেখে নিন। এখনো পড়াতে আগ্রহী হলে নিশ্চিত করুন।</p>
            <Form method="post" className="mt-3">
              <button className={`${primaryButton} w-full`}>হ্যাঁ, আমি আগ্রহী</button>
            </Form>
          </Card>
        )}

        <Card>
          <Facts rows={[
            ["টিউটর কোড", t.code], ["ইমেইল", t.email], ["ফোন", t.phone], ["অন্য ফোন", t.alt_phone], ["জেন্ডার", t.gender === "female" ? "মহিলা" : t.gender === "male" ? "পুরুষ" : ""],
            ["প্রতিষ্ঠান", t.institution], ["বিভাগ", t.department], ["সেশন", t.session_year],
            ["মাধ্যম", (t.mediums ?? "").split(",").filter(Boolean).map((m) => labelOf(MEDIUMS, m)).join(", ")],
            ["এখন থাকেন", t.current_location], ["বাড়ি", [t.home_district, t.home_division].filter(Boolean).join(", ")],
            ["ডেমো ক্লাস", t.demo_willing === null ? "" : t.demo_willing ? "রাজি" : "রাজি নন"], ["যানবাহন", t.transport ? TRANSPORT[t.transport] : ""],
          ]} />
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold text-forest">পড়াশোনা</h2>
          <Facts rows={[
            ["SSC", [t.ssc_school, t.ssc_group, t.ssc_year, t.ssc_result && `GPA ${t.ssc_result}`].filter(Boolean).join(" · ")],
            ["HSC", [t.hsc_college, t.hsc_group, t.hsc_year, t.hsc_result && `GPA ${t.hsc_result}`].filter(Boolean).join(" · ")],
          ]} />
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold text-forest">যা পড়াতে পারেন</h2>
          {Object.entries(BANDS).map(([band, label]) => {
            const list = subjects.filter((s) => s.band === band).map((s) => labelOf(SUBJECTS, s.subject));
            return list.length > 0 && <p key={band} className="py-1 text-sm"><span className="font-semibold text-forest">{label}:</span> {list.join(", ")}</p>;
          })}
        </Card>

        {statements.map((s) => (
          <Card key={s.kind}>
            <h2 className="mb-1 font-semibold text-forest">{STATEMENTS[s.kind]}</h2>
            <p className="text-sm break-words whitespace-pre-line text-slate-700">{s.body}</p>
          </Card>
        ))}

        <section>
          <h2 className="mb-2 font-semibold text-forest">আমার আবেদন ({bn(applications.length)})</h2>
          <ul className="space-y-2">
            {applications.map((a) => (
              <li key={a.id} className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm">
                <span>HTR-{a.tuition_code} · {labelOf(CLASS_LEVELS, a.class_level)} · {labelOf(AREAS, a.area)} · {when(a.created_at)}</span>
                <Badge>{APPLICATION_STATUS[a.status]}</Badge>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
