import { Link, data } from "react-router";
import type { Route } from "./+types/admin.tutors.$code";
import { Badge, Card, ContactButtons, Facts, PageHead, num, safeUrl, when, APPLICATION_TONE } from "~/components/admin";
import { APPLICATION_STATUS } from "~/lib/admin-labels";
import { getTutor } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_LEVELS, MEDIUMS, SUBJECTS, labelOf } from "~/lib/options";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Tutor ${params.code} · Admin` }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const found = await getTutor(Number(params.code) || -1);
  if (!found) throw data("Tutor not found", { status: 404 });
  return found;
}

const BANDS: Record<string, string> = { junior: "Class 1–8", ssc: "Class 9–10", hsc: "Class 11–12" };
const STATEMENTS: Record<string, string> = {
  junior_strategy: "Junior: teaching approach", junior_experience: "Junior: experience", ssc_strategy: "SSC: skills and approach", ssc_experience: "SSC: experience",
  hsc_strategy: "HSC: skills and approach", hsc_experience: "HSC: experience", english_experience: "English medium / version experience", special_skills: "Special skills",
  skills_detail: "Skills in detail", demo_video: "Demo video",
};
const TRANSPORT: Record<string, string> = { none: "None", bicycle: "Bicycle", motorbike: "Motorbike", other: "Other" };
const linkClass = "inline-flex min-h-11 items-center rounded-xl border border-brand-100 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50";

export default function AdminTutor({ loaderData: { tutor: t, subjects, statements, applications, placements } }: Route.ComponentProps) {
  const photo = safeUrl(t.photo_source_url), facebook = safeUrl(t.facebook_url);
  return (
    <>
      <PageHead title={t.full_name} back={{ to: "/admin/tutors", label: "All tutors" }} />
      <main className="space-y-4">
        <p className="text-sm text-slate-600">এই প্রোফাইল পাবলিক নয়। শুধু অ্যাডমিন ও টিউটর নিজে দেখতে পারবেন।</p>
        <Card>
          {t.photo_key && <img src={`/photos/tutor/${t.code}`} alt={`Photo of ${t.full_name}`} width={96} height={96} className="mb-3 size-24 rounded-2xl object-cover" />}
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge tone={t.claim_status === "claimed" ? "green" : "grey"}>{t.claim_status === "claimed" ? "Signed in" : "Not signed in yet"}</Badge>
            {t.priority === "urgent" && <Badge tone="dark">Urgent</Badge>}
          </div>
          <ContactButtons phone={t.phone} />
          {t.alt_phone && <div className="mt-2"><ContactButtons phone={t.alt_phone} /></div>}
          <div className="mt-2 flex flex-wrap gap-2">
            {photo && !t.photo_key && <a href={photo} target="_blank" rel="noreferrer" className={linkClass}>Photo</a>}
            {facebook && <a href={facebook} target="_blank" rel="noreferrer" className={linkClass}>Facebook</a>}
          </div>
          <div className="mt-2">
            <Facts rows={[
              ["Code", t.code], ["Email", t.email], ["Gender", t.gender === "female" ? "Female" : t.gender === "male" ? "Male" : ""],
              ["Institution", t.institution], ["Department", t.department], ["Session", t.session_year],
              ["Medium", (t.mediums ?? "").split(",").filter(Boolean).map((m) => labelOf(MEDIUMS, m)).join(", ")],
              ["Lives in", t.current_location], ["Home", [t.home_district, t.home_division].filter(Boolean).join(", ")],
              ["Demo class", t.demo_willing === null ? "" : t.demo_willing ? "Willing" : "Not willing"], ["Transport", t.transport ? TRANSPORT[t.transport] : ""],
              ["Referral", t.referral_code], ["Registered", when(t.registered_at)],
            ]} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold text-forest">Education</h2>
          <Facts rows={[
            ["SSC", [t.ssc_school, t.ssc_group, t.ssc_year, t.ssc_result && `GPA ${t.ssc_result}`].filter(Boolean).join(" · ")],
            ["HSC", [t.hsc_college, t.hsc_group, t.hsc_year, t.hsc_result && `GPA ${t.hsc_result}`].filter(Boolean).join(" · ")],
          ]} />
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold text-forest">Can teach</h2>
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
          <h2 className="mb-2 font-semibold text-forest">Applications ({num(applications.length)}){placements.length > 0 && ` · selected ${num(placements.length)}`}</h2>
          <ul className="space-y-2">
            {applications.map((a) => (
              <li key={a.id}>
                <Link to={`/admin/tuitions/${a.tuition_code}`} className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm">
                  <span>HTR-{a.tuition_code} · {labelOf(CLASS_LEVELS, a.class_level)} · {labelOf(AREAS, a.area)}</span>
                  <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
