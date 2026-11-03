// Public guardian request form. Saves a lead (private, admin only) with lead_source "website".
import { Form, Link, useNavigation } from "react-router";
import { CheckCircle2, MessageCircle, Phone } from "lucide-react";
import type { Route } from "./+types/request-tutor";
import { GUARDIAN_WA_TEXT, PageShell, buttonClass } from "~/components/site";
import { CONTACT, telLink, waLink } from "~/lib/contact";
import { parseLead } from "~/lib/lead";
import { insertLead, recentWebsiteLeads } from "~/lib/leads.server";
import { AREAS, CLASS_CHOICES, SUBJECTS, TUTOR_GENDERS } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "টিউটরের জন্য অনুরোধ · Hikmah Tutors" },
    { name: "description", content: "রাজশাহীতে হোম টিউটর খুঁজছেন? ছোট ফর্মটি পূরণ করুন, Hikmah Tutors ফোন করে বাকিটা জেনে নেবে।" },
  ];
}

type Errors = Partial<Record<"name" | "phone" | "area" | "class_level" | "subjects" | "consent" | "form", string>>;

const PER_PHONE_PER_DAY = 3;

// A fresh id per page view, so pressing "send" twice saves one lead.
export function loader(_: Route.LoaderArgs) {
  return { clientId: crypto.randomUUID() };
}

// Anyone may post here, so everything is checked again on the server; the guardian sees only "thank you".
export async function action({ request }: Route.ActionArgs) {
  const f = await request.formData();
  if (String(f.get("website") ?? "")) return { done: true as const }; // honeypot: bots fill every field

  const errors: Errors = {};
  const name = String(f.get("guardian_name") ?? "").trim();
  if (name.length < 2) errors.name = "নাম লিখুন (কমপক্ষে ২ অক্ষর)।";
  const areaKey = String(f.get("area") ?? "");
  const area = areaKey === "__other" ? String(f.get("area_other") ?? "").trim() : areaKey;
  const subjects = f.getAll("subjects").map(String);
  if (subjects.length === 0) errors.subjects = "অন্তত একটি বিষয় বেছে নিন।";
  if (f.get("consent") !== "on") errors.consent = "এগিয়ে যেতে সম্মতি দিন।";

  const { lead, errors: leadErrors } = parseLead({
    client_id: f.get("client_id"),
    created_at: Math.floor(Date.now() / 1000),
    phone: f.get("phone"),
    guardian_name: name,
    class_level: f.get("class_level"),
    tutor_gender: f.get("tutor_gender"),
    subjects,
    area,
    notes: f.get("notes"),
    lead_source: "website",
  });
  if (leadErrors?.phone) errors.phone = "সঠিক মোবাইল নম্বর দিন (013–019 দিয়ে শুরু, ১১ ডিজিট)।";
  if (leadErrors?.area) errors.area = "এলাকা বেছে নিন বা লিখুন।";
  if (leadErrors?.class_level) errors.class_level = "ক্লাস বেছে নিন।";
  if (leadErrors?.form) errors.form = "ফর্মটি আবার খুলে চেষ্টা করুন।";
  if (!lead || Object.keys(errors).length) return { errors };

  if ((await recentWebsiteLeads(lead.phone)) >= PER_PHONE_PER_DAY) {
    return { errors: { form: "এই নম্বর থেকে আজ অনেকগুলো অনুরোধ এসেছে। একটু পরে আবার চেষ্টা করুন, বা WhatsApp-এ লিখুন।" } satisfies Errors };
  }
  await insertLead(lead);
  return { done: true as const };
}

const field = "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const chip = "inline-flex min-h-11 cursor-pointer items-center rounded-full border border-brand-100 bg-white px-4 text-sm font-semibold text-forest transition-colors has-checked:border-brand-600 has-checked:bg-brand-600 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-brand-500";

function SectionHead({ n, title, hint }: { n: string; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3 pb-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">{n}</span>
      <div>
        <h2 className="text-lg font-bold text-forest">{title}</h2>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

function ContactRow() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <a href={waLink(CONTACT.whatsapp, GUARDIAN_WA_TEXT)} target="_blank" rel="noreferrer" className={buttonClass("secondary")}><MessageCircle size={18} aria-hidden /> WhatsApp-এ লিখুন</a>
      <a href={telLink(CONTACT.call)} className={buttonClass("secondary")}><Phone size={18} aria-hidden /> কল করুন</a>
    </div>
  );
}

