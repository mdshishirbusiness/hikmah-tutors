// Shared pieces of the signed-in tutor's pages: the bottom bar, a bottom sheet and choice chips.
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ClipboardCheck, House, LayoutList, type LucideIcon, UserRound } from "lucide-react";
import { SectionCard, type SectionTone } from "~/components/SectionCard";

// Home · Tuitions · Applied · Profile (owner, 2026-11-04).
const TABS = [
  { key: "home", to: "/me", label: "Home", icon: House },
  { key: "tuitions", to: "/", label: "Tuitions", icon: LayoutList },
  { key: "applied", to: "/applied", label: "Applied", icon: ClipboardCheck },
  { key: "profile", to: "/me/profile", label: "Profile", icon: UserRound },
] as const;

/**
 * `count` is the applications waiting on the tutor (a selected tuition), shown as a badge on Applied; `dot` is Home's
 * red dot (something needs action or an update is unread).
 */
export function TutorBar({ active, count = 0, dot = false }: { active: (typeof TABS)[number]["key"]; count?: number; dot?: boolean }) {
  return (
    <nav aria-label="Tutor" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-brand-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link key={t.key} to={t.to} viewTransition prefetch="intent" aria-current={on ? "page" : undefined} className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${on ? "text-forest" : "text-slate-500"}`}>
            <span className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors ${on ? "bg-brand-100" : ""}`}>
              <t.icon size={20} aria-hidden />
              {t.key === "home" && dot && !on && <span aria-label="New" className="absolute top-0 right-2.5 size-2.5 rounded-full bg-rose-600 ring-2 ring-white" />}
              {t.key === "applied" && count > 0 && (
                <span className="absolute -top-1 right-1 grid min-w-4.5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] leading-4.5 text-white">{count}</span>
              )}
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** A sheet that rises from the bottom; Escape or a tap outside closes it. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 z-50 animate-fade bg-forest/40" />
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] max-w-lg animate-sheet overflow-y-auto rounded-t-3xl bg-white px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card outline-none">
        <span aria-hidden className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-slate-200" />
        <h2 className="text-xl font-bold text-forest">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </>
  );
}

/** A tap-chip that is really a checkbox or radio, so the form works without JavaScript. */
export function ChoiceChip({ type = "checkbox", name, value, checked, onChange, hidden, children }: {
  type?: "checkbox" | "radio"; name: string; value: string; checked?: boolean; onChange?: (on: boolean) => void; hidden?: boolean; children: React.ReactNode;
}) {
  return (
    <label className={`${hidden ? "hidden" : "inline-flex"} min-h-11 cursor-pointer items-center rounded-full border border-brand-100 bg-white px-4 text-sm font-semibold text-forest transition-colors duration-150 select-none hover:border-brand-500 has-checked:border-forest has-checked:bg-forest has-checked:text-cream has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-600`}>
      <input type={type} name={name} value={value} defaultChecked={onChange ? undefined : checked} checked={onChange ? checked : undefined}
        onChange={onChange && ((e) => onChange(e.currentTarget.checked))} className="sr-only" />
      {children}
    </label>
  );
}

/** A numbered form section, in the shared section look. */
export function Step({ n, title, hint, icon, tone, children }: { n: number; title: string; hint?: string; icon: LucideIcon; tone?: SectionTone; children: React.ReactNode }) {
  return <SectionCard step={n} icon={icon} tone={tone} title={title} hint={hint}>{children}</SectionCard>;
}
