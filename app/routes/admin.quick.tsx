// Quick Pad: write down a guardian's request during the call, mostly by tapping chips (owner, 2026-11-04, review step
// 3: the same fields as the guardian form and the tuition editor, so Post carries everything over). Saves straight to
// the server; with no internet the lead waits on the phone and goes as soon as the net is back.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ClipboardPaste, CloudOff } from "lucide-react";
import type { Route } from "./+types/admin.quick";
import { AreaPicker, ClassPicker, RequirementPicker, SubjectPicker, TimePicker, TutorPicker } from "~/components/RequestFields";
import { ChoiceChip } from "~/components/tutor";
import { requireAdmin } from "~/lib/auth.server";
import { type LeadErrors, leadFromForm, parseLead } from "~/lib/lead";
import { flushPending, saveLead, usePendingCount } from "~/lib/lead-queue";
import { DAYS_PER_WEEK, LEAD_SOURCES, MEDIUMS, SALARY_PRESETS, SESSION_MINUTES, STUDENT_GENDERS } from "~/lib/options";
import { sessionLength } from "~/lib/tuition";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Quick Pad · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return null;
}

const num = (n: number) => n.toLocaleString("en-IN");
const box = "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
type Toast = { tone: "ok" | "wait" | "error"; text: string } | null;

