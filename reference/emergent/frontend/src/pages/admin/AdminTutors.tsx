import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Search } from "lucide-react";
import { adminApi } from "../../api/client";
import { useI18n } from "../../i18n";
import { optLabel } from "../../lib/options";
import { Card, Empty, Loading, PanelTitle, inputCls } from "../../components/panel/ui";

export default function AdminTutors() {
  const { lang } = useI18n();
  const [text, setText] = useState("");
  const [qText, setQText] = useState("");
  const [shown, setShown] = useState<Record<string, string>>({});
  const q = useQuery({ queryKey: ["admin-tutors", qText], queryFn: () => adminApi.tutors(qText) });
  const reveal = async (id: string) => {
    const r = await adminApi.revealPhone(id);
    setShown((s) => ({ ...s, [id]: r.phone }));
  };
  return (
    <div data-testid="admin-tutors">
      <PanelTitle title="টিউটর ডিরেক্টরি" sub="ফোন নম্বর লুকানো থাকে। 'দেখুন' চাপলে অডিট লগে লেখা হয়।" />
      <form className="relative mb-4" onSubmit={(e) => { e.preventDefault(); setQText(text.trim()); }}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
        <input className={`${inputCls} pl-11`} value={text} onChange={(e) => setText(e.target.value)} placeholder="নাম, প্রতিষ্ঠান বা ফোন দিয়ে খুঁজুন" data-testid="tutors-search" />
      </form>
      {q.isPending ? <Loading /> : (q.data?.items.length ?? 0) === 0 ? <Empty text="কোনো টিউটর পাওয়া যায়নি।" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {q.data!.items.map((tu) => (
            <Card key={tu.id} testId={`tutor-row-${tu.id}`}>
              <div className="flex items-start gap-3">
                <span className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center font-bold text-white ${tu.gender === "female" ? "bg-rose-600" : "bg-blue-600"}`} aria-hidden>{(tu.full_name || "?").slice(0, 1)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-forest truncate">{tu.full_name}</p>
                  <p className="text-sm text-slate-600 truncate">{tu.institution} · {optLabel("tutor_genders", tu.gender, lang)}</p>
                  <p className="text-xs text-slate-500 mt-1">{(tu.subjects || []).map((s: string) => optLabel("subjects", s, lang)).join(", ")}</p>
                  <p className="text-xs text-slate-500">{(tu.class_levels || []).map((s: string) => optLabel("class_levels", s, lang)).join(", ")}</p>
                  <p className="text-xs text-slate-500">{(tu.areas || []).map((s: string) => optLabel("areas", s, lang)).join(", ")}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="tabular-nums font-semibold" data-testid={`tutor-phone-${tu.id}`}>{shown[tu.id] || tu.phone_masked}</span>
                    {!shown[tu.id] && <button className="min-h-[40px] px-3 rounded-xl font-bold text-brand-700 hover:bg-brand-50 inline-flex items-center gap-1" onClick={() => reveal(tu.id)} data-testid={`tutor-reveal-${tu.id}`}><Eye size={15} aria-hidden /> দেখুন</button>}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tu.claim_status === "claimed" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"}`}>{tu.claim_status === "claimed" ? "সক্রিয়" : "আনক্লেইমড"}</span>
                    {tu.availability_paused && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">বিরতি</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
