import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { ApiError, adminApi } from "../../api/client";
import { useI18n } from "../../i18n";
import { optLabel, optList } from "../../lib/options";
import { timeAgo, waLink } from "../../lib/format";
import { StatusPill } from "../../components/panel/ui";

export const OWNER_NEXT: Record<string, string[]> = {
  submitted: ["under_review", "not_selected"],
  under_review: ["shortlisted", "not_selected"],
  shortlisted: ["trial_arranged", "not_selected"],
  trial_arranged: ["confirmed", "shortlisted", "not_selected"],
};

const WA_TEMPLATE: Record<string, string> = {
  shortlisted: "আসসালামু আলাইকুম, HTR-{code} টিউশনে আপনি শর্টলিস্টেড হয়েছেন। বিস্তারিত জানাতে শীঘ্রই কল করা হবে। — Hikmah Tutors Rajshahi",
  trial_arranged: "আসসালামু আলাইকুম, HTR-{code} টিউশনের ট্রায়াল ক্লাস ঠিক হয়েছে। সময় ও ঠিকানা ফোনে জানানো হবে। — Hikmah Tutors Rajshahi",
  not_selected: "আসসালামু আলাইকুম, HTR-{code} টিউশনে এবার আপনাকে নির্বাচন করা যায়নি। পরের টিউশনে আবেদন করুন। — Hikmah Tutors Rajshahi",
};

export function ApplicationRow({ a, selectable, selected, onSelect }: { a: any; selectable?: boolean; selected?: boolean; onSelect?: () => void }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const mut = useMutation({
    mutationFn: (to: string) => adminApi.setAppStatus(a.id, { to_status: to, reason_code: to === "not_selected" ? reason || "other" : null }),
    onSuccess: () => { toast.success("স্ট্যাটাস বদলানো হয়েছে"); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof ApiError && e.detail === "tutor_paused" ? "টিউটর বিরতিতে আছেন — শর্টলিস্ট করা যাবে না" : "বদলানো যায়নি"),
  });
  const openWa = async () => {
    const { phone } = await adminApi.revealPhone(a.tutor.id);
    const tpl = (WA_TEMPLATE[a.status] || WA_TEMPLATE.shortlisted).replace("{code}", String(a.tuition_code));
    window.open(waLink(phone, tpl), "_blank", "noopener");
    toast("বার্তা প্রস্তুত করা হয়েছে (পাঠানো হয়েছে কিনা সাইট জানে না)");
  };
  const next = OWNER_NEXT[a.status] || [];
  return (
    <div className="py-4 border-b border-brand-100 last:border-0" data-testid={`app-row-${a.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          {selectable && <input type="checkbox" checked={!!selected} onChange={onSelect} className="mt-1.5 h-5 w-5 accent-brand-600" aria-label="তুলনার জন্য বাছুন" data-testid={`app-select-${a.id}`} />}
          <div className="min-w-0">
            <p className="font-bold text-forest">{a.tutor.full_name} <span className="font-normal text-slate-500 text-sm">· {a.tutor.phone_masked}</span></p>
            <p className="text-sm text-slate-700">{a.tutor.institution}{a.tutor.department ? `, ${a.tutor.department}` : ""} · {optLabel("tutor_genders", a.tutor.gender, lang)}</p>
            <p className="text-xs text-slate-500">HTR-{a.tuition_code} · {optLabel("class_levels", a.tuition.class_level, lang)} · {timeAgo(a.created_at, lang, t)}{a.entered_by_owner ? " · স্টাফ এন্ট্রি" : ""}</p>
            {a.note && <p className="mt-1 text-sm text-slate-600">“{a.note}”</p>}
          </div>
        </div>
        <StatusPill kind="application" status={a.status} testId={`app-status-${a.id}`} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {next.map((to) => (
          <button key={to} disabled={mut.isPending} onClick={() => mut.mutate(to)} data-testid={`app-action-${to}-${a.id}`}
            className={`min-h-[44px] px-3 rounded-xl text-sm font-bold transition-colors ${to === "not_selected" ? "text-red-700 hover:bg-red-50" : to === "confirmed" ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-brand-50 text-forest hover:bg-brand-100"}`}>
            {optLabel("application_statuses", to, lang)}
          </button>
        ))}
        {next.includes("not_selected") && (
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[44px] rounded-xl border border-slate-300 px-2 text-sm" aria-label="কারণ" data-testid={`app-reason-${a.id}`}>
            <option value="">কারণ (না হলে)</option>
            {optList("not_selected_reasons").map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        )}
        <button onClick={openWa} className="min-h-[44px] px-3 rounded-xl text-sm font-bold text-emerald-800 hover:bg-emerald-50 inline-flex items-center gap-1.5" data-testid={`app-wa-${a.id}`}><MessageCircle size={16} aria-hidden /> WhatsApp বার্তা</button>
      </div>
    </div>
  );
}
