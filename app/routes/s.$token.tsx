// A guardian's private status page (owner, 2026-11-05). Reached only by the link HTR sends on WhatsApp; no login.
// Shows this one request's steps, the applicant count and the selected tutor's first name and code. Never a tutor's
// phone, photo or other details, nothing about other guardians, no private notes.
import { Link, data } from "react-router";
import { Check, MessageCircle, Phone, Plus } from "lucide-react";
import type { Route } from "./+types/s.$token";
import { SitePage, buttonClass } from "~/components/site";
import { guardianStatus } from "~/lib/admin.server";
import { CONTACT, telLink, waLink } from "~/lib/contact";
import { AREAS, labelOf } from "~/lib/options";
import { classLabel } from "~/lib/request";
import { firstName } from "~/lib/whatsapp";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Your request · Hikmah Tutors" }, { name: "robots", content: "noindex, nofollow" }, { name: "referrer", content: "no-referrer" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };
}

export async function loader({ params }: Route.LoaderArgs) {
  const s = await guardianStatus(params.token);
  if (!s) throw data("Link not found", { status: 404 });
  // First name and code only; the full name stays on the server.
  return { ...s, selected: s.selected && { ...s.selected, name: firstName(s.selected.name) } };
}

type Step = { label: string; sub: string; done: boolean };

export default function GuardianStatusPage({ loaderData: s }: Route.ComponentProps) {
  const ended = s.status === "closed" || s.status === "cancelled";
  const confirmed = s.selected?.status === "confirmed";
  const steps: Step[] = [
    { label: "Request received", sub: "HTR আপনার চাহিদা লিখে রেখেছে।", done: true },
    { label: "Posted for tutors", sub: "যাচাই করা টিউটররা আবেদন করছেন।", done: !!s.posted_at || s.applicants > 0 },
    { label: s.applicants ? `${s.applicants} tutors applied` : "Tutors applying", sub: "HTR প্রত্যেকের অভিজ্ঞতা ও ফলাফল দেখছে।", done: s.applicants > 0 },
    { label: "Shortlist ready", sub: "সবচেয়ে উপযুক্তদের তথ্য HTR আপনাকে WhatsApp-এ পাঠাবে।", done: s.shortlisted > 0 },
    {
      label: s.selected ? `Tutor selected: ${s.selected.name}${s.selected.tutor_code ? ` (T-${s.selected.tutor_code})` : ""}` : "Tutor selected",
      sub: s.selected?.demo_done_at ? "ডেমো ক্লাস হয়ে গেছে।" : "টিউটর আপনাকে ফোন করে ডেমো ক্লাসের সময় ঠিক করবেন।",
      done: !!s.selected,
    },
    { label: "Confirmed", sub: "ডেমোর পর আপনি রাজি হলে টিউশন শুরু।", done: confirmed },
  ];
  const at = steps.findIndex((x) => !x.done);

  return (
    <SitePage>
      <div className="mx-auto max-w-lg px-4 pt-6 pb-16">
        <section className="animate-rise rounded-3xl bg-forest p-5 text-cream shadow-lift">
          <p className="text-xs font-bold tracking-[0.14em] text-mango uppercase">Your request · HTR-{s.code}</p>
          <h1 className="mt-1 text-[28px] leading-tight font-extrabold tracking-tight">{classLabel(s.class_level, s.class_other)}</h1>
          <p className="text-lg font-semibold text-brand-100">{s.mode === "online" ? "Online" : labelOf(AREAS, s.area)}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-bold">
            <span aria-hidden className={`size-2 rounded-full ${ended ? "bg-slate-300" : confirmed ? "bg-emerald-400" : "bg-mango"}`} />
            {ended ? "Closed" : confirmed ? "Tutor confirmed" : steps.filter((x) => x.done).at(-1)?.label}
          </p>
        </section>

        {ended ? (
          <p className="mt-5 rounded-2xl bg-white p-5 text-slate-700 shadow-ring">এই অনুরোধটি বন্ধ হয়ে গেছে। নতুন টিউটর লাগলে নিচের বোতামে চাপুন বা HTR-কে লিখুন।</p>
        ) : (
          <ol className="mt-5 rounded-2xl bg-white p-5 shadow-ring" aria-label="Steps">
            {steps.map((x, i) => {
              const now = i === at;
              return (
                <li key={x.label} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < steps.length - 1 && <span aria-hidden className={`absolute top-8 bottom-0 left-[15px] w-0.5 ${x.done ? "bg-brand-600" : "bg-slate-200"}`} />}
                  <span className={`relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold tabular-nums ${x.done ? "bg-brand-600 text-white" : now ? "bg-mango text-forest ring-4 ring-mango/30" : "bg-slate-100 text-slate-400"}`}>
                    {x.done ? <Check size={16} strokeWidth={3} aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0 pt-1">
                    <span className={`block font-extrabold ${x.done || now ? "text-forest" : "text-slate-400"}`}>{x.label}</span>
                    {(x.done || now) && <span className="block text-sm text-slate-600">{x.sub}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <a href={waLink(CONTACT.whatsapp, `আসসালামু আলাইকুম, HTR-${s.code} সম্পর্কে জানতে চাই।`)} target="_blank" rel="noreferrer" className={`${buttonClass("primary")} wa-btn`}>
            <MessageCircle size={18} aria-hidden />WhatsApp
          </a>
          <a href={telLink(CONTACT.call)} className={buttonClass("secondary")}><Phone size={18} aria-hidden />Call HTR</a>
        </div>
        <Link to="/request-tutor" className="mt-3 flex min-h-12 items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-brand-700 hover:bg-brand-50">
          <Plus size={16} aria-hidden />Tutor for another child
        </Link>
        <p className="mt-4 text-center text-xs text-slate-500">এই লিংকটি শুধু আপনার জন্য। অন্য কাউকে পাঠাবেন না।</p>
      </div>
    </SitePage>
  );
}
