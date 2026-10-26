import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, ClipboardList, FileText, Inbox, CalendarClock, ListChecks, ChevronDown, Sparkles } from "lucide-react";
import { ErrorState } from "../../components/States";
import { adminApi } from "../../api/client";
import { useI18n } from "../../i18n";
import { optLabel } from "../../lib/options";
import { timeAgo } from "../../lib/format";
import { Card, Empty, LegacyFlag, Loading, PanelTitle } from "../../components/panel/ui";
import { linkButton } from "../../components/Button";

function Stat({ label, value, to, id }: { label: string; value: number; to: string; id: string }) {
  const { n } = useI18n();
  const Icon = { open: ClipboardList, apps: FileText, leads: Inbox, followups: CalendarClock, flagged: ListChecks }[id] || ClipboardList;
  const primary = id === "open";
  return <Link to={to} className={`group rounded-2xl border p-4 sm:p-5 transition-[border-color,box-shadow] hover:shadow-md ${primary ? "bg-forest border-forest text-cream" : "bg-white border-brand-100 text-forest hover:border-brand-200"}`} data-testid={`stat-${id}`}><div className="flex items-center justify-between"><Icon size={19} className={primary ? "text-brand-200" : "text-brand-600"} aria-hidden /><ArrowUpRight size={15} className={primary ? "text-brand-200" : "text-slate-400"} aria-hidden /></div><p className="mt-4 text-3xl font-bold tabular-nums" data-testid={`stat-value-${id}`}>{n(value)}</p><p className={`mt-1 text-xs font-semibold ${primary ? "text-brand-200" : "text-slate-500"}`}>{label}</p></Link>;
}

