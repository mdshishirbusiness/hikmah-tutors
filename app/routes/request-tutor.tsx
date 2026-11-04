// Public guardian request form. Saves a lead (private, admin only) with lead_source "website". The same fields as the
// Quick Pad (owner, 2026-11-04, review step 3), in five short parts; only name, phone, area, class and a subject are
// needed. Helper lines are in Bangla, where a guardian reads them most easily.
import { Form, Link, useNavigation } from "react-router";
import { CheckCircle2, Clock, GraduationCap, type LucideIcon, MapPin, MessageCircle, Phone, UserRound } from "lucide-react";
import { SectionCard, type SectionTone } from "~/components/SectionCard";
import type { Route } from "./+types/request-tutor";
import { AddressDetails, AreaPicker, ClassPicker, MediumPicker, RequirementPicker, SessionPicker, SubjectPicker, TimePicker, TutorPicker } from "~/components/RequestFields";
import { GUARDIAN_WA_TEXT, PageShell, buttonClass } from "~/components/site";
import { ChoiceChip } from "~/components/tutor";
import { CONTACT, telLink, waLink } from "~/lib/contact";
import { leadFromForm, parseLead } from "~/lib/lead";
import { insertLead, recentWebsiteLeads } from "~/lib/leads.server";
import { DAYS_PER_WEEK, STUDENT_GENDERS } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Request a tutor · Hikmah Tutors" },
    { name: "description", content: "রাজশাহীতে হোম টিউটর খুঁজছেন? ছোট ফর্মটি পূরণ করুন, Hikmah Tutors ফোন করে বাকিটা জেনে নেবে।" },
  ];
}

type Errors = Partial<Record<"name" | "phone" | "area" | "class_level" | "subjects" | "time" | "salary" | "consent" | "form", string>>;

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
  if (name.length < 2) errors.name = "নাম লিখুন (কমপক্ষে 2 অক্ষর)।";
  if (f.getAll("subjects").length === 0) errors.subjects = "অন্তত একটি বিষয় বেছে নিন।";
  if (f.get("consent") !== "on") errors.consent = "এগিয়ে যেতে সম্মতি দিন।";

  // The same fields and checks as the Quick Pad. The address details stay private (only the Selected tutor sees them).
  const { lead, errors: leadErrors } = parseLead(leadFromForm(f, { client_id: f.get("client_id"), created_at: Math.floor(Date.now() / 1000), lead_source: "website" }));
  if (leadErrors?.phone) errors.phone = "সঠিক মোবাইল নম্বর দিন (013–019 দিয়ে শুরু, 11 ডিজিট)।";
  if (leadErrors?.area) errors.area = "এলাকা বেছে নিন বা লিখুন।";
  if (leadErrors?.class_level) errors.class_level = "ক্লাস বেছে নিন।";
  if (leadErrors?.time) errors.time = "শুরু ও শেষ দুটো সময়ই দিন, আর শেষ সময় শুরুর পরে হতে হবে।";
  if (leadErrors?.salary) errors.salary = "বেতন ৳500 থেকে ৳2,00,000-এর মধ্যে লিখুন।";
  if (leadErrors?.form) errors.form = "ফর্মটি আবার খুলে চেষ্টা করুন।";
  if (!lead || Object.keys(errors).length) return { errors };

  if ((await recentWebsiteLeads(lead.phone)) >= PER_PHONE_PER_DAY) {
    return { errors: { form: "এই নম্বর থেকে আজ অনেকগুলো অনুরোধ এসেছে। একটু পরে আবার চেষ্টা করুন, বা WhatsApp-এ লিখুন।" } satisfies Errors };
  }
  await insertLead(lead);
  return { done: true as const };
}

const field = "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const Chips = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap gap-2">{children}</div>;

function Part({ n, title, hint, icon, tone, error, children }: { n: number; title: string; hint?: string; icon: LucideIcon; tone?: SectionTone; error?: boolean; children: React.ReactNode }) {
  return <SectionCard step={n} icon={icon} tone={tone} title={title} hint={hint} error={error}><div className="space-y-5">{children}</div></SectionCard>;
}

function Q({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return <p className="mb-2 font-bold text-forest">{children}{optional && <span className="ml-1 text-sm font-normal text-slate-500">(optional)</span>}</p>;
}

function ContactRow() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <a href={waLink(CONTACT.whatsapp, GUARDIAN_WA_TEXT)} target="_blank" rel="noreferrer" className={buttonClass("secondary")}><MessageCircle size={18} aria-hidden /> WhatsApp</a>
      <a href={telLink(CONTACT.call)} className={buttonClass("secondary")}><Phone size={18} aria-hidden /> Call</a>
    </div>
  );
}

