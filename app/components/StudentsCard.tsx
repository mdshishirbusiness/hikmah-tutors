// Students a tutor has taught (owner, 2026-11-05). The tutor adds them one by one: class, where they lived, from when
// to when, the result before and after, and what improved. No names. Shown as a timeline the owner reads when picking.
// The add panel sends its own request (a fetcher), so it never mixes with the Profile's Save bar.
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { ArrowRight, MapPin, Plus, Trash2, Users } from "lucide-react";
import { SectionCard } from "~/components/SectionCard";
import { AREAS, CLASS_CHOICES, SUBJECTS, labelOf } from "~/lib/options";
import { type Student, periodLabel } from "~/lib/profile";
import { classLabel } from "~/lib/request";

const box = "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none transition-colors focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
const lbl = "mb-1 block text-xs font-bold text-slate-600";
// Taps that add a phrase to "What improved", in the guardian's and tutor's own words.
const PHRASES = ["ফলাফল ভালো হয়েছে", "নিয়মিত পড়তে বসে", "দুর্বল বিষয়ে উন্নতি", "আত্মবিশ্বাস বেড়েছে", "পরীক্ষার ভয় কমেছে"];

/** The list, newest first. Read-only for the admin; with onRemove for the tutor. */
export function StudentTimeline({ students, onRemove }: { students: Student[]; onRemove?: (id: number) => void }) {
  const [confirm, setConfirm] = useState<number | null>(null);
  return (
    <ol className="relative ml-1.5 space-y-3 border-l-2 border-rose-100 pl-5">
      {students.map((s, i) => {
        const area = s.area ? (AREAS.some((a) => a.key === s.area) ? labelOf(AREAS, s.area) : s.area) : null;
        const subjects = (s.subjects ?? "").split(",").filter(Boolean).map((k) => labelOf(SUBJECTS, k));
        return (
          <li key={s.id} className="relative animate-rise" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
            <span aria-hidden className="absolute top-5 -left-[27px] size-3 rounded-full bg-rose-500 ring-4 ring-white" />
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-sm font-extrabold text-rose-800">{classLabel(s.class_level, s.class_other)}</span>
                    {area && <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700"><MapPin size={14} aria-hidden className="text-slate-400" />{area}</span>}
                  </p>
                  {s.started && <p className="mt-1 text-xs font-semibold text-slate-500 tabular-nums">{periodLabel(s.started, s.ended)}</p>}
                  {s.source === "sheet" && <p className="mt-1 text-xs font-semibold text-slate-400">From your sheet notes</p>}
                </div>
                {onRemove && (confirm === s.id ? (
                  <button type="button" onClick={() => onRemove(s.id)} className="shrink-0 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">Remove?</button>
                ) : (
                  <button type="button" onClick={() => setConfirm(s.id)} aria-label="Remove this student" className="-m-1 grid size-10 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-rose-700">
                    <Trash2 size={16} aria-hidden />
                  </button>
                ))}
              </div>
              {subjects.length > 0 && <p className="mt-2 flex flex-wrap gap-1">{subjects.map((x) => <span key={x} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{x}</span>)}</p>}
              {(s.result_before || s.result_after) && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-extrabold text-emerald-900 ring-1 ring-emerald-100">
                  <span className="text-xs font-bold tracking-wide text-emerald-700 uppercase">Result</span>
                  <span className="tabular-nums">{s.result_before || "?"}</span><ArrowRight size={14} aria-hidden /><span className="tabular-nums">{s.result_after || "?"}</span>
                </p>
              )}
              {s.improvement && <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-line text-slate-700">{s.improvement}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type Saved = { studentSaved?: boolean; studentError?: string | null };

export function StudentsCard({ students }: { students: Student[] }) {
  const fetcher = useFetcher<Saved>();
  const remover = useFetcher();
  const [open, setOpen] = useState(false);
  const [cls, setCls] = useState("");
  const [area, setArea] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [ongoing, setOngoing] = useState(true);
  const [improvement, setImprovement] = useState("");
  const [formKey, setFormKey] = useState(0);
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data?.studentSaved) return;
    setOpen(false);
    setCls(""); setArea(""); setSubjects([]); setOngoing(true); setImprovement(""); setFormKey((k) => k + 1);
  }, [fetcher.state, fetcher.data]);

  function save(e: React.MouseEvent<HTMLButtonElement>) {
    const panel = e.currentTarget.closest("[data-student-panel]")!;
    const fd = new FormData();
    fd.set("intent", "add_student");
    panel.querySelectorAll("[data-f]").forEach((node) => {
      const el = node as HTMLInputElement;
      if (el.type === "checkbox") { if (el.checked) fd.set(el.dataset.f!, "1"); }
      else fd.set(el.dataset.f!, el.value);
    });
    subjects.forEach((s) => fd.append("subjects", s));
    fetcher.submit(fd, { method: "post" });
  }

  const shown = students.filter((s) => !(remover.state !== "idle" && remover.formData?.get("id") === String(s.id)));
  const toggle = (k: string) => setSubjects((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  const addPhrase = (p: string) => setImprovement((t) => (t.includes(p) ? t : t ? `${t.replace(/[।.\s]*$/, "")}। ${p}` : p));

  return (
    <SectionCard id="students" icon={Users} tone="rose" title="Students you've taught" hint="নাম লিখবেন না। ক্লাস, এলাকা, কতদিন পড়িয়েছেন আর কী উন্নতি হয়েছে।"
      aside={shown.length > 0 ? <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-rose-800 shadow-sm ring-1 ring-rose-100 tabular-nums">{shown.length}</span> : undefined}>
      {/* Keeps this panel's typing away from the Profile form's "unsaved changes" bar. */}
      <div onChange={(e) => e.stopPropagation()} data-student-panel>
        {shown.length > 0 ? (
          <StudentTimeline students={shown} onRemove={(id) => remover.submit({ intent: "delete_student", id: String(id) }, { method: "post" })} />
        ) : !open && (
          <p className="rounded-2xl bg-rose-50/60 px-4 py-4 text-sm text-slate-700">যাদের পড়িয়েছেন, তাদের কথা একটা একটা করে যোগ করুন। বাস্তব অভিজ্ঞতা থাকলে HTR আপনাকে আগে বেছে নেয়।</p>
        )}

        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden">
            <div key={formKey} className="mt-4 space-y-4 rounded-2xl bg-rose-50/50 p-4 ring-1 ring-rose-100">
              <p className="text-sm font-extrabold text-forest">New student</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={lbl}>Class</span>
                  <select data-f="class_level" value={cls} onChange={(e) => setCls(e.target.value)} className={box}>
                    <option value="">Choose class</option>
                    {CLASS_CHOICES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className={lbl}>Area</span>
                  <select data-f="area" value={area} onChange={(e) => setArea(e.target.value)} className={box}>
                    <option value="">Choose area</option>
                    {[...AREAS].sort((a, b) => a.label.localeCompare(b.label)).map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                    <option value="__other">Other area…</option>
                  </select>
                </label>
              </div>
              {cls === "other" && <input data-f="class_other" maxLength={60} placeholder="Which class? e.g. Hifz" aria-label="Which class" className={box} />}
              {area === "__other" && <input data-f="area_other" maxLength={60} placeholder="Area name" aria-label="Area name" className={box} />}
              <div>
                <span className={lbl}>Subjects you taught</span>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.filter((s) => s.key !== "other").map((s) => (
                    <button key={s.key} type="button" aria-pressed={subjects.includes(s.key)} onClick={() => toggle(s.key)}
                      className={`min-h-10 rounded-full px-3.5 text-sm font-semibold ring-1 transition-colors ${subjects.includes(s.key) ? "bg-rose-600 text-white ring-rose-600" : "bg-white text-forest ring-slate-200 hover:ring-rose-300"}`}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className={lbl}>From</span><input data-f="started" type="month" className={box} /></label>
                <label className="block"><span className={lbl}>To</span><input data-f="ended" type="month" disabled={ongoing} className={`${box} disabled:bg-slate-100 disabled:text-slate-400`} /></label>
              </div>
              <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-slate-800">
                <input data-f="ongoing" type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} className="size-5 accent-rose-600" />Still teaching this student
              </label>
              <div>
                <span className={lbl}>Result <span className="font-normal text-slate-400">(optional, e.g. GPA, marks, grade)</span></span>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input data-f="result_before" maxLength={20} placeholder="Before, e.g. 3.50" aria-label="Result before" className={box} />
                  <ArrowRight size={18} aria-hidden className="text-rose-500" />
                  <input data-f="result_after" maxLength={20} placeholder="After, e.g. 4.80" aria-label="Result after" className={box} />
                </div>
              </div>
              <label className="block">
                <span className={lbl}>What improved</span>
                <textarea data-f="improvement" rows={3} maxLength={600} value={improvement} onChange={(e) => setImprovement(e.target.value)}
                  placeholder="যেমন: অংকে ভয় পেত, এখন নিজে নিজে সমাধান করে।" className={`${box} py-3`} />
              </label>
              <div className="-mt-2 flex flex-wrap gap-1.5">
                {PHRASES.map((p) => <button key={p} type="button" onClick={() => addPhrase(p)} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-100 hover:ring-rose-300">+ {p}</button>)}
              </div>
              {fetcher.data?.studentError && fetcher.state === "idle" && <p role="alert" className="text-sm font-semibold text-rose-700">{fetcher.data.studentError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={save} disabled={busy} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-forest text-sm font-extrabold text-cream disabled:opacity-60">{busy ? "Saving…" : "Save student"}</button>
                <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-12 items-center rounded-xl px-4 text-sm font-bold text-slate-600 hover:bg-white">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        {!open && (
          <button type="button" onClick={() => setOpen(true)}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rose-200 text-sm font-extrabold text-rose-800 transition-colors hover:border-rose-300 hover:bg-rose-50/60">
            <Plus size={18} aria-hidden />{shown.length ? "Add another student" : "Add a student"}
          </button>
        )}
      </div>
    </SectionCard>
  );
}