function PremiumRoadmap() {
  const { lang } = useI18n();
  const bn = lang === "bn";
  const terms = bn ? [
    ["সফলতা", "প্রস্তাব: একটি কনফার্মড টিউশন, যেখানে টিউটর প্রথম বেতন পেয়েছেন।"],
    ["উপযুক্ত টিউশন", "আগে সম্মত এলাকা, বিষয়, সময়সূচি ও ন্যূনতম বেতন মিলতে হবে।"],
    ["তিন মাসের সময়সীমা", "কখন শুরু হবে, টিউটর অফার না নিলে বা অভিভাবক বাতিল করলে কী হবে—নির্ধারণ বাকি।"],
    ["রিফান্ড", "কারা পাবেন, কীভাবে আবেদন করবেন ও কত দিনের মধ্যে ফেরত দেবেন—লিখিত নিয়ম দরকার।"],
  ] : [
    ["Success", "Proposed: one confirmed tuition where the tutor has received their first salary."],
    ["Suitable placement", "Match the agreed area, subjects, schedule and minimum tuition salary."],
    ["Three-month window", "Decide the start date and rules for declined offers or guardian cancellations."],
    ["Refunds", "Define eligibility, the request process and a firm repayment deadline in writing."],
  ];
  return <section className="mt-8 overflow-hidden rounded-2xl border border-brand-100 bg-white" data-testid="premium-planning">
    <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mango/30 text-forest"><Sparkles size={19} aria-hidden /></span><div><h2 className="text-base md:text-lg font-bold text-forest">{bn ? "প্রিমিয়াম পরিকল্পনা" : "Premium planning"}</h2><p className="text-xs text-slate-500">{bn ? "ব্যবসার পরবর্তী ধাপ — এখন বিক্রি নয়" : "Your next business step — not an active offer"}</p></div></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600" data-testid="premium-unpublished">{bn ? "অপ্রকাশিত প্রস্তাব" : "Unpublished proposal"}</span></div>
    <div className="mx-5 sm:mx-6 mb-4 border-l-2 border-mango pl-4 text-sm text-slate-600" data-testid="premium-priority">{bn ? "আগে কাজ করুন: সুরক্ষিত অ্যাকাউন্ট → প্লেসমেন্ট ও বকেয়া ফি ট্র্যাকার → সীমিত প্রিমিয়াম পাইলট। পেমেন্ট নেওয়ার আগে রিফান্ড দেওয়ার সক্ষমতা নিশ্চিত করুন।" : "Work on this first: protected accounts → placement and overdue-fee tracking → a limited premium pilot. Keep enough funds available for refunds before taking payments."}</div>
    <details className="group border-t border-brand-100" data-testid="premium-terms-draft"><summary className="min-h-14 px-5 sm:px-6 flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-forest hover:bg-brand-50 transition-colors [&::-webkit-details-marker]:hidden" data-testid="premium-planning-toggle">{bn ? "চালুর আগে ৪টি সিদ্ধান্ত নিন" : "Four decisions to make before launch"}<ChevronDown size={18} className="transition-transform group-open:rotate-180" aria-hidden /></summary><div className="px-5 sm:px-6 pt-5 pb-6 grid gap-5 sm:grid-cols-2">{terms.map(([title, body], i) => <div key={title} data-testid={`premium-draft-term-${i + 1}`}><h3 className="text-sm font-bold text-forest">{title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-500">{body}</p></div>)}</div><p className="px-5 sm:px-6 pb-5 text-xs text-slate-500" data-testid="premium-draft-disclaimer">{bn ? "মূল্য ও শর্ত চূড়ান্ত নয়। কোনো সাবস্ক্রিপশন, পেমেন্ট বা গ্যারান্টি চালু করা হয়নি।" : "Price and terms are not final. No subscription, payment or guarantee is active."}</p></details>
  </section>;
}

export default function AdminQueue() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-overview"], queryFn: adminApi.overview });
  const contacted = useMutation({
    mutationFn: (id: string) => adminApi.patchLead(id, { status: "contacted" }),
    onSuccess: () => { toast.success("যোগাযোগ হয়েছে হিসেবে চিহ্নিত"); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
  });
  const convert = useMutation({ mutationFn: adminApi.convertLead, onSuccess: (r) => nav(`/admin/tuitions/${r.code}`) });
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorState title={t("error.title")} sub={t("error.sub")} retry={() => q.refetch()} retryLabel={t("error.retry")} />;
  const d = q.data!;
  const row = "flex flex-wrap items-center justify-between gap-2 py-3 border-b border-brand-100 last:border-0";
  return (
    <div data-testid="admin-queue">
      <PanelTitle title={lang === "bn" ? "আজকের কাজ, এক নজরে" : "Your day, at a glance"} sub={lang === "bn" ? "নতুন আবেদন দেখুন, অভিভাবকের সাথে কথা বলুন, পরের ধাপ ঠিক করুন।" : "Review applications, follow up with families and keep placements moving."} actions={<Link to="/admin/quick" className={linkButton("mango", "rounded-xl")} data-testid="queue-quickpad">+ {lang === "bn" ? "নতুন লিড" : "New lead"}</Link>} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat id="open" label="খোলা টিউশন" value={d.counts.open_tuitions} to="/admin/tuitions?status=available" />
        <Stat id="apps" label="নতুন আবেদন" value={d.counts.applications_waiting} to="/admin/applications?status=submitted" />
        <Stat id="leads" label="নতুন লিড" value={d.counts.new_leads} to="/admin/leads?status=new" />
        <Stat id="followups" label="আজ ফলো-আপ" value={d.counts.follow_ups_due} to="/admin/leads?status=contacted" />
        <Stat id="flagged" label="রেঞ্জ ক্লাস ঠিক করুন" value={d.counts.flagged_classes} to="/admin/tuitions" />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card testId="queue-new-applications">
          <h2 className="font-bold text-forest">নতুন আবেদন</h2>
          {d.new_applications.length === 0 ? <p className="text-sm text-slate-500 mt-2">কিছু নেই</p> : d.new_applications.map((a: any) => (
            <div key={a.id} className={row}>
              <span className="text-sm"><b>{a.tutor_name}</b> → HTR-{a.tuition_code} · {timeAgo(a.created_at, lang, t)}</span>
              <Link to={`/admin/applications?code=${a.tuition_code}`} className="text-sm font-bold text-brand-700 min-h-[44px] inline-flex items-center" data-testid={`queue-review-${a.id}`}>রিভিউ করুন</Link>
            </div>
          ))}
        </Card>
        <Card testId="queue-new-leads">
          <h2 className="font-bold text-forest">নতুন লিড — এখনো যোগাযোগ হয়নি</h2>
          {d.new_leads.length === 0 ? <p className="text-sm text-slate-500 mt-2">কিছু নেই</p> : d.new_leads.map((l: any) => (
            <div key={l.id} className={row}>
              <span className="text-sm"><b>{l.guardian_name || l.phone}</b> · {optLabel("class_levels", l.class_level, lang)} · {optLabel("areas", l.area, lang)}</span>
              <span className="flex gap-1">
                <button className="min-h-[44px] px-3 rounded-xl text-sm font-bold text-forest hover:bg-brand-50" onClick={() => contacted.mutate(l.id)} data-testid={`queue-contacted-${l.id}`}>যোগাযোগ হয়েছে</button>
                <button className="min-h-[44px] px-3 rounded-xl text-sm font-bold bg-brand-600 text-white hover:bg-brand-700" onClick={() => convert.mutate(l.id)} data-testid={`queue-convert-${l.id}`}>টিউশন বানান</button>
              </span>
            </div>
          ))}
        </Card>
        <Card testId="queue-followups">
          <h2 className="font-bold text-forest">আজকের ফলো-আপ</h2>
          {d.follow_ups.length === 0 ? <p className="text-sm text-slate-500 mt-2">কিছু নেই</p> : d.follow_ups.map((l: any) => (
            <div key={l.id} className={row}><span className="text-sm"><b>{l.guardian_name || l.phone}</b> · {optLabel("class_levels", l.class_level, lang)}</span><Link to="/admin/leads" className="inline-flex min-h-11 items-center text-sm font-bold text-brand-700" data-testid={`queue-followup-${l.id}`}>দেখুন</Link></div>
          ))}
        </Card>
        <Card testId="queue-flagged">
          <h2 className="font-bold text-forest">রেঞ্জ ক্লাস (যেমন ১ম–৫ম) — নির্দিষ্ট ক্লাস দিন</h2>
          {d.flagged.length === 0 ? <p className="text-sm text-slate-500 mt-2">সব ঠিক আছে</p> : d.flagged.map((tu: any) => (
            <div key={tu.code} className={row}>
              <span className="text-sm inline-flex items-center gap-2"><b>{tu.code_label}</b> {optLabel("class_levels", tu.class_level, lang)} <LegacyFlag /></span>
              <Link to={`/admin/tuitions/${tu.code}`} className="text-sm font-bold text-brand-700 min-h-[44px] inline-flex items-center" data-testid={`queue-fix-${tu.code}`}>ঠিক করুন</Link>
            </div>
          ))}
        </Card>
      </div>
      {!d.new_applications.length && !d.new_leads.length && !d.follow_ups.length && !d.flagged.length && <div className="mt-4"><Empty text="আজকের সব কাজ শেষ!" /></div>}
      <PremiumRoadmap />
    </div>
  );
}