export default function RequestTutor({ loaderData: { clientId }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state === "submitting";
  const errors: Errors = (actionData && "errors" in actionData && actionData.errors) || {};
  const err = (k: keyof Errors) => errors[k] && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{errors[k]}</p>;

  if (actionData && "done" in actionData) {
    return (
      <PageShell title="Request a tutor">
        <div role="status" className="animate-rise rounded-3xl border border-brand-100 bg-brand-50 p-8 text-center">
          <CheckCircle2 className="mx-auto text-brand-600" size={48} aria-hidden />
          <p className="mt-4 text-2xl font-bold text-forest">ধন্যবাদ! আমরা শীঘ্রই আপনাকে ফোন করব।</p>
          <p className="mt-2 text-slate-700">তাড়াতাড়ি দরকার হলে WhatsApp-এ লিখুন বা কল করুন।</p>
          <div className="mt-6 flex justify-center"><ContactRow /></div>
          <Link to="/" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:underline">Back to board</Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Request a tutor" sub="কয়েকটা ট্যাপেই হয়ে যাবে। বাকিটা আমরা ফোন করে জেনে নেব।">
      <Form method="post" noValidate className="space-y-4">
        <input type="hidden" name="client_id" value={clientId} />
        {Object.keys(errors).length > 0 && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{errors.form ?? "লাল দাগ দেওয়া অংশগুলো ঠিক করুন।"}</p>}

        <Part n={1} icon={Phone} tone="brand" title="Your contact" hint="এই নম্বরে আমরা ফোন করব। কোনো টিউটর বা অন্য কেউ এটি দেখবে না।" error={!!(errors.name || errors.phone)}>
          <div>
            <label htmlFor="rq-name" className="mb-1 block font-bold text-forest">Your name</label>
            <input id="rq-name" name="guardian_name" className={field} autoComplete="name" maxLength={60} aria-invalid={!!errors.name} />
            {err("name")}
          </div>
          <div>
            <label htmlFor="rq-phone" className="mb-1 block font-bold text-forest">Mobile number</label>
            <input id="rq-phone" name="phone" className={field} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" aria-invalid={!!errors.phone} />
            {err("phone")}
          </div>
        </Part>

        <Part n={2} icon={MapPin} tone="amber" title="Where" hint="এলাকা বেছে নিন। বিস্তারিত ঠিকানা দিলে শুধু নির্বাচিত টিউটর দেখবেন।" error={!!errors.area}>
          <AreaPicker allowOther />
          <AddressDetails name="address" />
          {err("area")}
        </Part>

        <Part n={3} icon={UserRound} tone="sky" title="Your child" error={!!(errors.class_level || errors.subjects)}>
          <div><Q>Class</Q><ClassPicker />{err("class_level")}</div>
          <div><Q>Subjects</Q><SubjectPicker />{err("subjects")}</div>
          <div><Q optional>Medium</Q><MediumPicker /></div>
          <div><Q optional>Student</Q><Chips>{STUDENT_GENDERS.map((g) => <ChoiceChip key={g.key} type="radio" name="student_gender" value={g.key}>{g.key === "boy" ? "Son" : "Daughter"}</ChoiceChip>)}</Chips></div>
        </Part>

        <Part n={4} icon={Clock} tone="violet" title="When" hint="জানা না থাকলে খালি রাখুন, ফোনে ঠিক করে নেব।" error={!!errors.time}>
          <div><Q optional>Days per week</Q><Chips>{DAYS_PER_WEEK.map((d) => <ChoiceChip key={d} type="radio" name="days_per_week" value={String(d)}>{d} days</ChoiceChip>)}</Chips></div>
          <div><Q optional>Time</Q><TimePicker />{err("time")}</div>
        </Part>

        <Part n={5} icon={GraduationCap} tone="brand" title="The tutor you want" error={!!(errors.salary || errors.consent)}>
          <TutorPicker genderName="tutor_gender" />
          <div><Q optional>যা যা চান</Q><RequirementPicker /></div>
          <div>
            <label htmlFor="rq-salary" className="mb-1 block font-bold text-forest">Salary per month <span className="text-sm font-normal text-slate-500">(optional)</span></label>
            <input id="rq-salary" name="salary" inputMode="numeric" placeholder="e.g. 4000" className={field} aria-invalid={!!errors.salary} />
            {err("salary")}
          </div>
          <div>
            <label htmlFor="rq-note" className="mb-1 block font-bold text-forest">Anything else <span className="text-sm font-normal text-slate-500">(optional)</span></label>
            <textarea id="rq-note" name="notes" rows={3} maxLength={500} className={`${field} py-3`} placeholder="যেমন: ইংরেজিতে দুর্বল, একটু বেশি সময় দিতে হবে" />
          </div>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input type="checkbox" name="consent" className="mt-1 size-5 shrink-0 accent-forest" aria-invalid={!!errors.consent} />
              <span className="text-sm text-slate-700">
                আমি <Link to="/privacy" className="text-brand-700 underline">গোপনীয়তা নোটিশ</Link> পড়েছি এবং HTR আমাকে ফোন বা WhatsApp-এ যোগাযোগ করতে পারে।
              </span>
            </label>
            {err("consent")}
          </div>
          <button type="submit" disabled={busy} className={buttonClass("forest", "w-full rounded-xl")}>{busy ? "Sending…" : "Send request"}</button>
        </Part>
      </Form>
      <div>
        <p className="mb-2 text-sm text-slate-600">Or reach us directly</p>
        <ContactRow />
      </div>
    </PageShell>
  );
}
