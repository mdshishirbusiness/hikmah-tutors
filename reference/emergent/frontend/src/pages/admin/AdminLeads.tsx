import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { adminApi } from "../../api/client";
import { useI18n } from "../../i18n";
import { optLabel } from "../../lib/options";
import { timeAgo } from "../../lib/format";
import { Card, ConfirmAction, Empty, LegacyFlag, Loading, PanelTitle, StatusPill } from "../../components/panel/ui";
import { Chip } from "../../components/Chip";
import { ErrorState } from "../../components/States";

const FILTERS: [string, string][] = [["", "সব"], ["new", "নতুন"], ["contacted", "যোগাযোগ হয়েছে"], ["converted", "টিউশন হয়েছে"], ["discarded", "বাতিল"]];

export default function AdminLeads() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") || "";
  const [discardId, setDiscardId] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["admin-leads", status], queryFn: () => adminApi.leads(status) });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => adminApi.patchLead(id, body),
    onSuccess: () => { setDiscardId(null); toast.success("আপডেট হয়েছে"); qc.invalidateQueries({ queryKey: ["admin-leads"] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: () => toast.error("আপডেট করা যায়নি। আবার চেষ্টা করুন।"),
  });
  const convert = useMutation({ mutationFn: adminApi.convertLead, onSuccess: (r) => { toast.success(`HTR-${r.code} খসড়া তৈরি`); nav(`/admin/tuitions/${r.code}`); } });
  return (
    <div data-testid="admin-leads">
      <PanelTitle title="লিড" sub="Quick Pad ও ওয়েব ফর্মের সব লিড, নতুন আগে।" />
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map(([k, l]) => <Chip key={k} active={status === k} onClick={() => setSp(k ? { status: k } : {})} testId={`leads-filter-${k || "all"}`}>{l}</Chip>)}
      </div>
      {q.isPending ? <Loading /> : q.isError ? <ErrorState title={lang === "bn" ? "লিড লোড করা যায়নি" : "Could not load leads"} retry={() => q.refetch()} retryLabel={t("error.retry")} /> : (q.data?.items.length ?? 0) === 0 ? <Empty text="কোনো লিড নেই।" /> : (
        <div className="space-y-3">
          {q.data!.items.map((l) => (
            <Card key={l.id} testId={`lead-${l.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-forest">{l.guardian_name || "নাম নেই"} · <span className="tabular-nums">{l.phone}</span></p>
                  <p className="text-sm text-slate-700 flex flex-wrap items-center gap-1.5">
                    {optLabel("class_levels", l.class_level, lang)} {l.legacy_class && <LegacyFlag />} · {(l.subjects || []).map((s: string) => optLabel("subjects", s, lang)).join(", ") || "বিষয় নেই"} · {optLabel("areas", l.area, lang)}
                  </p>
                  <p className="text-xs text-slate-500">{l.channel === "quickpad" ? "Quick Pad" : "ওয়েব ফর্ম"} · {timeAgo(l.created_at, lang, t)} {l.tutor_gender && l.tutor_gender !== "any" ? `· ${optLabel("tutor_genders", l.tutor_gender, lang)} টিউটর` : ""}</p>
                  {l.notes && <p className="mt-1 text-sm text-slate-600">“{l.notes}”</p>}
                  {l.duplicate_count > 0 && <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-orange-800" data-testid={`lead-dup-${l.id}`}><AlertTriangle size={14} aria-hidden /> একই নম্বরে আরও {l.duplicate_count}টি লিড আছে</p>}
                </div>
                <StatusPill kind="lead" status={l.status} testId={`lead-status-${l.id}`} />
              </div>
              {l.status !== "converted" && l.status !== "discarded" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {l.status === "new" && <button className="min-h-[44px] px-3 rounded-xl text-sm font-bold bg-brand-50 text-forest hover:bg-brand-100" onClick={() => patch.mutate({ id: l.id, body: { status: "contacted" } })} data-testid={`lead-contacted-${l.id}`}>যোগাযোগ হয়েছে</button>}
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">ফলো-আপ
                    <input type="date" className="min-h-[44px] rounded-xl border border-slate-300 px-2" defaultValue={(l.next_follow_up_at || "").slice(0, 10)}
                      onChange={(e) => patch.mutate({ id: l.id, body: { next_follow_up_at: e.target.value ? new Date(`${e.target.value}T09:00:00`).toISOString() : "", status: "contacted" } })} data-testid={`lead-followup-${l.id}`} />
                  </label>
                  <button className="min-h-[44px] px-3 rounded-xl text-sm font-bold bg-brand-600 text-white hover:bg-brand-700" onClick={() => convert.mutate(l.id)} data-testid={`lead-convert-${l.id}`}>টিউশন বানান</button>
                  <button className="min-h-[44px] px-3 rounded-xl text-sm font-bold text-red-700 hover:bg-red-50" onClick={() => setDiscardId(l.id)} data-testid={`lead-discard-${l.id}`}>বাতিল</button>
                </div>
              )}
              {l.converted_tuition_code && <button className="mt-2 text-sm font-bold text-brand-700 min-h-[44px]" onClick={() => nav(`/admin/tuitions/${l.converted_tuition_code}`)} data-testid={`lead-open-tuition-${l.id}`}>HTR-{l.converted_tuition_code} খুলুন →</button>}
            </Card>
          ))}
        </div>
      )}
      <ConfirmAction open={!!discardId} onClose={() => setDiscardId(null)} onConfirm={() => discardId && patch.mutate({ id: discardId, body: { status: "discarded" } })} busy={patch.isPending} title="লিডটি বাতিল করবেন?" description="লিডটি বাতিল তালিকায় চলে যাবে। যোগাযোগের আগে নাম ও নম্বর আবার মিলিয়ে নিন।" confirmLabel="হ্যাঁ, বাতিল করুন" testId="discard-lead" />
    </div>
  );
}
