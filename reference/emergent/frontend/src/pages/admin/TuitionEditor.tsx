import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Lock, Megaphone, Globe } from "lucide-react";
import { ApiError, adminApi } from "../../api/client";
import { useI18n } from "../../i18n";
import { isLegacyClass, optLabel, optList, options } from "../../lib/options";
import { ClassPicker } from "../../components/ClassPicker";
import { TuitionCard } from "../../components/TuitionCard";
import { Card, ConfirmAction, Field, Loading, OptionChips, PanelTitle, StatusPill, inputCls } from "../../components/panel/ui";
import { Chip } from "../../components/Chip";
import { Button, linkButton } from "../../components/Button";
import { ApplicationRow } from "./ApplicationRow";

const PUB = ["class_level", "medium", "subjects", "area", "mode", "salary_kind", "salary_amount", "salary_period", "days_per_week", "tutor_gender_pref",
  "student_gender", "students_count", "requirements_public", "start_note"];
const PRIV = ["guardian_name", "guardian_phone", "exact_address", "student_label", "private_notes"];
const ERR: Record<string, string> = {
  salary_required: "ফিক্সড বেতনে পরিমাণ দিন (০ নয়)।", invalid_class: "ক্লাস বেছে নিন।", class_and_area_required: "ক্লাস ও এলাকা দিন।",
  invalid_phone: "অভিভাবকের সঠিক মোবাইল নম্বর দিন।", subjects_required: "পাবলিশের আগে বিষয় দিন।", invalid_area: "এলাকা বেছে নিন।",
};

const empty = () => ({ class_level: "", medium: "bangla", subjects: [], area: "", mode: "home", salary_kind: "fixed", salary_amount: "", salary_period: "per_month",
  days_per_week: 3, tutor_gender_pref: "any", student_gender: "", students_count: 1, requirements_public: "", start_note: "",
  guardian_name: "", guardian_phone: "", exact_address: "", student_label: "", private_notes: "" });

