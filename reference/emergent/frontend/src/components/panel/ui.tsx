import { useRef, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "../ui/alert-dialog";
import { Button } from "../Button";
import { useI18n } from "../../i18n";
import { optLabel, optList } from "../../lib/options";
import { Chip } from "../Chip";

export const inputCls = "w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition-colors";

export function PanelTitle({ title, sub, actions, testId }: { title: string; sub?: string; actions?: ReactNode; testId?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7" data-testid={testId}>
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-forest leading-snug tracking-tight">{title}</h1>
        {sub && <p className="mt-2 text-sm leading-relaxed text-slate-500 max-w-xl">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", testId, tone = "white" }: { children: ReactNode; className?: string; testId?: string; tone?: "white" | "private" }) {
  const bg = tone === "private" ? "bg-amber-50/70 border-amber-200" : "bg-white border-brand-100";
  return <section className={`min-w-0 rounded-2xl border ${bg} p-5 sm:p-6 shadow-card ${className}`} data-testid={testId}>{children}</section>;
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block font-semibold text-forest mb-1 text-sm">{label} {hint && <span className="font-normal text-slate-500">— {hint}</span>}</label>
      {children}
    </div>
  );
}

export function Loading() {
  return <div className="py-16 flex justify-center text-brand-600" data-testid="panel-loading"><Loader2 className="animate-spin" size={28} aria-label="লোড হচ্ছে" /></div>;
}

export function Empty({ text, testId }: { text: string; testId?: string }) {
  return <p className="rounded-2xl border border-dashed border-brand-200 bg-white p-8 text-center text-slate-600" data-testid={testId || "panel-empty"}>{text}</p>;
}

const APP_TONE: Record<string, string> = {
  submitted: "bg-slate-100 text-slate-800", under_review: "bg-amber-100 text-amber-900", shortlisted: "bg-sky-100 text-sky-900",
  trial_arranged: "bg-teal-100 text-teal-900", confirmed: "bg-brand-600 text-white", not_selected: "bg-slate-200 text-slate-700",
  withdrawn: "bg-slate-100 text-slate-600", opportunity_closed: "bg-slate-100 text-slate-600",
};
const TUITION_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800", available: "bg-emerald-100 text-emerald-900", processing: "bg-amber-100 text-amber-900",
  follow_up: "bg-orange-100 text-orange-900", booked: "bg-brand-600 text-white", cancelled: "bg-red-100 text-red-800", closed: "bg-slate-200 text-slate-700",
};
const LEAD_STATUS: Record<string, [string, string]> = {
  new: ["নতুন", "bg-mango text-forest"], contacted: ["যোগাযোগ হয়েছে", "bg-sky-100 text-sky-900"],
  converted: ["টিউশন বানানো হয়েছে", "bg-emerald-100 text-emerald-900"], discarded: ["বাতিল", "bg-slate-200 text-slate-700"],
};

export function StatusPill({ kind, status, testId }: { kind: "application" | "tuition" | "lead"; status: string; testId?: string }) {
  const { lang } = useI18n();
  let label = status;
  let tone = "bg-slate-100 text-slate-800";
  if (kind === "lead") [label, tone] = LEAD_STATUS[status] || [status, tone];
  else {
    label = optLabel(kind === "application" ? "application_statuses" : "tuition_statuses", status, lang);
    tone = (kind === "application" ? APP_TONE : TUITION_TONE)[status] || tone;
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${tone}`} data-testid={testId}>{label}</span>;
}

export function OptionChips({ group, value, onChange, multi, testPrefix, limit }: {
  group: string; value: string | string[]; onChange: (v: any) => void; multi?: boolean; testPrefix: string; limit?: number;
}) {
  const { lang } = useI18n();
  const list = optList(group).slice(0, limit);
  const on = (k: string) => (multi ? (value as string[]).includes(k) : value === k);
  const click = (k: string) => {
    if (multi) {
      const v = value as string[];
      onChange(v.includes(k) ? v.filter((x) => x !== k) : [...v, k]);
    } else onChange(value === k ? "" : k);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((o) => <Chip key={o.key} active={on(o.key)} onClick={() => click(o.key)} testId={`${testPrefix}-${o.key}`}>{lang === "bn" ? o.label : o.label_en}</Chip>)}
    </div>
  );
}

export function LegacyFlag({ testId }: { testId?: string }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-300" data-testid={testId}>রেঞ্জ — নির্দিষ্ট ক্লাস দিন</span>;
}


export function ConfirmAction({ open, onClose, onConfirm, title, description, confirmLabel, busy = false, testId }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; confirmLabel: string; busy?: boolean; testId: string }) {
  const { t } = useI18n();
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <AlertDialog open={open} onOpenChange={(value: boolean) => { if (!value && !busy) onClose(); }}>
      <AlertDialogContent onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }} onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus(); }} className="w-[calc(100%-2rem)] max-w-md rounded-2xl border-brand-100 bg-cream p-6 sm:rounded-2xl" data-testid={`${testId}-dialog`}>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><AlertTriangle size={22} aria-hidden /></span>
        <AlertDialogTitle className="text-lg font-bold text-forest" data-testid={`${testId}-title`}>{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-sm leading-relaxed text-slate-600" data-testid={`${testId}-description`}>{description}</AlertDialogDescription>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild><Button variant="secondary" disabled={busy} data-testid={`${testId}-cancel`}>{t("confirm.cancel")}</Button></AlertDialogCancel>
          <Button onClick={onConfirm} disabled={busy} className="bg-rose-700 hover:bg-rose-800" data-testid={`${testId}-confirm`}>{busy ? t("confirm.working") : confirmLabel}</Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
