// One look for every form section (owner, 2026-11-05: headings were all black and hard to tell apart). A thin
// coloured line on top, a soft tinted icon tile, the title in forest and a grey hint. Colours vary by section, gently;
// no emoji and no heavy effects.
import type { LucideIcon } from "lucide-react";

export const SECTION_TONES = {
  brand: { tile: "bg-brand-50 text-brand-700", line: "bg-brand-500" },
  amber: { tile: "bg-amber-50 text-amber-800", line: "bg-mango" },
  sky: { tile: "bg-sky-50 text-sky-800", line: "bg-sky-400" },
  violet: { tile: "bg-violet-50 text-violet-800", line: "bg-violet-400" },
  slate: { tile: "bg-slate-100 text-slate-700", line: "bg-slate-300" },
} as const;
export type SectionTone = keyof typeof SECTION_TONES;

/** The heading row alone: for a section whose box is drawn by its parent (a fieldset, a card). */
export function SectionHead({ icon: Icon, tone = "brand", title, hint, step, required }: {
  icon: LucideIcon; tone?: SectionTone; title: React.ReactNode; hint?: React.ReactNode; step?: number; required?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-xl ${SECTION_TONES[tone].tile}`}><Icon size={19} strokeWidth={2.2} /></span>
      <div className="min-w-0 pt-0.5">
        {step !== undefined && <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">Step {step}</p>}
        <h2 className="text-[17px] leading-tight font-extrabold tracking-tight text-forest">
          {title}{required && <span className="text-rose-600"> *</span>}
        </h2>
        {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export function SectionCard({ icon, tone = "brand", title, hint, step, required, id, error, className = "", children }: {
  icon: LucideIcon; tone?: SectionTone; title: React.ReactNode; hint?: React.ReactNode; step?: number; required?: boolean;
  id?: string; error?: boolean; className?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-24 overflow-hidden rounded-2xl bg-white shadow-ring target:ring-2 target:ring-brand-500 ${error ? "ring-2 ring-rose-300" : ""} ${className}`}>
      <div aria-hidden className={`h-1 ${SECTION_TONES[tone].line}`} />
      <div className="p-4 sm:p-5">
        <SectionHead icon={icon} tone={tone} title={title} hint={hint} step={step} required={required} />
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}
