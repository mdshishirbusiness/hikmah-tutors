// Quick Pad: write down a guardian's request during the call, mostly by tapping chips.
// Saves straight to the server; with no internet the lead waits on the phone and goes as soon as the net is back.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import type { Route } from "./+types/admin.quick";
import { requireAdmin } from "~/lib/auth.server";
import type { LeadErrors } from "~/lib/lead";
import { parseLead } from "~/lib/lead";
import { flushPending, saveLead, usePendingCount } from "~/lib/lead-queue";
import {
  AREAS,
  AREAS_TOP,
  CLASS_LEVELS,
  DAYS_PER_WEEK,
  LEAD_SOURCES,
  MEDIUMS,
  SALARY_PRESETS,
  STUDENT_GENDERS,
  SUBJECTS,
  TUTOR_GENDERS,
  type Option,
} from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Quick Pad · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function loader({ request }: Route.LoaderArgs) {
  requireAdmin(request);
  return null;
}

const bn = (n: number) => n.toLocaleString("bn-BD");
const OTHER_AREA = "__other";

type Form = {
  phone: string;
  guardian_name: string;
  class_level: string;
  medium: string;
  student_gender: string;
  tutor_gender: string;
  subjects: string[];
  area: string; // an area key, or OTHER_AREA
  areaOther: string;
  address: string;
  salary: string;
  days_per_week: string;
  notes: string;
  lead_source: string;
};

const EMPTY: Form = {
  phone: "",
  guardian_name: "",
  class_level: "",
  medium: "",
  student_gender: "",
  tutor_gender: "",
  subjects: [],
  area: "",
  areaOther: "",
  address: "",
  salary: "",
  days_per_week: "",
  notes: "",
  lead_source: "",
};

type Toast = { tone: "ok" | "wait" | "error"; text: string } | null;

