import type { ReactNode } from "react";

export function Chip({ active, onClick, children, testId, className = "" }: { active?: boolean; onClick?: () => void; children: ReactNode; testId?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      data-testid={testId}
      className={`min-h-[44px] shrink-0 inline-flex items-center gap-1.5 px-4 rounded-full text-sm font-semibold border transition-[background-color,color,border-color,transform] active:scale-[0.98] duration-150 ${
        active ? "bg-brand-600 border-brand-600 text-white" : "bg-white border-brand-100 text-forest hover:border-brand-500"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function AreaChip({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <span data-testid={testId} className="inline-flex items-center px-3 py-1 rounded-full bg-brand-100 text-forest font-bold text-sm">
      {children}
    </span>
  );
}

export function Badge({ kind, children, testId }: { kind: "new" | "processing" | "closed" | "info"; children: ReactNode; testId?: string }) {
  const s = { new: "bg-mango text-forest", processing: "bg-amber-100 text-amber-800", closed: "bg-slate-100 text-slate-700", info: "bg-blue-100 text-blue-700" }[kind];
  return (
    <span data-testid={testId} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${s}`}>
      {children}
    </span>
  );
}