export default function RequestTutor({ loaderData: { clientId }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state === "submitting";
  const errors: Errors = (actionData && "errors" in actionData && actionData.errors) || {};
  const err = (k: keyof Errors) => errors[k] && <p role="alert" className="mt-1 text-sm text-red-700">{errors[k]}</p>;

  if (actionData && "done" in actionData) {
    return (
      <PageShell title="টিউটরের জন্য অনুরোধ">
        <div role="status" className="animate-rise rounded-3xl border border-brand-100 bg-brand-50 p-8 text-center">
          <CheckCircle2 className="mx-auto text-brand-600" size={48} aria-hidden />
          <p className="mt-4 text-2xl font-bold text-forest">ধন্যবাদ! আমরা শীঘ্রই আপনাকে ফোন করব।</p>
          <p className="mt-2 text-slate-700">তাড়াতাড়ি দরকার হলে WhatsApp-এ লিখুন বা কল করুন।</p>
          <div className="mt-6 flex justify-center"><ContactRow /></div>
          <Link to="/" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:underline">টিউশন বোর্ডে ফিরুন</Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="টিউটরের জন্য অনুরোধ" sub="ছোট ফর্মটি পূরণ করুন, আমরা ফোন করে বাকিটা জেনে নেব। পূর্ণ ঠিকানা এখানে লাগবে না।">
      <Form method="post" noValidate className="space-y-6">
        <input type="hidden" name="client_id" value={clientId} />
        <section className="space-y-5 rounded-2xl border border-brand-100 bg-white p-5 sm:p-7">
          <SectionHead n="০১" title="আপনার যোগাযোগের তথ্য" hint="আপনার অনুরোধ নিয়ে কথা বলতে এই তথ্য লাগবে।" />
          <div>
            <label htmlFor="rq-name" className="mb-1 block font-semibold text-forest">আপনার নাম</label>
            <input id="rq-name" name="guardian_name" className={field} autoComplete="name" maxLength={60} aria-invalid={!!errors.name} />
            {err("name")}
          </div>
          <div>
            <label htmlFor="rq-phone" className="mb-1 block font-semibold text-forest">মোবাইল নম্বর</label>
            <input id="rq-phone" name="phone" className={field} inputMode="tel" autoComplete="tel" placeholder="যেমন 017XXXXXXXX" aria-invalid={!!errors.phone} />
            {err("phone")}
          </div>
          <div>
            <label htmlFor="rq-area" className="mb-1 block font-semibold text-forest">এলাকা</label>
            <select id="rq-area" name="area" defaultValue="" className={field} aria-invalid={!!errors.area}>
              <option value="">এলাকা বেছে নিন</option>
              {AREAS.filter((a) => a.key !== "online").map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              <option value="__other">অন্য এলাকা</option>
            </select>
            <input name="area_other" className={`${field} mt-2`} placeholder="অন্য এলাকা হলে নাম লিখুন" aria-label="অন্য এলাকার নাম" maxLength={60} />
            {err("area")}
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-brand-100 bg-white p-5 sm:p-7">
          <SectionHead n="০২" title="কোন বিষয়ে সাহায্য চান?" hint="নির্দিষ্ট ক্লাস, বিষয় ও টিউটরের পছন্দ বেছে নিন।" />
          <fieldset>
            <legend className="mb-2 font-semibold text-forest">ক্লাস</legend>
            <div className="flex flex-wrap gap-2">
              {CLASS_CHOICES.map((c) => (
                <label key={c.key} className={chip}><input type="radio" name="class_level" value={c.key} className="sr-only" />{c.label}</label>
              ))}
            </div>
            {err("class_level")}
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold text-forest">কেমন টিউটর চান</legend>
            <div className="grid grid-cols-3 gap-2">
              {TUTOR_GENDERS.map((g) => (
                <label key={g.key} className={`${chip} justify-center rounded-xl`}>
                  <input type="radio" name="tutor_gender" value={g.key} defaultChecked={g.key === "any"} className="sr-only" />{g.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold text-forest">বিষয় <span className="text-sm font-normal text-slate-500">— এক বা একাধিক</span></legend>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <label key={s.key} className={chip}><input type="checkbox" name="subjects" value={s.key} className="sr-only" />{s.label}</label>
              ))}
            </div>
            {err("subjects")}
          </fieldset>
        </section>

        <section className="space-y-5 rounded-2xl border border-brand-100 bg-white p-5 sm:p-7">
          <SectionHead n="০৩" title="আর কিছু জানাতে চান?" />
          <div>
            <label htmlFor="rq-note" className="mb-1 block font-semibold text-forest">অতিরিক্ত কিছু (ঐচ্ছিক)</label>
            <textarea id="rq-note" name="notes" rows={3} maxLength={300} className={`${field} py-3`} placeholder="যেমন: সপ্তাহে ৩ দিন, সন্ধ্যায়" />
          </div>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input type="checkbox" name="consent" className="mt-1 size-5 accent-brand-600" aria-invalid={!!errors.consent} />
              <span className="text-sm text-slate-700">
                আমি <Link to="/privacy" className="text-brand-700 underline">গোপনীয়তা নোটিশ</Link> পড়েছি এবং HTR আমাকে ফোন বা WhatsApp-এ যোগাযোগ করতে পারে।
              </span>
            </label>
            {err("consent")}
          </div>
          {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errors.form}</p>}
          <button type="submit" disabled={busy} className={buttonClass("forest", "w-full rounded-xl")}>{busy ? "পাঠানো হচ্ছে…" : "অনুরোধ পাঠান"}</button>
        </section>
      </Form>
      <div>
        <p className="mb-2 text-sm text-slate-600">অথবা সরাসরি</p>
        <ContactRow />
      </div>
    </PageShell>
  );
}

