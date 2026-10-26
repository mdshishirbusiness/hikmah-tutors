import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/client";
import { useI18n } from "../../i18n";
import { optLabel, optList } from "../../lib/options";
import { Card, Empty, Loading, PanelTitle } from "../../components/panel/ui";
import { Chip } from "../../components/Chip";
import { Button } from "../../components/Button";
import { ApplicationRow } from "./ApplicationRow";
import { ErrorState } from "../../components/States";

function Compare({ items }: { items: any[] }) {
  const { lang } = useI18n();
  const rows: [string, (a: any) => string][] = [
    ["প্রতিষ্ঠান", (a) => `${a.tutor.institution || ""}${a.tutor.department ? `, ${a.tutor.department}` : ""}`],
    ["বিষয়", (a) => a.tutor.subjects.map((s: string) => optLabel("subjects", s, lang)).join(", ")],
    ["ক্লাস", (a) => a.tutor.class_levels.map((c: string) => optLabel("class_levels", c, lang)).join(", ")],
    ["এলাকা", (a) => a.tutor.areas.map((c: string) => optLabel("areas", c, lang)).join(", ")],
    ["অভিজ্ঞতা", (a) => a.tutor.experience_note || "—"],
    ["নোট", (a) => a.note || "—"],
  ];
  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white" data-testid="compare-view">
      <table className="w-full text-sm">
        <thead><tr className="bg-brand-50"><th className="p-3 text-left text-slate-600">তুলনা</th>{items.map((a) => <th key={a.id} className="p-3 text-left text-forest min-w-[180px]" scope="col" data-testid={`compare-tutor-${a.id}`}>{a.tutor.full_name}<span className="block text-xs font-semibold text-slate-500">HTR-{a.tuition_code} · {optLabel("application_statuses", a.status, lang)}</span></th>)}</tr></thead>
        <tbody>{rows.map(([l, f]) => <tr key={l} className="border-t border-brand-100"><td className="p-3 font-semibold text-slate-600">{l}</td>{items.map((a) => <td key={a.id} className="p-3 align-top">{f(a)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function AdminApplications() {
  const { lang } = useI18n();
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") || "";
  const code = sp.get("code") ? Number(sp.get("code")) : undefined;
  const [sel, setSel] = useState<string[]>([]);
  const [compare, setCompare] = useState(false);
  useEffect(() => { setSel([]); setCompare(false); }, [status, code]);
  const q = useQuery({ queryKey: ["admin-applications", status, code], queryFn: () => adminApi.applications(status, code) });
  const items = q.data?.items || [];
  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 5 ? p : [...p, id]));
  return (
    <div data-testid="admin-applications">
      <PanelTitle title={code ? `আবেদন — HTR-${code}` : "সব আবেদন"} sub="২–৫টি আবেদন বেছে নিয়ে যোগ্যতা পাশাপাশি তুলনা করুন। চূড়ান্ত সিদ্ধান্ত আপনার।"
        actions={<Button variant="mango" disabled={sel.length < 2} onClick={() => setCompare((c) => !c)} data-testid="apps-compare-toggle">{compare ? "তালিকা দেখুন" : `তুলনা (${sel.length}/5)`}</Button>} />
      <div className="flex flex-wrap gap-2 mb-5" data-testid="apps-status-filters">
        <Chip active={!status} onClick={() => setSp(code ? { code: String(code) } : {})} testId="apps-filter-all">সব</Chip>
        {optList("application_statuses").map((s) => <Chip key={s.key} active={status === s.key} onClick={() => setSp({ status: s.key, ...(code ? { code: String(code) } : {}) })} testId={`apps-filter-${s.key}`}>{lang === "bn" ? s.label : s.label_en}</Chip>)}
      </div>
      {sel.length > 0 && <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2 flex flex-wrap items-center justify-between gap-2" data-testid="apps-selection-bar"><p className="text-sm font-semibold text-forest" data-testid="apps-selection-count">{lang === "bn" ? `${sel.length}টি বাছাই করা হয়েছে · সর্বোচ্চ ৫টি` : `${sel.length} selected · maximum 5`}</p><button type="button" onClick={() => { setSel([]); setCompare(false); }} className="min-h-11 text-sm font-semibold text-brand-700 hover:underline" data-testid="apps-clear-selection">{lang === "bn" ? "বাছাই মুছুন" : "Clear selection"}</button></div>}
      {q.isPending ? <Loading /> : q.isError ? <ErrorState title={lang === "bn" ? "আবেদন লোড করা যায়নি" : "Could not load applications"} retry={() => q.refetch()} retryLabel={lang === "bn" ? "আবার চেষ্টা করুন" : "Try again"} /> : items.length === 0 ? <Empty text="কোনো আবেদন নেই।" /> : compare ? <Compare items={items.filter((a) => sel.includes(a.id))} /> : (
        <Card>{items.map((a) => <ApplicationRow key={a.id} a={a} selectable selected={sel.includes(a.id)} onSelect={() => toggle(a.id)} />)}</Card>
      )}
    </div>
  );
}
