import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, Circle, Bookmark, ListChecks } from "lucide-react";
import { useI18n } from "../../i18n";
import { ErrorState } from "../../components/States";
import { tutorApi } from "../../api/client";
import { useMe } from "../../lib/useSaved";
import { useTutorId } from "../../lib/tutorSession";
import { TuitionCard } from "../../components/TuitionCard";
import { Card, Empty, Loading } from "../../components/panel/ui";
import { linkButton } from "../../components/Button";
import { useShare } from "./useShare";

const CHECK_LABEL: Record<string, string> = {
  name: "নাম", phone: "মোবাইল", gender: "লিঙ্গ", institution: "প্রতিষ্ঠান", subjects_classes: "বিষয় ও ক্লাস", areas: "পছন্দের এলাকা",
};

export default function TutorHome() {
  const { t, lang, n } = useI18n();
  const tid = useTutorId();
  const me = useMe();
  const sug = useQuery({ queryKey: ["suggested", tid], queryFn: tutorApi.suggested });
  const onShare = useShare();
  if (me.isPending) return <Loading />;
  if (me.isError) return <ErrorState title={t("error.title")} sub={t("error.sub")} retry={() => me.refetch()} retryLabel={t("error.retry")} />;
  const list = Object.entries(me.data?.checklist || {});
  const done = list.filter(([, v]) => v).length;
  return (
    <div className="space-y-8" data-testid="tutor-home">
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <Card testId="tutor-checklist">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-semibold text-brand-700">{lang === "bn" ? "আপনার প্রস্তুতি" : "YOUR PROFILE"}</p><h1 className="mt-2 text-2xl sm:text-3xl font-bold text-forest">{done === list.length ? (lang === "bn" ? "আবেদনের জন্য প্রস্তুত!" : "Ready for your next tuition!") : (lang === "bn" ? "প্রোফাইলটি সম্পূর্ণ করুন" : "Let's complete your profile")}</h1><p className="mt-2 text-sm text-slate-500" data-testid="tutor-profile-completion">{n(done)}/{n(list.length)} {lang === "bn" ? "তথ্য সম্পূর্ণ" : "details completed"}</p></div>
          <Link to="/tutor/profile" className={linkButton("secondary", "rounded-xl text-sm")} data-testid="tutor-edit-profile">{lang === "bn" ? "প্রোফাইল এডিট" : "Edit profile"}</Link>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-brand-50" role="progressbar" aria-label={lang === "bn" ? "প্রোফাইল সম্পূর্ণতা" : "Profile completion"} aria-valuemin={0} aria-valuemax={list.length} aria-valuenow={done} data-testid="tutor-completion-progress"><div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${list.length ? done / list.length * 100 : 0}%` }} /></div>
        <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {list.map(([k, v]) => (
            <li key={k} className={`flex items-center gap-2 text-sm font-semibold ${v ? "text-brand-700" : "text-slate-500"}`} data-testid={`check-${k}`}>
              {v ? <CheckCircle2 size={18} aria-hidden /> : <Circle size={18} aria-hidden />} {CHECK_LABEL[k] || k} <span className="sr-only">{v ? "সম্পূর্ণ" : "বাকি"}</span>
            </li>
          ))}
        </ul>
      </Card>
      <div className="rounded-2xl bg-forest p-6 text-cream flex flex-col justify-between gap-5" data-testid="tutor-shortcuts"><div><p className="text-xs font-semibold text-brand-200">{lang === "bn" ? "আপনার শেখানোর যাত্রা" : "YOUR TEACHING JOURNEY"}</p><p className="mt-3 text-base font-semibold">{lang === "bn" ? "পছন্দের সুযোগ হাতছাড়া নয়।" : "Keep your next opportunity close."}</p></div><div className="space-y-1"><Link to="/tutor/saved" className="flex min-h-12 items-center justify-between gap-2 border-b border-white/10 py-2 text-sm hover:text-mango transition-colors" data-testid="tutor-saved-shortcut"><span className="flex items-center gap-2"><Bookmark size={17} />{lang === "bn" ? "সেভ করা টিউশন" : "Saved tuitions"}</span><span data-testid="tutor-saved-count">{n(me.data?.saved_codes.length || 0)}</span></Link><Link to="/tutor/applications" className="flex min-h-12 items-center justify-between gap-2 py-2 text-sm hover:text-mango transition-colors" data-testid="tutor-applications-shortcut"><span className="flex items-center gap-2"><ListChecks size={17} />{lang === "bn" ? "আবেদনের অগ্রগতি" : "Application progress"}</span><ArrowUpRight size={17} /></Link></div></div>
      </div>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4"><h2 className="text-base md:text-lg font-bold text-forest">{lang === "bn" ? "আপনার সাথে মিলে যাওয়া টিউশন" : "Tuitions that match your profile"}</h2><Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700" data-testid="tutor-browse-board">{lang === "bn" ? "সব টিউশন" : "All tuitions"}<ArrowUpRight size={16} /></Link></div>
        {sug.isPending ? <Loading /> : sug.isError ? <ErrorState title={t("error.title")} sub={t("error.sub")} retry={() => sug.refetch()} retryLabel={t("error.retry")} /> : (sug.data?.items.length ?? 0) === 0 ? (
          <Empty text="আপনার এলাকা/ক্লাস/বিষয়ের সাথে মেলে এমন টিউশন এখন নেই। বোর্ডে সব টিউশন দেখুন।" testId="tutor-suggested-empty" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="tutor-suggested-grid">
            {sug.data!.items.map((t, i) => <TuitionCard key={t.code} t={t} index={i} onShare={onShare} />)}
          </div>
        )}
      </section>
    </div>
  );
}