export default function TuitionEditor() {
  const { code: raw = "new" } = useParams();
  const isNew = raw === "new";
  const code = Number(raw);
  const { lang } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-tuition", code], queryFn: () => adminApi.tuition(code), enabled: !isNew });
  const [f, setF] = useState<any>(isNew ? empty() : null);
  const [areaQ, setAreaQ] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  useEffect(() => {
    if (q.data) setF({ ...empty(), ...q.data.tuition, ...q.data.private, salary_amount: q.data.tuition.salary_amount ?? "", student_gender: q.data.tuition.student_gender || "" });
  }, [q.data]);
  const set = (k: string) => (v: any) => setF((p: any) => {
    const next = { ...p, [k]: v };
    if (k === "class_level" && !p.requirements_public && /^(ssc|hsc)/.test(v)) next.requirements_public = "পূর্ব অভিজ্ঞতা অগ্রাধিকার পাবে";
    return next;
  });
  const payload = (action?: string) => {
    const body: any = {};
    [...PUB, ...PRIV].forEach((k) => (body[k] = f[k]));
    body.salary_amount = f.salary_kind === "fixed" && f.salary_amount !== "" ? Number(f.salary_amount) : null;
    body.student_gender = f.student_gender || null;
    if (!body.guardian_phone) delete body.guardian_phone;
    if (action) body.action = action;
    return body;
  };
  const mut = useMutation({
    mutationFn: (action?: string): Promise<any> => (isNew ? adminApi.createTuition(payload()) : adminApi.updateTuition(code, payload(action))),
    onSuccess: (r: any, action) => {
      setConfirmClose(false);
      toast.success(action === "publish" ? "পাবলিশ হয়েছে" : action === "close" ? "বন্ধ করা হয়েছে" : "সেভ হয়েছে");
      qc.invalidateQueries();
      if (isNew) nav(`/admin/tuitions/${r.code}`, { replace: true });
    },
    onError: (e) => toast.error(e instanceof ApiError ? ERR[e.detail] || `সমস্যা: ${e.detail}` : "সেভ হয়নি"),
  });
  const areas = useMemo(() => {
    const all = optList("areas");
    if (!areaQ.trim()) return all.filter((a, i) => i < 12 || a.key === f?.area);
    const s = areaQ.toLowerCase();
    return all.filter((a) => [a.label, a.label_en, ...(a.alt || [])].some((x) => x.toLowerCase().includes(s)));
  }, [areaQ, f?.area]);

  if (!f || (!isNew && q.isPending)) return <Loading />;
  const tu: any = q.data?.tuition;
  const preview: any = { ...f, code: tu?.code || 0, code_label: tu?.code_label || "HTR-নতুন", status: tu?.status || "draft", posted_at: tu?.posted_at || null,
    salary_amount: f.salary_amount === "" ? null : Number(f.salary_amount), is_available: ["available", "processing"].includes(tu?.status), accepting_applications: !!tu?.accepting_applications, subjects: f.subjects || [] };
  const legacy = isLegacyClass(f.class_level);

  return (
    <div data-testid="tuition-editor">
      <PanelTitle title={isNew ? "নতুন টিউশন" : `${tu.code_label} এডিট`} testId="editor-title"
        actions={!isNew && <span className="flex items-center gap-2"><StatusPill kind="tuition" status={tu.status} testId="editor-status" /><span className="text-xs font-bold text-slate-600">{tu.is_public ? "পাবলিক" : "প্রাইভেট"} · {tu.accepting_applications ? "আবেদন চালু" : "আবেদন বন্ধ"}</span></span>} />
      {legacy && (
        <div className="mb-4 rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 flex gap-3" role="alert" data-testid="editor-legacy-warning">
          <AlertTriangle className="text-orange-700 shrink-0" aria-hidden />
          <p className="text-sm text-orange-900">এই টিউশনে পুরোনো রেঞ্জ ক্লাস আছে: <b>{optLabel("class_levels", f.class_level, lang)}</b>। নিচে নির্দিষ্ট ক্লাস/ব্যাচ বেছে নিয়ে সেভ করুন।</p>
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="space-y-5" testId="editor-public-panel">
            <p className="inline-flex items-center gap-2 font-bold text-forest"><Globe size={18} aria-hidden /> পাবলিক অংশ — সবাই দেখবে</p>
            <Field label="ক্লাস / ব্যাচ *"><ClassPicker compact testPrefix="editor-class" value={legacy ? "" : f.class_level} onChange={set("class_level")} /></Field>
            <Field label="বিষয়"><OptionChips group="subjects" multi value={f.subjects} onChange={set("subjects")} testPrefix="editor-subject" /></Field>
            <Field label="মাধ্যম"><OptionChips group="mediums" value={f.medium} onChange={(v: string) => set("medium")(v || "bangla")} testPrefix="editor-medium" /></Field>
            <Field label="এলাকা *">
              <input className={`${inputCls} mb-2`} value={areaQ} onChange={(e) => setAreaQ(e.target.value)} placeholder="এলাকা খুঁজুন…" data-testid="editor-area-search" />
              <div className="flex flex-wrap gap-2">{areas.map((a) => <Chip key={a.key} active={f.area === a.key} onClick={() => set("area")(a.key)} testId={`editor-area-${a.key}`}>{lang === "bn" ? a.label : a.label_en}</Chip>)}</div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="টিউটর"><OptionChips group="tutor_genders" value={f.tutor_gender_pref} onChange={(v: string) => set("tutor_gender_pref")(v || "any")} testPrefix="editor-tutor-gender" /></Field>
              <Field label="শিক্ষার্থী"><OptionChips group="student_genders" value={f.student_gender} onChange={set("student_gender")} testPrefix="editor-student-gender" /></Field>
              <Field label="মোড"><OptionChips group="modes" value={f.mode} onChange={(v: string) => set("mode")(v || "home")} testPrefix="editor-mode" /></Field>
              <Field label="সপ্তাহে দিন"><div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5, 6, 7].map((d) => <Chip key={d} active={f.days_per_week === d} onClick={() => set("days_per_week")(d)} testId={`editor-days-${d}`}>{d}</Chip>)}</div></Field>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="বেতনের ধরন" htmlFor="ed-sk">
                <select id="ed-sk" className={inputCls} value={f.salary_kind} onChange={(e) => set("salary_kind")(e.target.value)} data-testid="editor-salary-kind">
                  <option value="fixed">ফিক্সড</option><option value="negotiable">আলোচনা সাপেক্ষে</option><option value="unspecified">উল্লেখ নেই</option>
                </select>
              </Field>
              <Field label="পরিমাণ (৳)" htmlFor="ed-sa"><input id="ed-sa" inputMode="numeric" disabled={f.salary_kind !== "fixed"} className={inputCls} value={f.salary_amount} onChange={(e) => set("salary_amount")(e.target.value.replace(/\D/g, ""))} data-testid="editor-salary-amount" /></Field>
              <Field label="প্রতি" htmlFor="ed-sp">
                <select id="ed-sp" className={inputCls} value={f.salary_period} onChange={(e) => set("salary_period")(e.target.value)} data-testid="editor-salary-period"><option value="per_month">মাস</option><option value="per_course">কোর্স</option></select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">{options.salary_presets.map((s) => <Chip key={s} active={Number(f.salary_amount) === s} onClick={() => { set("salary_kind")("fixed"); set("salary_amount")(String(s)); }} testId={`editor-salary-preset-${s}`}>৳ {s}</Chip>)}</div>
            <Field label="অভিভাবকের চাওয়া (পাবলিক)" htmlFor="ed-req"><textarea id="ed-req" rows={3} maxLength={600} className={`${inputCls} py-3`} value={f.requirements_public} onChange={(e) => set("requirements_public")(e.target.value)} data-testid="editor-requirements" /></Field>
            <Field label="শুরু" htmlFor="ed-start"><input id="ed-start" className={inputCls} value={f.start_note} onChange={(e) => set("start_note")(e.target.value)} placeholder="যেমন: এই মাসের ১৫ তারিখ" data-testid="editor-start" /></Field>
          </Card>
          <Card tone="private" className="space-y-4" testId="editor-private-panel">
            <p className="inline-flex items-center gap-2 font-bold text-amber-900"><Lock size={18} aria-hidden /> অ্যাডমিন তথ্য — টিউশন বোর্ডে দেখানো হয় না</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="অভিভাবকের নাম" htmlFor="ed-gn"><input id="ed-gn" className={inputCls} value={f.guardian_name} onChange={(e) => set("guardian_name")(e.target.value)} data-testid="editor-guardian-name" /></Field>
              <Field label="অভিভাবকের মোবাইল" htmlFor="ed-gp"><input id="ed-gp" inputMode="tel" className={inputCls} value={f.guardian_phone} onChange={(e) => set("guardian_phone")(e.target.value)} data-testid="editor-guardian-phone" /></Field>
            </div>
            <Field label="পূর্ণ ঠিকানা" htmlFor="ed-addr"><input id="ed-addr" className={inputCls} value={f.exact_address} onChange={(e) => set("exact_address")(e.target.value)} data-testid="editor-address" /></Field>
            <Field label="শিক্ষার্থী (নিজের জন্য)" htmlFor="ed-sl"><input id="ed-sl" className={inputCls} value={f.student_label} onChange={(e) => set("student_label")(e.target.value)} data-testid="editor-student-label" /></Field>
            <Field label="প্রাইভেট নোট" htmlFor="ed-pn"><textarea id="ed-pn" rows={3} className={`${inputCls} py-3`} value={f.private_notes} onChange={(e) => set("private_notes")(e.target.value)} data-testid="editor-private-notes" /></Field>
          </Card>
        </div>
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">পাবলিক কার্ডের প্রিভিউ</p>
            <div className="pointer-events-none" data-testid="editor-preview">{f.class_level && f.area ? <TuitionCard t={preview} onShare={() => undefined} /> : <p className="text-sm text-slate-500">ক্লাস ও এলাকা দিলে প্রিভিউ দেখা যাবে।</p>}</div>
          </div>
          <Card className="space-y-2" testId="editor-actions">
            <Button className="w-full" variant="secondary" disabled={mut.isPending} onClick={() => mut.mutate(undefined)} data-testid="editor-save">{isNew ? "খসড়া সেভ করুন" : "সেভ করুন"}</Button>
            {!isNew && (
              <>
                {!tu.is_public || tu.status === "draft" ? (
                  <Button className="w-full" disabled={mut.isPending} onClick={() => mut.mutate("publish")} data-testid="editor-publish">সেভ ও পাবলিশ</Button>
                ) : (
                  <Button className="w-full" variant="ghost" disabled={mut.isPending} onClick={() => mut.mutate("unpublish")} data-testid="editor-unpublish">আনপাবলিশ</Button>
                )}
                {tu.is_public && <Button className="w-full" variant="ghost" onClick={() => mut.mutate(tu.accepting_applications ? "accepting_off" : "accepting_on")} data-testid="editor-accepting">{tu.accepting_applications ? "আবেদন বন্ধ করুন" : "আবেদন চালু করুন"}</Button>}
                {tu.status === "available" && <Button className="w-full" variant="ghost" onClick={() => mut.mutate("processing")} data-testid="editor-processing">প্রক্রিয়াধীন করুন</Button>}
                {["closed", "booked", "cancelled"].includes(tu.status) ? (
                  <Button className="w-full" variant="ghost" onClick={() => mut.mutate("reopen")} data-testid="editor-reopen">আবার খুলুন (খসড়া)</Button>
                ) : (
                  <Button className="w-full text-red-700 hover:bg-red-50" variant="ghost" onClick={() => setConfirmClose(true)} data-testid="editor-close">বন্ধ করুন</Button>
                )}
                <Link to={`/admin/posts?codes=${tu.code}`} className={linkButton("mango", "w-full")} data-testid="editor-post"><Megaphone size={18} aria-hidden /> পোস্ট তৈরি</Link>
              </>
            )}
          </Card>
          {!isNew && (
            <Card testId="editor-applications">
              <p className="font-bold text-forest">এই টিউশনের আবেদন ({q.data!.applications.length})</p>
              {q.data!.applications.length === 0 ? <p className="text-sm text-slate-500 mt-1">এখনো কেউ আবেদন করেননি।</p> : q.data!.applications.map((a) => <ApplicationRow key={a.id} a={a} />)}
            </Card>
          )}
        </aside>
      </div>
      <ConfirmAction open={confirmClose} onClose={() => setConfirmClose(false)} onConfirm={() => mut.mutate("close")} busy={mut.isPending} title="টিউশনটি বন্ধ করবেন?" description="এই টিউশনের চলমান আবেদনগুলোও বন্ধ হয়ে যাবে। নতুন আবেদন আর নেওয়া হবে না।" confirmLabel="হ্যাঁ, বন্ধ করুন" testId="close-tuition" />
    </div>
  );
}
