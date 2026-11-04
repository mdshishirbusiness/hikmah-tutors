// One look for every form section (owner, 2026-11-05: sections must be told apart by colour, not only by bold
// black text). Each section has a tinted header band in its colour, with a white icon tile, an eyebrow, the title
// and a hint, over a white body framed in the same tint. Soft colours, no emoji, no heavy effects.
import type { LucideIcon } from "lucide-react";

// Full class names per tone, so Tailwind keeps them.
export const SECTION_TONES = {
  brand: { band: "bg-brand-50 border-brand-100", frame: "ring-brand-100", tile: "text-brand-700 ring-brand-200", eyebrow: "text-brand-700", dot: "bg-brand-500", soft: "bg-brand-50", text: "text-brand-700", strong: "ring-brand-500" },
  amber: { band: "bg-amber-50 border-amber-100", frame: "ring-amber-100", tile: "text-amber-700 ring-amber-200", eyebrow: "text-amber-800", dot: "bg-amber-500", soft: "bg-amber-50", text: "text-amber-800", strong: "ring-amber-500" },
  sky: { band: "bg-sky-50 border-sky-100", frame: "ring-sky-100", tile: "text-sky-700 ring-sky-200", eyebrow: "text-sky-800", dot: "bg-sky-500", soft: "bg-sky-50", text: "text-sky-800", strong: "ring-sky-500" },
  violet: { band: "bg-violet-50 border-violet-100", frame: "ring-violet-100", tile: "text-violet-700 ring-violet-200", eyebrow: "text-violet-800", dot: "bg-violet-500", soft: "bg-violet-50", text: "text-violet-800", strong: "ring-violet-500" },
  rose: { band: "bg-rose-50 border-rose-100", frame: "ring-rose-100", tile: "text-rose-700 ring-rose-200", eyebrow: "text-rose-800", dot: "bg-rose-500", soft: "bg-rose-50", text: "text-rose-800", strong: "ring-rose-500" },
  slate: { band: "bg-slate-50 border-slate-200", frame: "ring-slate-200", tile: "text-slate-700 ring-slate-300", eyebrow: "text-slate-600", dot: "bg-slate-400", soft: "bg-slate-50", text: "text-slate-700", strong: "ring-slate-400" },
} as const;
export type SectionTone = keyof typeof SECTION_TONES;

type Head = { icon: LucideIcon; tone?: SectionTone; title: React.ReactNode; hint?: React.ReactNode; step?: number; required?: boolean; aside?: React.ReactNode };

/** The tinted header band alone, for a section whose frame is drawn by its parent (a fieldset). */
export function SectionHead({ icon: Icon, tone = "brand", title, hint, step, required, aside }: Head) {
  const t = SECTION_TONES[tone];
  return (
    <div className={`flex items-start gap-3 border-b px-4 py-3.5 sm:px-5 ${t.band}`}>
      <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ${t.tile}`}><Icon size={19} strokeWidth={2.1} /></span>
      <div className="min-w-0 flex-1">
        {step !== undefined && <p className={`text-[11px] font-bold tracking-[0.14em] uppercase ${t.eyebrow}`}>Step {step}</p>}
        <h2 className="text-[17px] leading-tight font-extrabold tracking-tight text-forest">
          {title}{required && <span className="text-rose-600"> *</span>}
        </h2>
        {hint && <p className="mt-0.5 text-sm text-slate-600">{hint}</p>}
      </div>
      {aside}
    </div>
  );
}

export function SectionCard({ icon, tone = "brand", title, hint, step, required, aside, id, error, className = "", children }: Head & {
  id?: string; error?: boolean; className?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-32 overflow-hidden rounded-2xl bg-white shadow-card ring-1 transition-shadow target:ring-2 target:ring-brand-500 ${error ? "ring-2 ring-rose-300" : SECTION_TONES[tone].frame} ${className}`}>
      <SectionHead icon={icon} tone={tone} title={title} hint={hint} step={step} required={required} aside={aside} />
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
