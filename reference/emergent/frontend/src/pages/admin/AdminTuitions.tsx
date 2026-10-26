import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { adminApi } from "../../api/client";
import { useI18n } from "../../i18n";
import { optLabel, optList } from "../../lib/options";
import { gstyle } from "../../lib/gender";
import { Empty, LegacyFlag, Loading, PanelTitle, StatusPill, inputCls } from "../../components/panel/ui";
import { Chip } from "../../components/Chip";
import { linkButton } from "../../components/Button";

export default function AdminTuitions() {
  const { lang, n } = useI18n();
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") || "";
  const [text, setText] = useState("");
  const [qText, setQText] = useState("");
  const q = useQuery({ queryKey: ["admin-tuitions", status, qText], queryFn: () => adminApi.tuitions(status, qText) });
  return (
    <div data-testid="admin-tuitions">
      <PanelTitle title="টিউশন" actions={<Link to="/admin/tuitions/new" className={linkButton("primary")} data-testid="tuitions-new">+ নতুন টিউশন</Link>} />
      <form className="relative mb-3" onSubmit={(e) => { e.preventDefault(); setQText(text.trim()); }}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
        <input className={`${inputCls} pl-11`} value={text} onChange={(e) => setText(e.target.value)} placeholder="কোড, এলাকা বা ক্লাস দিয়ে খুঁজুন (English)" data-testid="tuitions-search" />
      </form>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
        <Chip active={!status} onClick={() => setSp({})} testId="tuitions-filter-all">সব</Chip>
        {optList("tuition_statuses").map((s) => <Chip key={s.key} active={status === s.key} onClick={() => setSp({ status: s.key })} testId={`tuitions-filter-${s.key}`}>{lang === "bn" ? s.label : s.label_en}</Chip>)}
      </div>
      {q.isPending ? <Loading /> : (q.data?.items.length ?? 0) === 0 ? <Empty text="কোনো টিউশন পাওয়া যায়নি।" /> : (
        <div className="rounded-2xl border border-brand-100 bg-white divide-y divide-brand-100 overflow-hidden">
          {q.data!.items.map((tu) => (
            <Link key={tu.code} to={`/admin/tuitions/${tu.code}`} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50/60 transition-colors" data-testid={`admin-tuition-row-${tu.code}`}>
              <span className={`self-stretch w-1.5 rounded-full ${gstyle(tu.tutor_gender_pref).bar}`} aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-forest flex flex-wrap items-center gap-2">{tu.code_label} · {optLabel("class_levels", tu.class_level, lang)} {tu.legacy_class && <LegacyFlag testId={`legacy-flag-${tu.code}`} />}</p>
                <p className="text-sm text-slate-600 truncate">{tu.subjects.map((s: string) => optLabel("subjects", s, lang)).join(", ")} · {optLabel("areas", tu.area, lang)} · {optLabel("tutor_genders", tu.tutor_gender_pref, lang)} টিউটর</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusPill kind="tuition" status={tu.status} />
                <span className="text-xs text-slate-500">{tu.is_public ? "পাবলিক" : "প্রাইভেট"} · {n(tu.applications_count)} আবেদন</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