export default function QuickPad() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const pending = usePendingCount();
  const topRef = useRef<HTMLDivElement>(null);

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

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const toggle = <K extends "class_level" | "medium" | "student_gender" | "tutor_gender" | "days_per_week" | "lead_source">(
    key: K,
    value: string,
  ) =>
    set(key, form[key] === value ? "" : value);

  const toggleSubject = (key: string) => {
    setForm((f) => {
      const has = f.subjects.includes(key);
      if (key === "all") return { ...f, subjects: has ? [] : ["all"] };
      const rest = f.subjects.filter((s) => s !== "all");
      return { ...f, subjects: has ? rest.filter((s) => s !== key) : [...rest, key] };
    });
  };

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) set("phone", text.trim());
    } catch {
      setToast({ tone: "error", text: "পেস্ট করা যায়নি। ঘরে চেপে ধরে পেস্ট করো।" });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const input = {
      client_id: crypto.randomUUID(),
      created_at: Math.floor(Date.now() / 1000),
      phone: form.phone,
      guardian_name: form.guardian_name,
      class_level: form.class_level,
      medium: form.medium,
      student_gender: form.student_gender,
      tutor_gender: form.tutor_gender,
      subjects: form.subjects,
      area: form.area === OTHER_AREA ? form.areaOther : form.area,
      address: form.address,
      salary: form.salary,
      days_per_week: form.days_per_week,
      notes: form.notes,
      lead_source: form.lead_source,
    };
    // same checks as the server, so a lead that waits on the phone is always one the server will accept
    const parsed = parseLead(input);
    if (!parsed.lead) return showErrors(parsed.errors);

    setSaving(true);
    const result = await saveLead(parsed.lead);
    setSaving(false);

    if (result.kind === "invalid") return showErrors(result.errors);
    setForm(EMPTY);
    setErrors({});
    topRef.current?.scrollIntoView({ behavior: "smooth" });
    if (result.kind === "ok") setToast({ tone: "ok", text: "সেভ হয়েছে ✓" });
    else if (result.kind === "queued") setToast({ tone: "wait", text: "নেট নেই। ফোনে রাখা হলো, নেট এলে নিজে থেকে যাবে।" });
    else setToast({ tone: "wait", text: "ফোনে রাখা হলো। লগইন করলে সার্ভারে যাবে।" });
  }

  function showErrors(errs: LeadErrors) {
    setErrors(errs);
    setToast({ tone: "error", text: errs.form ?? "লাল চিহ্নিত ঘরগুলো দেখো" });
    const first = (["phone", "class_level", "area", "salary"] as const).find((k) => errs[k]);
    if (first) document.getElementById(`f-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div ref={topRef} className="mx-auto min-h-dvh max-w-lg pb-32">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-xs font-semibold text-brand-600">Hikmah Tutors</p>
          <h1 className="text-lg leading-tight font-semibold text-slate-900">নতুন গার্ডিয়ান</h1>
        </div>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <button
              type="button"
              onClick={() => flushPending()}
              className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-800"
              title="এখনই পাঠানোর চেষ্টা করো"
            >
              ⏳ {bn(pending)}টি বাকি
            </button>
          )}
          <Link to="/admin/leads" className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            সব লিড →
          </Link>
        </div>
      </header>

      <form onSubmit={submit} noValidate className="space-y-6 px-4 pt-5">
        <Section id="f-phone" title="ফোন নম্বর" required error={errors.phone}>
          <div className="flex gap-2">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="01XXXXXXXXX"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              aria-invalid={!!errors.phone}
              className={`h-14 min-w-0 flex-1 rounded-xl border bg-white px-4 text-xl tracking-wide outline-none focus:ring-4 focus:ring-brand-100 ${
                errors.phone ? "border-red-400" : "border-slate-300 focus:border-brand-500"
              }`}
            />
            <button
              type="button"
              onClick={paste}
              className="h-14 shrink-0 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-brand-700 hover:bg-brand-50"
            >
              📋 পেস্ট
            </button>
          </div>
          <input
            type="text"
            placeholder="গার্ডিয়ানের নাম (ঐচ্ছিক)"
            value={form.guardian_name}
            onChange={(e) => set("guardian_name", e.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </Section>

        <Section id="f-class_level" title="শ্রেণি" required error={errors.class_level}>
          <Chips options={CLASS_LEVELS} isOn={(k) => form.class_level === k} onTap={(k) => toggle("class_level", k)} />
        </Section>

        <Section title="শিক্ষার্থী">
          <Chips options={STUDENT_GENDERS} isOn={(k) => form.student_gender === k} onTap={(k) => toggle("student_gender", k)} />
        </Section>

        <Section title="মাধ্যম">
          <Chips options={MEDIUMS} isOn={(k) => form.medium === k} onTap={(k) => toggle("medium", k)} />
        </Section>

        <Section title="বিষয়" hint="একাধিক বেছে নেওয়া যায়">
          <Chips options={SUBJECTS} isOn={(k) => form.subjects.includes(k)} onTap={toggleSubject} />
        </Section>

        <Section title="টিউটর">
          <Chips options={TUTOR_GENDERS} isOn={(k) => form.tutor_gender === k} onTap={(k) => toggle("tutor_gender", k)} />
        </Section>

        <Section id="f-area" title="এলাকা" required error={errors.area}>
          <AreaPicker value={form.area} onChange={(k) => set("area", k)} />
          {form.area === OTHER_AREA && (
            <input
              type="text"
              autoFocus
              placeholder="এলাকার নাম লেখো"
              value={form.areaOther}
              onChange={(e) => set("areaOther", e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          )}
          <input
            type="text"
            placeholder="পুরো ঠিকানা / চেনার জায়গা (ঐচ্ছিক)"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </Section>

        <Section title="সপ্তাহে কত দিন">
          <Chips
            options={DAYS_PER_WEEK.map((d) => ({ key: String(d), label: `${bn(d)} দিন` }))}
            isOn={(k) => form.days_per_week === k}
            onTap={(k) => toggle("days_per_week", k)}
          />
        </Section>

        <Section id="f-salary" title="বেতন (মাসে)" error={errors.salary}>
          <Chips
            options={SALARY_PRESETS.map((s) => ({ key: String(s), label: `৳${bn(s)}` }))}
            isOn={(k) => form.salary === k}
            onTap={(k) => set("salary", form.salary === k ? "" : k)}
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="অন্য পরিমাণ লেখো"
            value={SALARY_PRESETS.some((s) => String(s) === form.salary) ? "" : form.salary}
            onChange={(e) => set("salary", e.target.value)}
            aria-invalid={!!errors.salary}
            className={`mt-2 h-12 w-full rounded-xl border bg-white px-4 outline-none focus:ring-4 focus:ring-brand-100 ${
              errors.salary ? "border-red-400" : "border-slate-300 focus:border-brand-500"
            }`}
          />
        </Section>

        <Section title="নোট">
          <textarea
            rows={3}
            placeholder="যেমন: বিকেলে পড়াবে, RU/RUET-এর টিউটর চায়"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </Section>

        <Section title="কোথা থেকে এসেছে">
          <Chips options={LEAD_SOURCES} isOn={(k) => form.lead_source === k} onTap={(k) => toggle("lead_source", k)} />
        </Section>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto max-w-lg">
            <button
              type="submit"
              disabled={saving}
              className="h-14 w-full rounded-xl bg-brand-600 text-lg font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "সেভ হচ্ছে…" : "সেভ করো"}
            </button>
          </div>
        </div>
      </form>

      {toast && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-24 z-20 mx-auto max-w-md rounded-xl px-4 py-3 text-center font-semibold shadow-lg ${
            toast.tone === "ok"
              ? "bg-brand-700 text-white"
              : toast.tone === "wait"
                ? "bg-amber-100 text-amber-900"
                : "bg-red-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

/** The most-requested areas as chips, the rest by search (Bangla or English spelling). */
function AreaPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const q = query.trim().toLowerCase();

  let shown: Option[];
  if (q) shown = AREAS.filter((a) => a.label.includes(q) || (a.alt ?? "").toLowerCase().includes(q));
  else if (showAll) shown = AREAS;
  else {
    shown = AREAS.slice(0, AREAS_TOP);
    const picked = AREAS.find((a) => a.key === value);
    if (picked && !shown.includes(picked)) shown = [picked, ...shown]; // keep the chosen one visible
  }

  return (
    <>
      <input
        type="search"
        placeholder="এলাকা খোঁজো (বাংলা বা English)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
      />
      <Chips
        options={[...shown, { key: OTHER_AREA, label: "অন্য এলাকা…" }]}
        isOn={(k) => value === k}
        onTap={(k) => onChange(value === k ? "" : k)}
      />
      {q && shown.length === 0 && <p className="mt-2 text-sm text-slate-500">পাওয়া যায়নি। "অন্য এলাকা…" চেপে নাম লেখো।</p>}
      {!q && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-sm font-semibold text-brand-700 underline underline-offset-4"
        >
          {showAll ? "কম দেখাও" : `সব এলাকা দেখাও (${bn(AREAS.length)}টি)`}
        </button>
      )}
    </>
  );
}

function Section({
  id,
  title,
  hint,
  required,
  error,
  children,
}: {
  id?: string;
  title: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="font-semibold text-slate-900">
          {title}
          {required && <span className="text-red-500"> *</span>}
        </h2>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-sm font-semibold text-red-600">{error}</p>}
    </section>
  );
}

function Chips({ options, isOn, onTap }: { options: Option[]; isOn: (key: string) => boolean; onTap: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = isOn(o.key);
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onTap(o.key)}
            className={`min-h-11 rounded-xl border px-4 py-2 font-semibold transition ${
              on
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-brand-500 hover:bg-brand-50"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
