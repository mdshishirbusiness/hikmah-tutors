// All leads, newest first. One tap to call or to open WhatsApp.
import { Link } from "react-router";

import type { Route } from "./+types/admin.leads";
import { requireAdmin } from "~/lib/auth.server";
import { recentLeads } from "~/lib/leads.server";
import { usePendingCount } from "~/lib/lead-queue";
import {
  AREAS,
  CLASS_LEVELS,
  LEAD_SOURCES,
  MEDIUMS,
  STATUSES,
  STUDENT_GENDERS,
  SUBJECTS,
  TUTOR_GENDERS,
  labelOf,
} from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "লিড · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  requireAdmin(request);
  return { leads: await recentLeads(100) };
}

const bn = (n: number) => n.toLocaleString("bn-BD");

function when(sec: number) {
  return new Date(sec * 1000).toLocaleString("bn-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Leads({ loaderData }: Route.ComponentProps) {
  const { leads } = loaderData;
  const pending = usePendingCount();

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-xs font-semibold text-brand-600">Hikmah Tutors</p>
          <h1 className="text-lg leading-tight font-semibold text-slate-900">লিড ({bn(leads.length)})</h1>
        </div>
        <Link
          to="/admin/quick"
          className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
        >
          + নতুন
        </Link>
      </header>

      {pending > 0 && (
        <p className="mx-4 mt-4 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
          ⏳ এই ফোনে {bn(pending)}টি লিড এখনো সার্ভারে যায়নি। নেট এলে Quick Pad খুললেই চলে যাবে।
        </p>
      )}

      {leads.length === 0 ? (
        <div className="px-6 pt-20 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-xl bg-brand-50 text-3xl">📒</div>
          <p className="mt-4 font-semibold text-slate-900">এখনো কোনো লিড নেই</p>
          <p className="mt-1 text-slate-600">কলের সময় Quick Pad থেকে প্রথম লিডটি লেখো।</p>
        </div>
      ) : (
        <ul className="space-y-3 px-4 pt-4">
          {leads.map((l) => {
            const subjects = (l.subjects ?? "")
              .split(",")
              .filter(Boolean)
              .map((s) => labelOf(SUBJECTS, s))
              .join(", ");
            const details = [
              l.student_gender && labelOf(STUDENT_GENDERS, l.student_gender),
              labelOf(MEDIUMS, l.medium),
              subjects,
              l.tutor_gender && `টিউটর: ${labelOf(TUTOR_GENDERS, l.tutor_gender)}`,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={l.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {labelOf(CLASS_LEVELS, l.class_level)} · {labelOf(AREAS, l.area)}
                    </p>
                    {details && <p className="mt-0.5 text-sm text-slate-600">{details}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                    {labelOf(STATUSES, l.status)}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-700">
                  {l.salary ? `৳${bn(l.salary)}/মাস` : "বেতন বলা হয়নি"}
                  {l.days_per_week ? ` · সপ্তাহে ${bn(l.days_per_week)} দিন` : ""}
                </p>
                {l.address && <p className="mt-1 text-sm text-slate-600">📍 {l.address}</p>}
                {l.notes && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{l.notes}</p>}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 text-sm text-slate-500">
                    {l.guardian_name && <span className="font-semibold text-slate-700">{l.guardian_name} · </span>}
                    {when(l.created_at)}
                    {l.lead_source && ` · ${labelOf(LEAD_SOURCES, l.lead_source)}`}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`tel:${l.phone}`}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-slate-50"
                    >
                      📞 কল
                    </a>
                    <a
                      href={`https://wa.me/88${l.phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-slate-50"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