function Card({ id, title, required, error, children }: { id?: string; title: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-20 rounded-2xl bg-white p-4 shadow-ring ${error ? "ring-2 ring-rose-300" : ""}`}>
      <h2 className="mb-3 font-extrabold text-forest">{title}{required && <span className="text-rose-600"> *</span>}</h2>
      {children}
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
    </section>
  );
}
const Sub = ({ children }: { children: React.ReactNode }) => <p className="mt-4 mb-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase first:mt-0">{children}</p>;
const Chips = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap gap-2">{children}</div>;

export default function QuickPad() {
  const [formKey, setFormKey] = useState(0); // a new key gives a clean form after each save
  const [errors, setErrors] = useState<LeadErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const pending = usePendingCount();
  const phoneRef = useRef<HTMLInputElement>(null);

  // send waiting leads when the page opens, when the net comes back, and when the app is brought to the front
  useEffect(() => {
    flushPending();
    const flush = () => flushPending();
    const onVisible = () => document.visibilityState === "visible" && flushPending();
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tone === "error" ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && phoneRef.current) phoneRef.current.value = text.trim();
    } catch {
      setToast({ tone: "error", text: "Couldn't paste. Press and hold the box to paste." });
    }
  }

  function showErrors(errs: LeadErrors) {
    setErrors(errs);
    setToast({ tone: "error", text: errs.form ?? "Check the parts marked red" });
    const first = (["phone", "class_level", "area", "time", "salary"] as const).find((k) => errs[k]);
    if (first) document.getElementById(`f-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const input = leadFromForm(new FormData(e.currentTarget), { client_id: crypto.randomUUID(), created_at: Math.floor(Date.now() / 1000) });
    // the same checks as the server, so a lead that waits on the phone is always one the server will accept
    const parsed = parseLead(input);
    if (!parsed.lead) return showErrors(parsed.errors);
    setSaving(true);
    const result = await saveLead(parsed.lead);
    setSaving(false);
    if (result.kind === "invalid") return showErrors(result.errors);
    setErrors({});
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (result.kind === "ok") setToast({ tone: "ok", text: "Saved ✓" });
    else if (result.kind === "queued") setToast({ tone: "wait", text: "নেট নেই। ফোনে রাখা হলো, নেট এলে নিজে থেকে যাবে।" });
    else setToast({ tone: "wait", text: "ফোনে রাখা হলো। লগইন করলে সার্ভারে যাবে।" });
  }

  return (
    <div className="min-h-dvh bg-cream pb-32">
      <header className="sticky top-0 z-20 border-b border-brand-100/70 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-4">
          <Link to="/admin" aria-label="Back to admin" className="-ml-2 grid size-11 place-items-center rounded-xl text-forest hover:bg-brand-50"><ArrowLeft size={20} aria-hidden /></Link>
          <h1 className="text-lg font-extrabold tracking-tight text-forest">New lead</h1>
          {pending > 0 && (
            <button type="button" onClick={() => flushPending()} title="Try sending now" className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full bg-amber-100 px-3 text-sm font-bold text-amber-900">
              <CloudOff size={15} aria-hidden />{num(pending)} waiting
            </button>
          )}
          <Link to="/admin/leads" className={`${pending > 0 ? "" : "ml-auto"} inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-brand-700 hover:bg-brand-50`}>All leads</Link>
        </div>
      </header>

      <form key={formKey} onSubmit={submit} noValidate className="mx-auto max-w-xl space-y-3 px-4 pt-4">
        <Card id="f-phone" title="Guardian" required error={errors.phone}>
          <div className="flex gap-2">
            <input ref={phoneRef} name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="01XXXXXXXXX" aria-label="Phone number" aria-invalid={!!errors.phone}
              className={`${box} h-14 min-w-0 flex-1 text-xl tracking-wide`} />
            <button type="button" onClick={paste} className="inline-flex h-14 shrink-0 items-center gap-1.5 rounded-xl bg-forest px-4 text-sm font-bold text-cream"><ClipboardPaste size={17} aria-hidden />Paste</button>
          </div>
          <input name="guardian_name" placeholder="Name (optional), e.g. Mrs. Rahman" aria-label="Guardian's name" className={`${box} mt-2`} />
          <Sub>Came from</Sub>
          <Chips>{LEAD_SOURCES.map((s) => <ChoiceChip key={s.key} type="radio" name="lead_source" value={s.key} checked={s.key === "call"}>{s.label}</ChoiceChip>)}</Chips>
        </Card>

        <Card id="f-class_level" title="Student" required error={errors.class_level}>
          <ClassPicker />
          <Sub>Medium</Sub>
          <Chips>{MEDIUMS.map((m) => <ChoiceChip key={m.key} type="radio" name="medium" value={m.key}>{m.label}</ChoiceChip>)}</Chips>
          <Sub>Student</Sub>
          <Chips>{STUDENT_GENDERS.map((g) => <ChoiceChip key={g.key} type="radio" name="student_gender" value={g.key}>{g.label}</ChoiceChip>)}</Chips>
        </Card>

        <Card title="Subjects"><SubjectPicker /></Card>

        <Card id="f-area" title="Area" required error={errors.area}>
          <AreaPicker allowOther />
          <input name="address" placeholder="Full address or landmark (private)" aria-label="Full address" className={`${box} mt-3`} />
        </Card>

        <Card id="f-time" title="When" error={errors.time}>
          <Sub>Days per week</Sub>
          <Chips>{DAYS_PER_WEEK.map((d) => <ChoiceChip key={d} type="radio" name="days_per_week" value={String(d)}>{d} days</ChoiceChip>)}</Chips>
          <Sub>Time</Sub>
          <TimePicker />
          <Sub>Each session</Sub>
          <Chips>{SESSION_MINUTES.map((m) => <ChoiceChip key={m} type="radio" name="session_minutes" value={String(m)}>{sessionLength(m)}</ChoiceChip>)}</Chips>
        </Card>

        <Card id="f-salary" title="Salary per month" error={errors.salary}>
          <SalaryChips />
        </Card>

        <Card title="Tutor wanted">
          <TutorPicker genderName="tutor_gender" />
          <Sub>Guardian asks</Sub>
          <RequirementPicker />
          <textarea name="notes" rows={3} maxLength={500} placeholder="Anything else, e.g. মেয়েকে ইংরেজিতে বেশি সময় দিতে হবে" aria-label="Notes" className={`${box} mt-3 py-3`} />
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-100 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <button type="submit" disabled={saving} className="mx-auto flex h-14 w-full max-w-xl items-center justify-center rounded-xl bg-forest text-lg font-extrabold text-cream transition-colors hover:bg-brand-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save lead"}
          </button>
        </div>
      </form>

      {toast && (
        <div role="status" className={`fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md animate-rise rounded-xl px-4 py-3 text-center font-semibold shadow-lift ${
          toast.tone === "ok" ? "bg-brand-700 text-white" : toast.tone === "wait" ? "bg-amber-100 text-amber-900" : "bg-rose-700 text-white"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

/** Common salaries as chips; any other amount in the box (the box wins when both are set). */
function SalaryChips() {
  const [preset, setPreset] = useState("");
  const [typed, setTyped] = useState("");
  return (
    <>
      <div className="flex flex-wrap gap-2" onChange={(e) => { const t = e.target as HTMLInputElement; if (t.name === "salary_preset") { setPreset(t.value); setTyped(""); } }}>
        {SALARY_PRESETS.map((s) => <ChoiceChip key={s} type="radio" name="salary_preset" value={String(s)} checked={preset === String(s)} onChange={() => {}}>৳{num(s)}</ChoiceChip>)}
      </div>
      <input inputMode="numeric" placeholder="Other amount" value={typed} onChange={(e) => { setTyped(e.target.value); setPreset(""); }} aria-label="Other amount" className={`${box} mt-2`} />
      <input type="hidden" name="salary" value={typed || preset} />
    </>
  );
}
