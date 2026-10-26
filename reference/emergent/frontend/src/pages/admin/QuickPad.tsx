import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { ApiError, adminApi } from "../../api/client";
import { useI18n } from "../../i18n";
import { optList, options } from "../../lib/options";
import { normalizePhone } from "../../lib/phone";
import { fmtTaka } from "../../lib/format";
import { ClassPicker } from "../../components/ClassPicker";
import { Chip } from "../../components/Chip";
import { Card, Field, OptionChips, PanelTitle, inputCls } from "../../components/panel/ui";
import { Button } from "../../components/Button";

const QKEY = "htr_quickpad_queue";
const readQ = (): any[] => { try { return JSON.parse(localStorage.getItem(QKEY) || "[]"); } catch { return []; } };
const writeQ = (q: any[]) => localStorage.setItem(QKEY, JSON.stringify(q));

const blank = () => ({ phone: "", class_level: "", area: "", areaOther: "", guardian_name: "", medium: "", student_gender: "", tutor_gender: "any",
  subjects: [] as string[], address: "", salary: "", days_per_week: 0, lead_source: "call", notes: "" });

export default function QuickPad() {
  const { lang, n } = useI18n();
  const [f, setF] = useState(blank);
  const [areaQ, setAreaQ] = useState("");
  const [pending, setPending] = useState(readQ().length);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string) => (v: any) => setF((p) => ({ ...p, [k]: v }));

  const flush = useCallback(async () => {
    const q = readQ();
    const left: any[] = [];
    for (const item of q) {
      try { await adminApi.quickLead(item); } catch (e) { if (!(e instanceof ApiError)) left.push(item); }
    }
    writeQ(left);
    setPending(left.length);
  }, []);

  useEffect(() => {
    flush();
    window.addEventListener("online", flush);
    const id = window.setInterval(flush, 30000);
    return () => { window.removeEventListener("online", flush); window.clearInterval(id); };
  }, [flush]);

  const areas = useMemo(() => {
    const all = optList("areas");
    if (!areaQ.trim()) return all.slice(0, 12);
    const q = areaQ.toLowerCase();
    return all.filter((a) => [a.label, a.label_en, ...(a.alt || [])].some((s) => s.toLowerCase().includes(q)));
  }, [areaQ]);

  const submit = async () => {
    const phone = normalizePhone(f.phone);
    const area = f.area === "__other" ? f.areaOther.trim() : f.area;
    if (!phone || !f.class_level || !area) { setErr("ফোন, ক্লাস ও এলাকা দিন।"); return; }
    setErr("");
    const body = { client_id: crypto.randomUUID(), typed_at: new Date().toISOString(), phone, class_level: f.class_level, area,
      guardian_name: f.guardian_name || null, medium: f.medium || null, student_gender: f.student_gender || null, tutor_gender: f.tutor_gender,
      subjects: f.subjects, address: f.address || null, salary: f.salary ? Number(f.salary) : null, days_per_week: f.days_per_week || null,
      lead_source: f.lead_source, notes: f.notes };
    try {
      await adminApi.quickLead(body);
    } catch (e) {
      if (e instanceof ApiError) { setErr(e.detail === "invalid_phone" ? "সঠিক মোবাইল নম্বর দিন।" : "সেভ করা যায়নি।"); return; }
      writeQ([...readQ(), body]);
      setPending(readQ().length);
    }
    setSaved(true);
    toast.success("সেভ হয়েছে");
    window.scrollTo({ top: 0 });
    setF(blank());
    setAreaQ("");
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div data-testid="quick-pad">
      <PanelTitle title="Quick Pad" sub="ফোনে কথা বলার সময় এক হাতে লিড লিখুন। শুধু ফোন, ক্লাস ও এলাকা বাধ্যতামূলক। নেট না থাকলেও সেভ হবে।"
        actions={pending > 0 ? <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-900 px-3 py-1.5 text-sm font-bold" data-testid="quickpad-pending"><CloudOff size={16} aria-hidden /> অপেক্ষায় ({n(pending)}টি)</span> : undefined} />
      {saved && <div className="mb-4 rounded-2xl bg-brand-600 text-white p-5 text-center text-2xl font-bold animate-rise flex items-center justify-center gap-2" role="status" data-testid="quickpad-saved"><CheckCircle2 aria-hidden /> সেভ হয়েছে</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-5">
          <Field label="ফোন নম্বর *" htmlFor="qp-phone"><input id="qp-phone" inputMode="numeric" className={`${inputCls} text-xl font-bold tracking-wider`} value={f.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="017XXXXXXXX" data-testid="quickpad-phone" /></Field>
          <Field label="ক্লাস / ব্যাচ *"><ClassPicker compact testPrefix="quickpad-class" value={f.class_level} onChange={set("class_level")} /></Field>
          <Field label="এলাকা *">
            <input className={`${inputCls} mb-2`} value={areaQ} onChange={(e) => setAreaQ(e.target.value)} placeholder="এলাকা খুঁজুন…" data-testid="quickpad-area-search" />
            <div className="flex flex-wrap gap-2">
              {areas.map((a) => <Chip key={a.key} active={f.area === a.key} onClick={() => set("area")(f.area === a.key ? "" : a.key)} testId={`quickpad-area-${a.key}`}>{lang === "bn" ? a.label : a.label_en}</Chip>)}
              <Chip active={f.area === "__other"} onClick={() => set("area")("__other")} testId="quickpad-area-other">অন্য এলাকা</Chip>
            </div>
            {f.area === "__other" && <input className={`${inputCls} mt-2`} value={f.areaOther} onChange={(e) => set("areaOther")(e.target.value)} placeholder="এলাকার নাম" data-testid="quickpad-area-other-input" />}
          </Field>
          <Field label="ঠিকানা / ল্যান্ডমার্ক" htmlFor="qp-addr"><input id="qp-addr" className={inputCls} value={f.address} onChange={(e) => set("address")(e.target.value)} data-testid="quickpad-address" /></Field>
        </Card>
        <Card className="space-y-5">
          <Field label="বিষয়"><OptionChips group="subjects" multi value={f.subjects} onChange={set("subjects")} testPrefix="quickpad-subject" /></Field>
          <Field label="মাধ্যম"><OptionChips group="mediums" value={f.medium} onChange={set("medium")} testPrefix="quickpad-medium" /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="শিক্ষার্থী"><OptionChips group="student_genders" value={f.student_gender} onChange={set("student_gender")} testPrefix="quickpad-student" /></Field>
            <Field label="টিউটর"><OptionChips group="tutor_genders" value={f.tutor_gender} onChange={(v: string) => set("tutor_gender")(v || "any")} testPrefix="quickpad-tutor" /></Field>
          </div>
          <Field label="বেতন">
            <div className="flex flex-wrap gap-2">
              {options.salary_presets.map((s) => <Chip key={s} active={Number(f.salary) === s} onClick={() => set("salary")(Number(f.salary) === s ? "" : String(s))} testId={`quickpad-salary-${s}`}>৳ {fmtTaka(s, lang)}</Chip>)}
            </div>
            <input inputMode="numeric" className={`${inputCls} mt-2`} value={f.salary} onChange={(e) => set("salary")(e.target.value.replace(/\D/g, ""))} placeholder="অন্য পরিমাণ" data-testid="quickpad-salary-custom" />
          </Field>
          <Field label="সপ্তাহে দিন">
            <div className="flex flex-wrap gap-2">{options.days_per_week.map((d) => <Chip key={d} active={f.days_per_week === d} onClick={() => set("days_per_week")(f.days_per_week === d ? 0 : d)} testId={`quickpad-days-${d}`}>{n(d)} দিন</Chip>)}</div>
          </Field>
          <Field label="সোর্স"><OptionChips group="lead_sources" value={f.lead_source} onChange={(v: string) => set("lead_source")(v || "call")} testPrefix="quickpad-source" /></Field>
          <Field label="অভিভাবকের নাম" htmlFor="qp-name"><input id="qp-name" className={inputCls} value={f.guardian_name} onChange={(e) => set("guardian_name")(e.target.value)} data-testid="quickpad-guardian-name" /></Field>
          <Field label="নোট" htmlFor="qp-notes"><textarea id="qp-notes" rows={2} maxLength={500} className={`${inputCls} py-3`} value={f.notes} onChange={(e) => set("notes")(e.target.value)} data-testid="quickpad-notes" /></Field>
        </Card>
      </div>
      {err && <p className="mt-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold" role="alert" data-testid="quickpad-error">{err}</p>}
      <div className="sticky bottom-4 mt-6 z-20"><Button variant="primary" className="w-full text-lg min-h-[56px] shadow-lg" onClick={submit} data-testid="quickpad-save">লিড সেভ করুন</Button></div>
    </div>
  );
}
