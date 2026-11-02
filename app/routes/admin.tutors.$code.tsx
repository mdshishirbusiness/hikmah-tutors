import { Link, data } from "react-router";
import type { Route } from "./+types/admin.tutors.$code";
import { Badge, Card, ContactButtons, Facts, PageHead, bn, safeUrl, when } from "~/components/admin";
import { APPLICATION_STATUS } from "~/lib/admin-labels";
import { getTutor } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_LEVELS, MEDIUMS, SUBJECTS, labelOf } from "~/lib/options";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `টিউটর ${params.code} · অ্যাডমিন` }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const found = await getTutor(Number(params.code) || -1);
  if (!found) throw data("টিউটর পাওয়া যায়নি", { status: 404 });
  return found;
}

const BANDS: Record<string, string> = { junior: "১ম–৮ম", ssc: "৯ম–১০ম", hsc: "একাদশ–দ্বাদশ" };
const STATEMENTS: Record<string, string> = {
  junior_strategy: "ছোটদের পড়ানোর কৌশল", junior_experience: "ছোটদের পড়ানোর অভিজ্ঞতা", ssc_strategy: "SSC: দক্ষতা ও কৌশল", ssc_experience: "SSC: অভিজ্ঞতা",
  hsc_strategy: "HSC: দক্ষতা ও কৌশল", hsc_experience: "HSC: অভিজ্ঞতা", english_experience: "English Medium / Version অভিজ্ঞতা", special_skills: "বিশেষ দক্ষতা",
  skills_detail: "দক্ষতার বিস্তারিত", demo_video: "ডেমো ভিডিও",
};
const TRANSPORT: Record<string, string> = { none: "নেই", bicycle: "সাইকেল", motorbike: "মোটরবাইক", other: "অন্যান্য" };
const linkClass = "inline-flex min-h-11 items-center rounded-xl border border-brand-100 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50";

export default function AdminTutor({ loaderData: { tutor: t, subjects, statements, applications, placements } }: Route.ComponentProps) {
  const photo = safeUrl(t.photo_source_url), facebook = safeUrl(t.facebook_url);
  return (
    <>
      <PageHead title={t.full_name} back={{ to: "/admin/tutors", label: "সব টিউটর" }} />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        <p className="text-sm text-slate-600">এই প্রোফাইল পাবলিক নয়। শুধু অ্যাডমিন ও টিউটর নিজে দেখতে পারবেন।</p>
        <Card>
          {t.photo_key && <img src={`/photos/tutor/${t.code}`} alt={`${t.full_name}-এর ছবি`} width={96} height={96} className="mb-3 size-24 rounded-2xl object-cover" />}
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge tone={t.claim_status === "claimed" ? "green" : "grey"}>{t.claim_status === "claimed" ? "লগইন করেছেন" : "এখনো লগইন করেননি"}</Badge>
            {t.priority === "urgent" && <Badge tone="dark">জরুরি প্রয়োজন</Badge>}
          </div>
          <ContactButtons phone={t.phone} />
          {t.alt_phone && <div className="mt-2"><ContactButtons phone={t.alt_phone} /></div>}
          <div className="mt-2 flex flex-wrap gap-2">
            {photo && !t.photo_key && <a href={photo} target="_blank" rel="noreferrer" className={linkClass}>ছবি</a>}
            {facebook && <a href={facebook} target="_blank" rel="noreferrer" className={linkClass}>Facebook</a>}
          </div>
          <div className="mt-2">
            <Facts rows={[
              ["কোড", t.code], ["ইমেইল", t.email], ["জেন্ডার", t.gender === "female" ? "মহিলা" : t.gender === "male" ? "পুরুষ" : ""],
              ["প্রতিষ্ঠান", t.institution], ["বিভাগ", t.department], ["সেশন", t.session_year],
              ["মাধ্যম", (t.mediums ?? "").split(",").filter(Boolean).map((m) => labelOf(MEDIUMS, m)).join(", ")],
              ["এখন থাকেন", t.current_location], ["বাড়ি", [t.home_district, t.home_division].filter(Boolean).join(", ")],
              ["ডেমো ক্লাস", t.demo_willing === null ? "" : t.demo_willing ? "রাজি" : "রাজি নন"], ["যানবাহন", t.transport ? TRANSPORT[t.transport] : ""],
              ["রেফারেল", t.referral_code], ["রেজিস্ট্রেশন", when(t.registered_at)],
            ]} />
          </div>
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
          <h2 className="mb-2 font-semibold text-forest">আবেদন ({bn(applications.length)}){placements.length > 0 && ` · বাছাই ${bn(placements.length)}`}</h2>
          <ul className="space-y-2">
            {applications.map((a) => (
              <li key={a.id}>
                <Link to={`/admin/tuitions/${a.tuition_code}`} className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm">
                  <span>HTR-{a.tuition_code} · {labelOf(CLASS_LEVELS, a.class_level)} · {labelOf(AREAS, a.area)}</span>
                  <Badge>{APPLICATION_STATUS[a.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
