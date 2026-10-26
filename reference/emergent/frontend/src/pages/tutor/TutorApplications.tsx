import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { tutorApi } from "../../api/client";
import { useI18n } from "../../i18n";
import { optLabel } from "../../lib/options";
import { fmtDate, timeAgo } from "../../lib/format";
import { useTutorId } from "../../lib/tutorSession";
import { Card, ConfirmAction, Empty, Loading, PanelTitle, StatusPill } from "../../components/panel/ui";
import { Button } from "../../components/Button";
import { ErrorState } from "../../components/States";

const STEPS = ["submitted", "under_review", "shortlisted", "trial_arranged", "confirmed"];
const STEP_LABEL = ["জমা", "পর্যালোচনা", "শর্টলিস্ট", "ট্রায়াল", "কনফার্ম"];
const GROUPS = { active: ["submitted", "under_review", "shortlisted", "trial_arranged"], confirmed: ["confirmed"], closed: ["not_selected", "withdrawn", "opportunity_closed"] };
const NEXT: Record<string, string> = {
  submitted: "HTR আপনার আবেদন পর্যালোচনা করবে।", under_review: "অভিভাবকের সাথে কথা বলে শর্টলিস্ট করা হবে।",
  shortlisted: "ট্রায়াল ক্লাসের সময় জানানো হবে।", trial_arranged: "ট্রায়ালের পর কনফার্মেশন।", confirmed: "অভিনন্দন! HTR ফোনে বিস্তারিত জানাবে।",
};

function Timeline({ a }: { a: any }) {
  const { lang } = useI18n();
  const reached = new Map<string, string>(a.events.map((e: any) => [e.to_status, e.at]));
  const idx = STEPS.indexOf(a.status);
  return (
    <ol className="mt-4 grid grid-cols-5 gap-1" data-testid={`timeline-${a.id}`}>
      {STEPS.map((s, i) => {
        const on = reached.has(s) || (idx >= 0 && i <= idx);
        return (
          <li key={s} className="flex flex-col items-center text-center">
            <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"}`}>{on ? <Check size={16} aria-hidden /> : i + 1}</span>
            <span className={`mt-1 text-[11px] font-semibold ${on ? "text-forest" : "text-slate-400"}`}>{STEP_LABEL[i]}</span>
            {reached.get(s) && <span className="text-[10px] text-slate-500">{fmtDate(reached.get(s)!, lang)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export default function TutorApplications() {
  const { t, lang } = useI18n();
  const tid = useTutorId();
  const qc = useQueryClient();
  const [tab, setTab] = useState<keyof typeof GROUPS>("active");
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["my-applications", tid], queryFn: tutorApi.applications });
  const wd = useMutation({
    mutationFn: tutorApi.withdraw,
    onSuccess: () => { setWithdrawId(null); toast.success("আবেদন তুলে নেওয়া হয়েছে"); qc.invalidateQueries({ queryKey: ["my-applications"] }); },
    onError: () => toast.error("তুলে নেওয়া যায়নি"),
  });
  const items = (q.data?.items || []).filter((a) => GROUPS[tab].includes(a.status));
  const tabs: [keyof typeof GROUPS, string][] = [["active", "চলমান"], ["confirmed", "কনফার্মড"], ["closed", "বন্ধ"]];
  return (
    <div data-testid="tutor-applications">
      <PanelTitle title="আমার আবেদন" sub="রিভিউ থেকে কনফার্মেশন—প্রতিটি ধাপ ও পরবর্তী করণীয় এক জায়গায়।" />
      <div className="flex flex-wrap gap-2 mb-5" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`apps-tab-${k}`}
            className={`min-h-[44px] px-4 rounded-full text-sm font-bold border transition-colors ${tab === k ? "bg-forest text-cream border-forest" : "bg-white text-forest border-brand-100"}`}>
            {l} ({(q.data?.items || []).filter((a) => GROUPS[k].includes(a.status)).length})
          </button>
        ))}
      </div>
      {q.isPending ? <Loading /> : q.isError ? <ErrorState title={lang === "bn" ? "আবেদন লোড করা যায়নি" : "Could not load applications"} retry={() => q.refetch()} retryLabel={t("error.retry")} /> : items.length === 0 ? <Empty text="এই ভাগে কোনো আবেদন নেই।" testId="apps-empty" /> : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} testId={`my-app-${a.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link to={`/tuitions/HTR-${a.tuition_code}`} className="font-bold text-forest hover:underline" data-testid={`my-app-link-${a.id}`}>HTR-{a.tuition_code}</Link>
                  <p className="text-sm text-slate-700">{optLabel("class_levels", a.tuition.class_level, lang)} · {(a.tuition.subjects || []).map((s: string) => optLabel("subjects", s, lang)).join(", ")} · {optLabel("areas", a.tuition.area, lang)}</p>
                  <p className="text-xs text-slate-500">শেষ পরিবর্তন: {timeAgo(a.updated_at, lang, t)}</p>
                </div>
                <StatusPill kind="application" status={a.status} testId={`my-app-status-${a.id}`} />
              </div>
              {GROUPS.active.includes(a.status) || a.status === "confirmed" ? <Timeline a={a} /> : null}
              {NEXT[a.status] && <p className="mt-3 text-sm text-slate-700"><b>এরপর:</b> {NEXT[a.status]}</p>}
              {GROUPS.active.includes(a.status) && (
                <Button variant="ghost" className="mt-2 text-red-700 hover:bg-red-50" data-testid={`my-app-withdraw-${a.id}`}
                  onClick={() => setWithdrawId(a.id)}>আবেদন তুলে নিন</Button>
              )}
            </Card>
          ))}
        </div>
      )}
      <ConfirmAction open={!!withdrawId} onClose={() => setWithdrawId(null)} onConfirm={() => withdrawId && wd.mutate(withdrawId)} busy={wd.isPending} title="আবেদনটি তুলে নেবেন?" description="এই আবেদনটি আর চলমান তালিকায় থাকবে না। আগের ধাপগুলো বন্ধ আবেদনে দেখা যাবে।" confirmLabel="হ্যাঁ, তুলে নিন" testId="withdraw-application" />
    </div>
  );
}
